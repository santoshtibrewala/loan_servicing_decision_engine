import { defaultConfig, sum, toCurrency } from "./engine-utils.js";

function resolveRecoveryBucket(collateralItem) {
  if (collateralItem.propertyType === "CHL") {
    return "chattel";
  }
  if (collateralItem.propertyType === "NER" || collateralItem.propertyType === "NFR") {
    return "real_estate";
  }
  return "mixed";
}

function buildHmlPriorityMap(input) {
  return input.existingLoans.reduce((accumulator, loan) => {
    const securityType = loan.securityType ?? "mixed";
    accumulator[loan.loanId] =
      securityType === "real_estate" ? "H" : securityType === "mixed" ? "M" : "L";
    return accumulator;
  }, {});
}

function calculateGovernmentProtection(input, policyContext, scenario, scenarioLoans) {
  const countyDefaults = policyContext.countyDefaults;
  const priorLienMap = input.liens.priorLiens.reduce((accumulator, lien) => {
    accumulator[lien.propertyId] = (accumulator[lien.propertyId] ?? 0) + lien.totalDebtPriorToFsaLien;
    return accumulator;
  }, {});
  const hmlPriority = buildHmlPriorityMap(input);

  const recoveryDetails = input.collateral.map((item) => {
    const bucket = resolveRecoveryBucket(item);
    const assumptions = policyContext.collateralRecoveryAssumptions[bucket] ?? policyContext.collateralRecoveryAssumptions.default;
    const monthsHeld =
      bucket === "real_estate" ? countyDefaults.realEstateMonthsInInventory : countyDefaults.chattelMonthsInInventory;
    const salesCostRate =
      bucket === "chattel" ? countyDefaults.chattelOtherSalesCostRate : countyDefaults.salesCommissionRate;
    const managedIncomeOffset =
      item.monthlyIncome * Math.max(monthsHeld - 1, 0) +
      item.managementIncome * (1 - (item.managementContractShare ?? 0));
    const grossRecoveryBase = item.recoverableValue > 0
      ? item.recoverableValue
      : item.marketValue * assumptions.baseRecoveryRate * (1 + assumptions.annualValueChange);
    const grossRecovery = grossRecoveryBase;
    const liquidationCosts =
      item.marketValue * salesCostRate +
      countyDefaults.adCost +
      item.repairCost +
      item.otherExpenseCost +
      assumptions.attorneyCost +
      assumptions.propertyManagementCost +
      item.monthlyManagementCost * monthsHeld;
    const priorLiens = priorLienMap[item.propertyId] ?? 0;
    const netRecovery = Math.max(grossRecovery - liquidationCosts - priorLiens + managedIncomeOffset, 0);
    const cmvBuyoutValue = Math.max(item.marketValue - priorLiens, 0);

    return {
      propertyId: item.propertyId,
      description: item.description,
      bucket,
      netRecovery: toCurrency(netRecovery),
      cmvBuyoutValue: toCurrency(cmvBuyoutValue),
      linkedLoanIds: item.linkedLoanIds ?? [],
    };
  });

  const netRecoveryValue = toCurrency(sum(recoveryDetails.map((detail) => detail.netRecovery)));
  const cmvBuyoutValue = toCurrency(
    sum(recoveryDetails.map((detail) => detail.cmvBuyoutValue)),
  );
  const projectedValue = toCurrency(
    scenario.buyoutAtCmv
      ? cmvBuyoutValue
      : scenarioLoans.reduce((total, loan) => {
          const firstYearPv = loan.recommendedPayment / (1 + policyContext.discountRate);
          const remainingPayment = Math.max(loan.recommendedPayment, 0);
          const remainingYears = Math.max(loan.termYears - 1, 0);
          const annuityFactor =
            remainingYears === 0
              ? 0
              : (1 - (1 + policyContext.discountRate) ** -remainingYears) / policyContext.discountRate;
          const remainingStreamPv = (remainingPayment * annuityFactor) / (1 + policyContext.discountRate) ** 2;
          return total + firstYearPv + remainingStreamPv;
        }, 0)
  );
  const coverageRatio = netRecoveryValue === 0 ? 1 : projectedValue / netRecoveryValue;
  const writedownVsNrvRequired =
    scenario.writedownAmount > 0 || scenario.liquidateLoan || scenario.buyoutAtCmv;

  const writedownOrdering = [...scenarioLoans]
    .map((loan) => ({
      loanId: loan.loanId,
      writedown: loan.writedown,
      hmlPriority: hmlPriority[loan.loanId] ?? "M",
      outstanding: loan.principalAfterWritedown,
    }))
    .sort((left, right) => {
      const priorityOrder = { H: 0, M: 1, L: 2 };
      if (priorityOrder[left.hmlPriority] !== priorityOrder[right.hmlPriority]) {
        return priorityOrder[left.hmlPriority] - priorityOrder[right.hmlPriority];
      }
      return right.outstanding - left.outstanding;
    });

  return {
    phase: "phase2-government-protection",
    writedownVsNrvRequired,
    pvVsNrvTest: writedownVsNrvRequired
      ? {
          presentValue: projectedValue,
          netRecoveryValue,
          passes: coverageRatio >= defaultConfig.scenarioControls.recoveryCoverageFloor,
        }
      : null,
    writedownOrdering: writedownVsNrvRequired ? writedownOrdering : [],
    hmlPriority,
    cmvBuyoutValue,
    netRecoveryValue,
    projectedValue,
    coverageRatio: toCurrency(coverageRatio),
    liquidationDiscountRate: countyDefaults.liquidationDiscountRate,
    recoveryDetails,
    passesCoverageFloor: writedownVsNrvRequired
      ? coverageRatio >= defaultConfig.scenarioControls.recoveryCoverageFloor
      : true,
  };
}

export { calculateGovernmentProtection, runPhase2GovernmentProtection };

function runPhase2GovernmentProtection(input, policyContext, scenario, phase1Result) {
  return calculateGovernmentProtection(input, policyContext, scenario, phase1Result.scenarioLoans);
}
