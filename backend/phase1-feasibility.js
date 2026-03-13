import {
  buildMarginTargets,
  clamp,
  computeAnnuityPayment,
  defaultConfig,
  getAdjustedBalance,
  getLoanRate,
  sum,
  toCurrency,
} from "./engine-utils.js";

function isRealEstateLoan(loan, policyContext) {
  return (
    policyContext.servicingRules.reamortizationEligibleLoanTypes?.includes(
      loan.loanType,
    ) || loan.securityType === "real_estate"
  );
}

function getServicingPath(loan, policyContext) {
  return isRealEstateLoan(loan, policyContext)
    ? "reamortization"
    : "rescheduling";
}

function buildLienRankMap(input) {
  return (input.liens?.propertyLoanLinks ?? []).reduce((accumulator, link) => {
    const existing = accumulator[link.loanId] ?? [];
    existing.push(Number(link.lienRank ?? 1));
    accumulator[link.loanId] = existing;
    return accumulator;
  }, {});
}

function evaluateScenarioConstraints(input, policyContext, scenario) {
  const rules = policyContext.servicingRules ?? {};
  const rateReductionEligibleByLoan = input.existingLoans.reduce(
    (accumulator, loan) => {
      accumulator[loan.loanId] =
        rules.requireLimitedResourceEligibilityForRateReduction === false ||
        loan.limitedResourceEligible === true ||
        loan.limitedResource === true;
      return accumulator;
    },
    {},
  );
  const lienRankMap = buildLienRankMap(input);
  const consolidationViolations = [];
  if (scenario.consolidateLoans) {
    if (input.existingLoans.length < 2) {
      consolidationViolations.push(
        "Consolidation requires at least two eligible loans.",
      );
    }
    if (rules.disallowConsolidationWhenReferredToCounsel && input.case.referredToCounsel) {
      consolidationViolations.push(
        "Consolidation is blocked when the case has been referred to counsel.",
      );
    }
    if (
      rules.disallowConsolidationWhenDeferred &&
      Number(input.case.deferralYearsRequested ?? 0) > 0
    ) {
      consolidationViolations.push(
        "Consolidation is blocked while the case is already in deferral.",
      );
    }
    for (const loan of input.existingLoans) {
      if (!loan.consolidationAllowed) {
        consolidationViolations.push(
          `${loan.loanId} is not eligible for consolidation.`,
        );
      }
      if (
        (rules.consolidationSecurityTypeExclusions ?? []).includes(
          loan.securityType,
        )
      ) {
        consolidationViolations.push(
          `${loan.loanId} uses excluded security for consolidation.`,
        );
      }
    }
    if (rules.requireSameLienPositionForConsolidation) {
      const normalized = Object.values(lienRankMap)
        .filter((ranks) => ranks.length > 0)
        .map((ranks) => Math.min(...ranks));
      if (
        normalized.length > 1 &&
        new Set(normalized.map((value) => String(value))).size > 1
      ) {
        consolidationViolations.push(
          "Consolidation requires the same lien position across included loans.",
        );
      }
    }
  }

  const deferralViolations = [];
  if (scenario.deferralYears > 0) {
    if (
      rules.requireTemporaryHardshipForDeferral &&
      input.case.temporaryHardship !== true
    ) {
      deferralViolations.push(
        "Deferral requires temporary hardship to be documented.",
      );
    }
    if (scenario.deferralYears > (rules.maxDeferralYears ?? 5)) {
      deferralViolations.push(
        `Deferral cannot exceed ${rules.maxDeferralYears ?? 5} years.`,
      );
    }
  }

  return {
    rateReductionEligibleByLoan,
    consolidationAllowed: consolidationViolations.length === 0,
    consolidationViolations,
    deferralAllowed: deferralViolations.length === 0,
    deferralViolations,
  };
}

function buildWritedownAllocations(loans, totalWritedown) {
  const eligible = loans.filter((loan) => !loan.paidInFull && loan.servicingAction !== "N");
  const totalPrincipal = sum(eligible.map((loan) => loan.principal + loan.accruedInterest));
  if (totalPrincipal === 0 || totalWritedown === 0) {
    return {};
  }
  return eligible.reduce((allocations, loan) => {
    const share = (loan.principal + loan.accruedInterest) / totalPrincipal;
    allocations[loan.loanId] = totalWritedown * share;
    return allocations;
  }, {});
}

