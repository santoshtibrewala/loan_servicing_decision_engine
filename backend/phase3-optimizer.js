import { defaultConfig, sum, toCurrency } from './engine-utils.js';

function scoreScenario(
  margins,
  governmentProtection,
  scenario,
  activeConfig = defaultConfig,
) {
  const weights = activeConfig.scoringWeights;
  const feasibilityScore = Math.min(
    Math.max((margins.firstYearMargin + 0.2) / 1.2, 0),
    1,
  );
  const marginAttainmentScore = Math.min(
    Math.max(margins.firstYearMargin / 0.1, 0),
    1,
  );
  const governmentProtectionScore = Math.min(
    Math.max(governmentProtection.coverageRatio / 1.1, 0),
    1,
  );
  const concessionBurden =
    scenario.writedownAmount / 60000 +
    scenario.conservationSupportAmount / 30000 +
    scenario.conservationCancellationAmount / 30000 +
    scenario.rateReductionPercent / 0.04 +
    scenario.termExtensionYears / 10 +
    scenario.deferralYears / 3 +
    (scenario.consolidateLoans ? 0.15 : 0) +
    (scenario.buyoutAtCmv ? 0.35 : 0) +
    (scenario.payInFull ? 0.2 : 0);
  const concessionMinimizationScore = Math.min(
    Math.max(1 - concessionBurden / 3, 0),
    1,
  );
  const simplicityScore = Math.min(
    Math.max(
      1 -
        [
          scenario.termExtensionYears > 0,
          scenario.rateReductionPercent > 0,
          scenario.deferralYears > 0,
          scenario.conservationSupportAmount > 0,
          scenario.writedownAmount > 0,
          scenario.conservationCancellationAmount > 0,
          scenario.consolidateLoans,
          scenario.buyoutAtCmv,
          scenario.payInFull,
        ].filter(Boolean).length /
          9,
      0,
    ),
    1,
  );

  const total =
    feasibilityScore * weights.feasibility +
    governmentProtectionScore * weights.governmentProtection +
    concessionMinimizationScore * weights.concessionMinimization +
    marginAttainmentScore * weights.marginAttainment +
    simplicityScore * weights.simplicity;

  return {
    total: toCurrency(total),
    components: {
      feasibilityScore: toCurrency(feasibilityScore),
      governmentProtectionScore: toCurrency(governmentProtectionScore),
      concessionMinimizationScore: toCurrency(concessionMinimizationScore),
      marginAttainmentScore: toCurrency(marginAttainmentScore),
      simplicityScore: toCurrency(simplicityScore),
    },
  };
}

function buildScenarioExplanation(
  scenario,
  margins,
  governmentProtection,
  validity,
  phase1Result,
  policyContext,
) {
  const phrases = [];
  if (scenario.termExtensionYears > 0) {
    const pathNames = [
      ...new Set(
        phase1Result.scenarioLoans.map((loan) =>
          loan.servicingPath === "reamortization"
            ? "reamortization"
            : "rescheduling",
        ),
      ),
    ];
    phrases.push(
      `${pathNames.join(" and ")} applied for ${scenario.termExtensionYears} years`,
    );
  }
  if (scenario.rateReductionPercent > 0) {
    phrases.push(
      `rate reduced by ${Math.round(scenario.rateReductionPercent * 100)} points`,
    );
  }
  if (scenario.deferralYears > 0) {
    phrases.push(`deferral applied for ${scenario.deferralYears} years`);
  }
  if (scenario.conservationSupportAmount > 0) {
    phrases.push(
      `support amount of $${toCurrency(scenario.conservationSupportAmount).toLocaleString()}`,
    );
  }
  if (scenario.conservationCancellationAmount > 0) {
    phrases.push(
      `conservation cancellation of $${toCurrency(scenario.conservationCancellationAmount).toLocaleString()}`,
    );
  }
  if (scenario.writedownAmount > 0) {
    phrases.push(
      `writedown of $${toCurrency(scenario.writedownAmount).toLocaleString()}`,
    );
  }
  if (scenario.liquidateLoan) {
    phrases.push('liquidation path proposed');
  }
  if (scenario.buyoutAtCmv) {
    phrases.push(
      `cmv buyout proposed at $${toCurrency(
        governmentProtection.cmvBuyoutValue,
      ).toLocaleString()}`,
    );
  }
  if (scenario.consolidateLoans) {
    phrases.push('loans consolidated');
  }
  if (scenario.payInFull) {
    phrases.push('pay-in-full combination applied');
  }
  phrases.push(
    `first-year margin ${toCurrency(margins.firstYearMargin * 100)}%`,
    `debt margin reserve ${toCurrency(scenario.marginTarget * 100)}%`,
    `coverage ratio ${governmentProtection.coverageRatio}`,
  );
  if (policyContext.eligibility.nonEssentialAssetsNeedReview) {
    phrases.push("non-essential asset review considered");
  }

  return `${validity}. ${phrases.join(', ')}.`;
}

