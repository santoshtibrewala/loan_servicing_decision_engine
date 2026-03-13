import {
  config as defaultConfig,
  getLatestEffectiveValue,
  resolveCountyRecoveryDefaults,
  resolveRateTable,
  sampleCase,
} from "./config.js";

function clone(value) {
  return structuredClone(value);
}

function toCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function differenceInDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function computeAnnuityPayment(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) {
    return 0;
  }
  if (annualRate === 0) {
    return principal / years;
  }
  const factor = annualRate / (1 - (1 + annualRate) ** -years);
  return principal * factor;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function normalizePayload(input = {}) {
  const merged = clone(sampleCase);
  for (const key of Object.keys(input)) {
    if (Array.isArray(input[key])) {
      merged[key] = clone(input[key]);
    } else if (input[key] && typeof input[key] === "object") {
      merged[key] = { ...merged[key], ...clone(input[key]) };
    } else if (input[key] !== undefined) {
      merged[key] = input[key];
    }
  }
  merged.case = { ...sampleCase.case, ...(input.case ?? {}) };
  merged.cashFlow = {
    firstYear: { ...sampleCase.cashFlow.firstYear, ...(input.cashFlow?.firstYear ?? {}) },
  };
  merged.existingLoans = (input.existingLoans ?? sampleCase.existingLoans).map((loan, index) => ({
    ...sampleCase.existingLoans[index % sampleCase.existingLoans.length],
    ...loan,
  }));
  merged.collateral = (input.collateral ?? sampleCase.collateral).map((item, index) => ({
    ...sampleCase.collateral[index % sampleCase.collateral.length],
    ...item,
  }));
  merged.liens = {
    propertyLoanLinks: input.liens?.propertyLoanLinks ?? sampleCase.liens.propertyLoanLinks,
    priorLiens: input.liens?.priorLiens ?? sampleCase.liens.priorLiens,
  };
  return merged;
}

function evaluateEligibilityContext(input, activeConfig = defaultConfig) {
  const rules = activeConfig.policy.servicingRules ?? {};
  const caseData = input.case ?? {};
  const timingDays = differenceInDays(
    caseData.noticeOfDelinquencyDate,
    caseData.completedApplicationDate,
  );
  const totalDelinquent = sum(
    input.existingLoans.map((loan) => Number(loan.delinquentAmountDue ?? 0)),
  );
  const distressSatisfied =
    Number(caseData.daysPastDue ?? 0) >= (rules.delinquencyDaysThreshold ?? 90) ||
    caseData.financiallyDistressed === true;
  const timelyApplicationSatisfied =
    caseData.applicationComplete !== false &&
    (timingDays === null || timingDays <= (rules.applicationWindowDays ?? 60));
  const nonEssentialAssetsNeedReview =
    caseData.nonEssentialAssetsAvailable === true &&
    Number(caseData.nonEssentialAssetLiquidationValue ?? 0) > 0;
  const nonEssentialAssetsCanCureDelinquency =
    nonEssentialAssetsNeedReview &&
    Number(caseData.nonEssentialAssetLiquidationValue ?? 0) >= totalDelinquent;

  const checks = {
    goodFaithSatisfied:
      rules.requireGoodFaith === false || caseData.goodFaith === true,
    applicationCompleteSatisfied:
      rules.requireApplicationComplete === false ||
      caseData.applicationComplete !== false,
    timelyApplicationSatisfied,
    distressSatisfied:
      rules.requireDistressOrDelinquency === false || distressSatisfied,
    distressCauseSatisfied:
      rules.requireBeyondControlDistressCause === false ||
      Boolean(caseData.distressCause),
    cropInsuranceSatisfied:
      rules.blockForCropInsuranceViolation === false ||
      caseData.cropInsuranceViolation !== true,
    nonMonetaryDefaultSatisfied:
      rules.requireNonMonetaryDefaultResolution === false ||
      caseData.nonMonetaryDefault !== true,
  };

  const gateReasons = [];
  const warnings = [];
  if (!checks.goodFaithSatisfied) {
    gateReasons.push("Borrower did not satisfy the good-faith requirement.");
  }
  if (!checks.applicationCompleteSatisfied) {
    gateReasons.push("Primary servicing application is not complete.");
  }
  if (!checks.timelyApplicationSatisfied) {
    gateReasons.push(
      `Completed application was submitted outside the ${rules.applicationWindowDays ?? 60}-day servicing window.`,
    );
  }
  if (!checks.distressSatisfied) {
    gateReasons.push(
      `Borrower is not ${rules.delinquencyDaysThreshold ?? 90}+ days past due and did not indicate financial distress.`,
    );
  }
  if (!checks.distressCauseSatisfied) {
    gateReasons.push("Distress cause was not identified.");
  }
  if (!checks.cropInsuranceSatisfied) {
    gateReasons.push("Crop insurance compliance issue blocks servicing eligibility.");
  }
  if (!checks.nonMonetaryDefaultSatisfied) {
    gateReasons.push("Non-monetary default must be resolved before servicing.");
  }
  if (nonEssentialAssetsCanCureDelinquency) {
    warnings.push(
      "Non-essential asset liquidation appears sufficient to cure delinquency before writedown relief.",
    );
  }

  return {
    checks,
    totalDelinquent: toCurrency(totalDelinquent),
    applicationWindowDays: timingDays,
    nonEssentialAssetsNeedReview,
    nonEssentialAssetsCanCureDelinquency,
    overallEligible: gateReasons.length === 0,
    gateReasons,
    warnings,
  };
}

function resolvePolicyContext(input, activeConfig = defaultConfig) {
  const proposedDate = input.case.proposedServicingDate;
  const state = input.case.state;
  const county = input.case.county;
  const discountRate = getLatestEffectiveValue(activeConfig.policy.discountRate, proposedDate).rate;
  const rateTable = resolveRateTable(activeConfig.policy, state, proposedDate);
  const countyDefaults = resolveCountyRecoveryDefaults(activeConfig.policy, state, county, proposedDate);

  return {
    discountRate,
    rateTable,
    countyDefaults,
    collateralRecoveryAssumptions: activeConfig.policy.collateralRecoveryAssumptions,
    maxTerms: activeConfig.policy.maxTerms,
    loanLimits: activeConfig.policy.loanLimits,
    servicingRules: activeConfig.policy.servicingRules ?? {},
    eligibility: evaluateEligibilityContext(input, activeConfig),
  };
}

function getLoanRate(policyContext, loan) {
  const versions = policyContext.rateTable[loan.loanType] ?? policyContext.rateTable.default ?? [];
  if (versions.length === 0) {
    return { regularRate: loan.existingRate, floorRate: 0.01 };
  }
  return getLatestEffectiveValue(versions, loan.accrualDate ?? sampleCase.case.proposedServicingDate);
}

function getAdjustedBalance(period) {
  return period.balanceAvailable - period.nonAgencyDebtAndTaxes;
}

function buildMarginTargets(
  activeConfig = defaultConfig,
  startingPercent = activeConfig.scenarioControls.marginStartPercent,
) {
  const targets = [];
  for (
    let current = startingPercent;
    current >= activeConfig.scenarioControls.marginEndPercent;
    current -= activeConfig.scenarioControls.marginStepPercent
  ) {
    targets.push(current / 100);
  }
  return targets;
}

export {
  buildMarginTargets,
  clamp,
  clone,
  computeAnnuityPayment,
  defaultConfig,
  differenceInDays,
  evaluateEligibilityContext,
  getAdjustedBalance,
  getLoanRate,
  normalizePayload,
  resolvePolicyContext,
  sum,
  toCurrency,
};