function formatRateChange(actualRateChange) {
  const percentPoints = (actualRateChange * 100).toFixed(2).replace(/\.?0+$/, "");
  return `rate -${percentPoints}%`;
}

function calculateLoanResults(input, policyContext, scenario) {
  const constraints = evaluateScenarioConstraints(input, policyContext, scenario);
  const writedownByLoan = buildWritedownAllocations(input.existingLoans, scenario.writedownAmount);
  const consolidationRateAdjustment = scenario.consolidateLoans ? 0.0025 : 0;
  const consolidationTermBoost = scenario.consolidateLoans ? 2 : 0;

  return input.existingLoans.map((loan) => {
    const servicingBlocked = loan.paidInFull || loan.servicingAction === "N";
    const basePrincipal = loan.principal + loan.accruedInterest;
    const writedown = writedownByLoan[loan.loanId] ?? 0;
    const principalAfterWritedown = Math.max(basePrincipal - writedown, 0);
    const referenceRate = getLoanRate(policyContext, loan);
    const rateReductionAllowed =
      scenario.rateReductionPercent === 0 ||
      constraints.rateReductionEligibleByLoan[loan.loanId];
    const targetRate = clamp(
      Math.min(loan.existingRate, referenceRate.regularRate) -
        (rateReductionAllowed ? scenario.rateReductionPercent : 0) -
        consolidationRateAdjustment,
      referenceRate.floorRate,
      loan.existingRate
    );
    const maxTerm = Math.min(
      loan.maxTermYears ?? policyContext.maxTerms[loan.loanType] ?? policyContext.maxTerms.default,
      policyContext.maxTerms[loan.loanType] ?? policyContext.maxTerms.default
    );
    const newTerm = clamp(
      (loan.remainingTermYears ?? 1) + scenario.termExtensionYears + consolidationTermBoost,
      1,
      maxTerm
    );
    const annualPayment = computeAnnuityPayment(principalAfterWritedown, targetRate, newTerm);
    const firstYearPayment = scenario.liquidateLoan
      ? 0
      : scenario.deferralYears > 0
        ? annualPayment * 0.2
        : annualPayment;
    const appliedRate = servicingBlocked ? loan.existingRate : targetRate;
    const appliedTerm = servicingBlocked ? loan.remainingTermYears ?? 1 : newTerm;
    const appliedRecommendedPayment = servicingBlocked ? loan.firstYearPayment : annualPayment;
    const appliedFirstYearPayment = servicingBlocked ? loan.firstYearPayment : firstYearPayment;
    const appliedWritedown = servicingBlocked ? 0 : writedown;
    const actualTermChange = Math.max(appliedTerm - (loan.remainingTermYears ?? 1), 0);
    const actualRateChange = Math.max((loan.existingRate ?? 0) - appliedRate, 0);
    const servicingPath = getServicingPath(loan, policyContext);

    return {
      loanId: loan.loanId,
      loanType: loan.loanType,
      servicingPath,
      originalPrincipal: toCurrency(basePrincipal),
      principalAfterWritedown: toCurrency(servicingBlocked ? basePrincipal : principalAfterWritedown),
      writedown: toCurrency(appliedWritedown),
      rate: appliedRate,
      termYears: appliedTerm,
      deferralYears: scenario.deferralYears,
      recommendedPayment: toCurrency(appliedRecommendedPayment),
      firstYearPayment: toCurrency(appliedFirstYearPayment),
      servicingActions: [
        servicingBlocked ? "maintain current terms" : null,
        !servicingBlocked && actualTermChange > 0
          ? `${servicingPath === "reamortization" ? "reamortize" : "reschedule"} ${actualTermChange} years`
          : null,
        !servicingBlocked && actualRateChange > 0 ? formatRateChange(actualRateChange) : null,
        !servicingBlocked && scenario.deferralYears > 0 ? `defer ${scenario.deferralYears} years` : null,
        appliedWritedown > 0 ? `writedown ${toCurrency(appliedWritedown)}` : null,
        !servicingBlocked && scenario.consolidateLoans ? "consolidate" : null,
        !servicingBlocked && scenario.liquidateLoan ? "liquidate" : null,
        !servicingBlocked && scenario.payInFull ? "pay in full" : null,
      ].filter(Boolean),
    };
  });
}