function validateScenario(
  input,
  scenario,
  margins,
  governmentProtection,
  policyContext,
  phase1Result,
) {
  const reasons = [...policyContext.eligibility.gateReasons];
  if (margins.firstYearAvailable < margins.firstYearPaymentTotal) {
    reasons.push(
      `first-year payment ${toCurrency(margins.firstYearPaymentTotal)} exceeds usable cash ${toCurrency(margins.firstYearAvailable)} after ${scenario.marginTarget * 100}% debt margin reserve`,
    );
  }
  if (
    scenario.rateReductionPercent > 0 &&
    Object.values(phase1Result.constraints.rateReductionEligibleByLoan).some(
      (eligible) => !eligible,
    )
  ) {
    reasons.push(
      "Limited resource eligibility is required before interest rate reduction can be used on all selected loans.",
    );
  }
  if (scenario.deferralYears > 0 && !phase1Result.constraints.deferralAllowed) {
    reasons.push(...phase1Result.constraints.deferralViolations);
  }
  if (
    scenario.consolidateLoans &&
    !phase1Result.constraints.consolidationAllowed
  ) {
    reasons.push(...phase1Result.constraints.consolidationViolations);
  }
  if (
    scenario.writedownAmount > 0 &&
    policyContext.eligibility.nonEssentialAssetsCanCureDelinquency
  ) {
    reasons.push(
      "Writedown should not be considered before non-essential assets are applied to delinquency.",
    );
  }
  if (scenario.buyoutAtCmv) {
    const availableBuyoutFunds =
      toCurrency(input.case.buyoutFundsAvailable ?? 0) +
      toCurrency(input.case.nonEssentialAssetLiquidationValue ?? 0);
    if (
      policyContext.servicingRules.requireBuyoutFundsForCmv !== false &&
      availableBuyoutFunds < governmentProtection.cmvBuyoutValue
    ) {
      reasons.push(
        `buyout funds ${toCurrency(availableBuyoutFunds)} are below CMV buyout value ${toCurrency(
          governmentProtection.cmvBuyoutValue,
        )}`,
      );
    }
  }
  if (
    governmentProtection.writedownVsNrvRequired &&
    !governmentProtection.passesCoverageFloor
  ) {
    reasons.push(
      `coverage ratio ${governmentProtection.coverageRatio} below floor`,
    );
  }
  const totalDebt = sum(
    input.existingLoans.map((loan) => loan.principal + loan.accruedInterest),
  );
  const operatingLimit =
    policyContext.loanLimits.operating ?? policyContext.loanLimits.default;
  if (totalDebt > operatingLimit + policyContext.loanLimits.farm_ownership) {
    reasons.push('combined exposure exceeds configured loan limits');
  }
  return reasons;
}

function buildScenarioId(scenario, margins) {
  return `SCN-${Math.abs(
    JSON.stringify({
      ...scenario,
      first: margins.firstYearMargin,
    })
      .split('')
      .reduce(
        (hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0,
        0,
      ),
  )}`;
}

