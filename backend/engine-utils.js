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
  getAdjustedBalance,
  getLoanRate,
  normalizePayload,
  resolvePolicyContext,
  sum,
  toCurrency,
};