function calculateMargins(input, scenarioLoans, scenario) {
  const baselineFirstYear = getAdjustedBalance(input.cashFlow.firstYear);
  const support = scenario.conservationSupportAmount;
  const firstYearPaymentTotal = sum(scenarioLoans.map((loan) => loan.recommendedPayment));
  const reservedFirstYearCash = baselineFirstYear * scenario.marginTarget;

  const firstYearAvailable = baselineFirstYear - reservedFirstYearCash + support;
  const firstYearMargin = firstYearPaymentTotal === 0 ? 1 : (firstYearAvailable - firstYearPaymentTotal) / firstYearPaymentTotal;

  return {
    firstYearAvailable: toCurrency(firstYearAvailable),
    reservedFirstYearCash: toCurrency(reservedFirstYearCash),
    firstYearPaymentTotal: toCurrency(firstYearPaymentTotal),
    firstYearMargin: toCurrency(firstYearMargin),
  };
}

function runPhase1Feasibility(input, policyContext, scenario) {
  const constraints = evaluateScenarioConstraints(input, policyContext, scenario);
  const scenarioLoans = calculateLoanResults(input, policyContext, scenario);
  const margins = calculateMargins(input, scenarioLoans, scenario);

  return {
    phase: "phase1-feasibility",
    feasibility: {
      restructureFeasible: margins.firstYearAvailable >= margins.firstYearPaymentTotal,
      deferFeasible:
        scenario.deferralYears === 0
          ? null
          : constraints.deferralAllowed &&
            margins.firstYearAvailable >= margins.firstYearPaymentTotal,
      liquidationFeasible: scenario.liquidateLoan ? true : null,
    },
    constraints,
    scenarioLoans,
    margins,
  };
}

function buildScenarioCombosForStage(activeConfig = defaultConfig, input = null, stage = "base") {
  const combos = [];
  const controls = activeConfig.scenarioControls;
  const startMargin = input?.case?.debtMarginPercent ?? activeConfig.scenarioControls.marginStartPercent;
  const marginTargets = buildMarginTargets(activeConfig, startMargin);
  const writedownAmounts = stage === "base" ? [0] : controls.writedownAmounts;
  const liquidationOptions = stage === "base" ? [false] : controls.liquidationOptions;
  const consolidationOptions =
    (input?.existingLoans?.length ?? 0) > 1 ? controls.consolidationOptions : [false];

  for (const marginTarget of marginTargets) {
    for (const termExtensionYears of controls.termExtensionYears) {
      for (const rateReductionPercent of controls.rateReductionPercent) {
        for (const deferralYears of controls.deferralYears) {
          for (const conservationSupportAmount of controls.conservationSupportAmounts) {
            for (const consolidateLoans of consolidationOptions) {
              for (const writedownAmount of writedownAmounts) {
                for (const liquidateLoan of liquidationOptions) {
                  combos.push({
                    marginTarget,
                    termExtensionYears,
                    rateReductionPercent,
                    deferralYears,
                    conservationSupportAmount,
                    writedownAmount,
                    conservationCancellationAmount: 0,
                    consolidateLoans,
                    liquidateLoan,
                    payInFull: false,
                    policyTieBreakTag: stage === "base" ? "restructure-first" : "writedown-or-liquidation",
                  });
                  if (combos.length >= controls.maxScenarioCount) {
                    return combos;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return combos;
}

function generateScenarioCombos(activeConfig = defaultConfig, input = null) {
  return [
    ...buildScenarioCombosForStage(activeConfig, input, "base"),
    ...buildScenarioCombosForStage(activeConfig, input, "fallback"),
  ].slice(0, activeConfig.scenarioControls.maxScenarioCount);
}

export { buildScenarioCombosForStage, generateScenarioCombos, runPhase1Feasibility };