function runPhase3Optimizer(
  input,
  policyContext,
  scenario,
  phase1Result,
  phase2Result,
  activeConfig = defaultConfig,
) {
  const rejectionReasons = validateScenario(
    input,
    scenario,
    phase1Result.margins,
    phase2Result,
    policyContext,
    phase1Result,
  );
  const scoring = scoreScenario(
    phase1Result.margins,
    phase2Result,
    scenario,
    activeConfig,
  );
  const actionsByLoan = phase1Result.scenarioLoans.reduce(
    (accumulator, loan) => {
      accumulator[loan.loanId] = loan.servicingActions;
      return accumulator;
    },
    {},
  );

  const totalConcessions =
    scenario.writedownAmount +
    scenario.conservationSupportAmount +
    scenario.conservationCancellationAmount +
    (scenario.buyoutAtCmv ? 10000 : 0) +
    (scenario.liquidateLoan ? 5000 : 0);

  return {
    phase: 'phase3-optimizer',
    id: buildScenarioId(scenario, phase1Result.margins),
    scenario,
    score: scoring.total,
    scoreComponents: scoring.components,
    status: rejectionReasons.length === 0 ? 'valid' : 'rejected',
    outcomeCode:
      rejectionReasons.length === 0
        ? scenario.liquidateLoan
          ? 'LIQUIDATION'
          : scenario.buyoutAtCmv
            ? 'BUYOUT'
          : 'FEASIBLE'
        : 'REJECTED',
    actionsByLoan,
    firstYearMetrics: {
      totalDebtRepayment: phase1Result.margins.firstYearPaymentTotal,
      cashAvailable: phase1Result.margins.firstYearAvailable,
      cashFlowMargin: phase1Result.margins.firstYearMargin,
    },
    governmentProtectionMetrics: phase2Result,
    paymentScheduleByLoan: phase1Result.scenarioLoans,
    totalConcessions: toCurrency(totalConcessions),
    rationale:
      rejectionReasons.length === 0
        ? 'Scenario meets configured cash-flow and government-protection thresholds.'
        : 'Scenario does not satisfy at least one cash-flow or protection threshold.',
    explanation: buildScenarioExplanation(
      scenario,
      phase1Result.margins,
      phase2Result,
      rejectionReasons.length === 0
        ? 'Scenario is feasible'
        : 'Scenario is rejected',
      phase1Result,
      policyContext,
    ),
    rejectionReason: rejectionReasons.join('; '),
    phaseOutputs: {
      feasibility: phase1Result.feasibility,
      constraints: phase1Result.constraints,
      eligibility: policyContext.eligibility,
      governmentProtection: {
        writedownVsNrvRequired: phase2Result.writedownVsNrvRequired,
        pvVsNrvTest: phase2Result.pvVsNrvTest,
        writedownOrdering: phase2Result.writedownOrdering,
      },
      optimizer: {
        policyTieBreakTag: scenario.policyTieBreakTag,
        consolidateLoans: scenario.consolidateLoans,
        buyoutAtCmv: scenario.buyoutAtCmv,
        liquidateLoan: scenario.liquidateLoan,
        payInFull: scenario.payInFull,
        conservationCancellationAmount: scenario.conservationCancellationAmount,
      },
    },
  };
}

function rankScenarios(evaluated) {
  const valid = evaluated
    .filter((scenario) => scenario.status === 'valid')
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.totalConcessions !== right.totalConcessions) {
        return left.totalConcessions - right.totalConcessions;
      }
      const leftActions = Object.values(left.actionsByLoan).flat().length;
      const rightActions = Object.values(right.actionsByLoan).flat().length;
      return leftActions - rightActions;
    })
    .map((scenario, index) => ({
      ...scenario,
      rank: index + 1,
      status:
        index === 0 ? 'valid and recommendable' : 'valid but lower ranked',
      outcomeCode: index === 0 ? 'RECOMMENDED' : 'ALTERNATIVE',
    }));
  const rejected = evaluated
    .filter((scenario) => scenario.status === 'rejected')
    .sort((left, right) => right.score - left.score)
    .map((scenario, index) => ({
      ...scenario,
      rank: valid.length + index + 1,
      status: 'rejected',
      outcomeCode: 'REJECTED',
    }));

  return [...valid, ...rejected];
}

export { rankScenarios, runPhase3Optimizer };
