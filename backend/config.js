const sampleCase = {
  case: {
    borrowerId: 'IA-CASE-1',
    borrowerType: 'entity',
    state: 'IA',
    county: 'Polk',
    proposedServicingDate: '2026-04-01',
    completedApplicationDate: '2026-03-10',
    approvedFarmBusinessPlanDate: '2026-03-05',
    firstPaymentDueDate: '2027-01-01',
    debtMarginPercent: 0,
    goodFaith: true,
    deferralYearsRequested: 0,
    previousDebtForgivenessFlag: false,
    previousDebtForgivenessAmount: 0,
    previousDebtForgivenessDate: '',
    conservationAcres: 420,
    conservationTerm: 30,
  },
  cashFlow: {
    firstYear: {
      operatingExpense: 230000,
      operatingInterestExpense: 22000,
      ownerWithdrawals: 18000,
      balanceAvailable: 110000,
      nonAgencyDebtAndTaxes: 30000,
    },
  },
  existingLoans: [
    {
      loanId: 'FO-301',
      fundCode: 'FO',
      loanType: 'farm_ownership',
      principal: 1650000,
      accruedInterest: 0,
      accrualDate: '2026-04-01',
      existingRate: 0.0325,
      originalRate: 0.0325,
      originalNoteDate: '2018-06-15',
      maturityDate: '2048-06-15',
      remainingTermYears: 30,
      maxTermYears: 40,
      paymentSchedule: 'EQ',
      firstYearPayment: 94100,
      servicingAction: 'Y',
      delinquentAmountDue: 12000,
      limitedResource: false,
      consolidationAllowed: true,
      paidInFull: false,
      securityType: 'real_estate',
    },
  ],
  collateral: [
    {
      propertyId: 'IA-RE-1',
      propertyType: 'NER',
      description: 'Farmland acres',
      marketValue: 2100000,
      recoverableValue: 1860000,
      totalAcres: 420,
      propertyTaxes: 7000,
      managedAcres: 420,
      ratePerAcre: 240,
      managementIncome: 100800,
      monthlyManagementCost: 900,
      managementContractShare: 0.06,
      repairCost: 9000,
      repairDescription: 'Drainage and fencing',
      otherExpenseCost: 5000,
      otherExpenseDescription: 'Title and closing',
      monthlyIncome: 2200,
      incomeDescription: 'Lease value',
      linkedLoanIds: ['FO-301'],
    },
  ],
  liens: {
    propertyLoanLinks: [
      {
        propertyId: 'IA-RE-1',
        loanId: 'FO-301',
        filingDate: '2018-06-15',
        lienRank: 1,
      },
    ],
    priorLiens: [
      {
        propertyId: 'IA-RE-1',
        creditorName: 'Regional Farm Credit',
        creditorLoanNumber: 'RFC-301',
        totalDebtPriorToFsaLien: 240000,
        lienRelationshipCode: 'PRIOR',
        filingDate: '2017-11-01',
        lienRank: 1,
      },
    ],
  },
};

const casePresets = [
  {
    id: 'case1',
    label: 'Case 1 - Iowa Farm Ownership',
    description:
      'Farm ownership restructure using term extension and rate relief.',
    data: sampleCase,
  },
  {
    id: 'case2',
    label: 'Case 2 - Ranch Land Writedown',
    description:
      'Ranch land case that pushes the engine into writedown analysis.',
    data: {
      case: {
        borrowerId: 'TX-CASE-2',
        borrowerType: 'entity',
        state: 'TX',
        county: 'Lubbock',
        proposedServicingDate: '2026-04-15',
        completedApplicationDate: '2026-03-18',
        approvedFarmBusinessPlanDate: '2026-03-12',
        firstPaymentDueDate: '2027-01-01',
        debtMarginPercent: 0,
        goodFaith: true,
        deferralYearsRequested: 0,
        previousDebtForgivenessFlag: false,
        previousDebtForgivenessAmount: 0,
        previousDebtForgivenessDate: '',
        conservationAcres: 650,
        conservationTerm: 30,
      },
      cashFlow: {
        firstYear: {
          operatingExpense: 210000,
          operatingInterestExpense: 28000,
          ownerWithdrawals: 26000,
          balanceAvailable: 147000,
          nonAgencyDebtAndTaxes: 60000,
        },
      },
      existingLoans: [
        {
          loanId: 'FO-401',
          fundCode: 'FO',
          loanType: 'farm_ownership',
          principal: 2250000,
          accruedInterest: 0,
          accrualDate: '2026-04-15',
          existingRate: 0.031,
          originalRate: 0.031,
          originalNoteDate: '2017-05-20',
          maturityDate: '2052-05-20',
          remainingTermYears: 27,
          maxTermYears: 35,
          paymentSchedule: 'EQ',
          firstYearPayment: 104500,
          servicingAction: 'Y',
          delinquentAmountDue: 22000,
          limitedResource: false,
          consolidationAllowed: false,
          paidInFull: false,
          securityType: 'real_estate',
        },
      ],
      collateral: [
        {
          propertyId: 'TX-RE-1',
          propertyType: 'NER',
          description: 'Ranch land',
          marketValue: 3500000,
          recoverableValue: 1750000,
          totalAcres: 650,
          propertyTaxes: 7000,
          managedAcres: 650,
          ratePerAcre: 320,
          managementIncome: 208000,
          monthlyManagementCost: 1200,
          managementContractShare: 0.05,
          repairCost: 18000,
          repairDescription: 'Fence and water access',
          otherExpenseCost: 8000,
          otherExpenseDescription: 'Disposition legal costs',
          monthlyIncome: 2500,
          incomeDescription: 'Seasonal grazing lease',
          linkedLoanIds: ['FO-401'],
        },
        {
          propertyId: 'TX-CH-1',
          propertyType: 'CHL',
          description: 'Equipment',
          marketValue: 250000,
          recoverableValue: 120000,
          totalAcres: 0,
          propertyTaxes: 0,
          managedAcres: 0,
          ratePerAcre: 0,
          managementIncome: 0,
          monthlyManagementCost: 150,
          managementContractShare: 0,
          repairCost: 4000,
          repairDescription: 'Transport and prep',
          otherExpenseCost: 3000,
          otherExpenseDescription: 'Broker fees',
          monthlyIncome: 0,
          incomeDescription: '',
          linkedLoanIds: ['FO-401'],
        },
      ],
      liens: {
        propertyLoanLinks: [
          {
            propertyId: 'TX-RE-1',
            loanId: 'FO-401',
            filingDate: '2017-05-20',
            lienRank: 1,
          },
          {
            propertyId: 'TX-CH-1',
            loanId: 'FO-401',
            filingDate: '2017-05-20',
            lienRank: 1,
          },
        ],
        priorLiens: [
          {
            propertyId: 'TX-RE-1',
            creditorName: 'Plains Credit',
            creditorLoanNumber: 'PLC-882',
            totalDebtPriorToFsaLien: 240000,
            lienRelationshipCode: 'PRIOR',
            filingDate: '2016-10-01',
            lienRank: 1,
          },
        ],
      },
    },
  },
  {
    id: 'case3',
    label: 'Case 3 - Multi-Loan Multi-Collateral',
    description:
      'Two-loan case with separate and shared collateral to show different loan-level recommendations.',
    data: {
      case: {
        borrowerId: 'NE-CASE-3',
        borrowerType: 'entity',
        state: 'NE',
        county: 'Lancaster',
        proposedServicingDate: '2026-03-01',
        completedApplicationDate: '2026-02-15',
        approvedFarmBusinessPlanDate: '2026-02-10',
        firstPaymentDueDate: '2027-01-01',
        debtMarginPercent: 0,
        goodFaith: true,
        deferralYearsRequested: 0,
        previousDebtForgivenessFlag: false,
        previousDebtForgivenessAmount: 0,
        previousDebtForgivenessDate: '',
        conservationAcres: 320,
        conservationTerm: 30,
      },
      cashFlow: {
        firstYear: {
          operatingExpense: 228000,
          operatingInterestExpense: 19000,
          ownerWithdrawals: 24000,
          balanceAvailable: 68000,
          nonAgencyDebtAndTaxes: 22000,
        },
      },
      existingLoans: [
        {
          loanId: 'FO-101',
          fundCode: 'FO',
          loanType: 'farm_ownership',
          principal: 305000,
          accruedInterest: 6300,
          accrualDate: '2026-02-01',
          existingRate: 0.0525,
          originalRate: 0.0575,
          originalNoteDate: '2019-04-15',
          maturityDate: '2044-04-15',
          remainingTermYears: 18,
          maxTermYears: 30,
          paymentSchedule: 'EQ',
          firstYearPayment: 26940,
          servicingAction: 'Y',
          delinquentAmountDue: 7200,
          limitedResource: false,
          consolidationAllowed: true,
          paidInFull: false,
          securityType: 'real_estate',
        },
        {
          loanId: 'OL-210',
          fundCode: 'OL',
          loanType: 'operating',
          principal: 98000,
          accruedInterest: 2400,
          accrualDate: '2026-02-01',
          existingRate: 0.061,
          originalRate: 0.068,
          originalNoteDate: '2024-03-10',
          maturityDate: '2032-03-10',
          remainingTermYears: 6,
          maxTermYears: 6,
          paymentSchedule: 'EQ',
          firstYearPayment: 20370,
          servicingAction: 'Y',
          delinquentAmountDue: 4100,
          limitedResource: true,
          consolidationAllowed: false,
          paidInFull: false,
          securityType: 'mixed',
        },
      ],
      collateral: [
        {
          propertyId: 'RE-1',
          propertyType: 'NER',
          description: 'Dryland row crop acreage',
          marketValue: 388000,
          recoverableValue: 332000,
          totalAcres: 320,
          propertyTaxes: 5100,
          managedAcres: 320,
          ratePerAcre: 245,
          managementIncome: 78400,
          monthlyManagementCost: 800,
          managementContractShare: 0.08,
          repairCost: 6200,
          repairDescription: 'Fencing and drainage repairs',
          otherExpenseCost: 2200,
          otherExpenseDescription: 'Insurance and closing prep',
          monthlyIncome: 1900,
          incomeDescription: 'Seasonal lease value',
          linkedLoanIds: ['FO-101'],
        },
        {
          propertyId: 'CH-1',
          propertyType: 'CHL',
          description: 'Equipment package',
          marketValue: 92000,
          recoverableValue: 61000,
          totalAcres: 0,
          propertyTaxes: 0,
          managedAcres: 0,
          ratePerAcre: 0,
          managementIncome: 0,
          monthlyManagementCost: 220,
          managementContractShare: 0,
          repairCost: 3500,
          repairDescription: 'Transport and refurbish',
          otherExpenseCost: 1800,
          otherExpenseDescription: 'Auction prep',
          monthlyIncome: 0,
          incomeDescription: '',
          linkedLoanIds: ['OL-210'],
        },
        {
          propertyId: 'MIX-1',
          propertyType: 'MIX',
          description: 'Grain storage and supporting improvements',
          marketValue: 145000,
          recoverableValue: 97000,
          totalAcres: 0,
          propertyTaxes: 900,
          managedAcres: 0,
          ratePerAcre: 0,
          managementIncome: 0,
          monthlyManagementCost: 180,
          managementContractShare: 0,
          repairCost: 2400,
          repairDescription: 'Minor structural repairs',
          otherExpenseCost: 1200,
          otherExpenseDescription: 'Sale prep',
          monthlyIncome: 350,
          incomeDescription: 'Storage lease',
          linkedLoanIds: ['FO-101', 'OL-210'],
        },
      ],
      liens: {
        propertyLoanLinks: [
          {
            propertyId: 'RE-1',
            loanId: 'FO-101',
            filingDate: '2019-04-15',
            lienRank: 1,
          },
          {
            propertyId: 'CH-1',
            loanId: 'OL-210',
            filingDate: '2024-03-10',
            lienRank: 1,
          },
          {
            propertyId: 'MIX-1',
            loanId: 'FO-101',
            filingDate: '2019-04-15',
            lienRank: 2,
          },
          {
            propertyId: 'MIX-1',
            loanId: 'OL-210',
            filingDate: '2024-03-10',
            lienRank: 2,
          },
        ],
        priorLiens: [
          {
            propertyId: 'RE-1',
            creditorName: 'Midwest Ag Bank',
            creditorLoanNumber: 'MAB-774',
            totalDebtPriorToFsaLien: 85000,
            lienRelationshipCode: 'PRIOR',
            filingDate: '2018-12-01',
            lienRank: 1,
          },
        ],
      },
    },
  },
];

const config = {
  app: {
    title: 'A-STAR',
    description:
      'Allocore Servicing Term Analysis and Recommendation for restructuring scenarios.',
  },
  referenceData: {
    borrowerTypes: [
      { value: 'individual', label: 'Individual' },
      { value: 'entity', label: 'Entity' },
      { value: 'partnership', label: 'Partnership' },
    ],
    loanTypes: [
      { value: 'farm_ownership', label: 'Farm Ownership' },
      { value: 'operating', label: 'Operating' },
      { value: 'emergency', label: 'Emergency' },
    ],
    collateralTypes: [
      { value: 'NER', label: 'Real Estate' },
      { value: 'NFR', label: 'Farm Real Estate' },
      { value: 'CHL', label: 'Chattel' },
      { value: 'MIX', label: 'Mixed Collateral' },
    ],
  },
  locationOptions: {
    NE: {
      label: 'Nebraska',
      counties: ['Lancaster', 'Douglas', 'Hall', 'Buffalo'],
    },
    IA: {
      label: 'Iowa',
      counties: ['Polk', 'Story', 'Linn', 'Woodbury'],
    },
    KS: {
      label: 'Kansas',
      counties: ['Sedgwick', 'Shawnee', 'Finney', 'Saline'],
    },
    TX: {
      label: 'Texas',
      counties: ['Travis', 'Lubbock', 'McLennan', 'Tom Green'],
    },
  },
  sampleCase,
  casePresets,
  policy: {
    discountRate: [
      { effectiveDate: '2025-01-01', rate: 0.0475 },
      { effectiveDate: '2026-01-01', rate: 0.045 },
    ],
    rateTables: {
      default: [
        {
          effectiveDate: '2025-01-01',
          loanType: 'farm_ownership',
          regularRate: 0.0525,
          floorRate: 0.01,
        },
        {
          effectiveDate: '2025-01-01',
          loanType: 'operating',
          regularRate: 0.061,
          floorRate: 0.01,
        },
        {
          effectiveDate: '2026-01-01',
          loanType: 'farm_ownership',
          regularRate: 0.05,
          floorRate: 0.01,
        },
        {
          effectiveDate: '2026-01-01',
          loanType: 'operating',
          regularRate: 0.058,
          floorRate: 0.01,
        },
      ],
      NE: [
        {
          effectiveDate: '2026-01-01',
          loanType: 'farm_ownership',
          regularRate: 0.0495,
          floorRate: 0.01,
        },
      ],
      IA: [
        {
          effectiveDate: '2026-01-01',
          loanType: 'farm_ownership',
          regularRate: 0.0505,
          floorRate: 0.01,
        },
        {
          effectiveDate: '2026-01-01',
          loanType: 'operating',
          regularRate: 0.0595,
          floorRate: 0.01,
        },
      ],
      KS: [
        {
          effectiveDate: '2026-01-01',
          loanType: 'farm_ownership',
          regularRate: 0.051,
          floorRate: 0.01,
        },
        {
          effectiveDate: '2026-01-01',
          loanType: 'operating',
          regularRate: 0.0605,
          floorRate: 0.01,
        },
      ],
      TX: [
        {
          effectiveDate: '2026-01-01',
          loanType: 'farm_ownership',
          regularRate: 0.052,
          floorRate: 0.01,
        },
        {
          effectiveDate: '2026-01-01',
          loanType: 'operating',
          regularRate: 0.0615,
          floorRate: 0.01,
        },
      ],
    },
    maxTerms: {
      farm_ownership: 40,
      operating: 10,
      emergency: 20,
      default: 15,
    },
    loanLimits: {
      farm_ownership: 3000000,
      operating: 1000000,
      emergency: 1500000,
      default: 750000,
    },
    collateralRecoveryAssumptions: {
      real_estate: {
        baseRecoveryRate: 0.78,
        annualValueChange: -0.015,
        attorneyCost: 7500,
        propertyManagementCost: 4800,
      },
      chattel: {
        baseRecoveryRate: 0.58,
        annualValueChange: -0.06,
        attorneyCost: 4200,
        propertyManagementCost: 1600,
      },
      mixed: {
        baseRecoveryRate: 0.66,
        annualValueChange: -0.03,
        attorneyCost: 5600,
        propertyManagementCost: 2800,
      },
      default: {
        baseRecoveryRate: 0.62,
        annualValueChange: -0.03,
        attorneyCost: 5000,
        propertyManagementCost: 2000,
      },
    },
    countyNetRecoveryDefaults: {
      statewide: {
        effectiveDate: '2025-01-01',
        liquidationDiscountRate: 0.14,
        realEstateMonthsInInventory: 9,
        chattelMonthsInInventory: 4,
        salesCommissionRate: 0.06,
        adCost: 1800,
        chattelOtherSalesCostRate: 0.03,
      },
      NE: {
        statewide: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.12,
          realEstateMonthsInInventory: 8,
          chattelMonthsInInventory: 3,
          salesCommissionRate: 0.055,
          adCost: 1500,
          chattelOtherSalesCostRate: 0.025,
        },
        Lancaster: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.105,
          realEstateMonthsInInventory: 7,
          chattelMonthsInInventory: 3,
          salesCommissionRate: 0.05,
          adCost: 1250,
          chattelOtherSalesCostRate: 0.02,
        },
        Douglas: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.11,
          realEstateMonthsInInventory: 7,
          chattelMonthsInInventory: 3,
          salesCommissionRate: 0.052,
          adCost: 1300,
          chattelOtherSalesCostRate: 0.021,
        },
      },
      IA: {
        statewide: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.118,
          realEstateMonthsInInventory: 8,
          chattelMonthsInInventory: 4,
          salesCommissionRate: 0.056,
          adCost: 1450,
          chattelOtherSalesCostRate: 0.024,
        },
        Polk: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.112,
          realEstateMonthsInInventory: 7,
          chattelMonthsInInventory: 3,
          salesCommissionRate: 0.053,
          adCost: 1325,
          chattelOtherSalesCostRate: 0.022,
        },
      },
      KS: {
        statewide: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.121,
          realEstateMonthsInInventory: 8,
          chattelMonthsInInventory: 4,
          salesCommissionRate: 0.057,
          adCost: 1400,
          chattelOtherSalesCostRate: 0.025,
        },
        Sedgwick: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.114,
          realEstateMonthsInInventory: 7,
          chattelMonthsInInventory: 3,
          salesCommissionRate: 0.054,
          adCost: 1300,
          chattelOtherSalesCostRate: 0.022,
        },
      },
      TX: {
        statewide: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.125,
          realEstateMonthsInInventory: 9,
          chattelMonthsInInventory: 4,
          salesCommissionRate: 0.058,
          adCost: 1550,
          chattelOtherSalesCostRate: 0.026,
        },
        Travis: {
          effectiveDate: '2026-01-01',
          liquidationDiscountRate: 0.116,
          realEstateMonthsInInventory: 7,
          chattelMonthsInInventory: 3,
          salesCommissionRate: 0.054,
          adCost: 1350,
          chattelOtherSalesCostRate: 0.023,
        },
      },
    },
  },
  scenarioControls: {
    marginStartPercent: 10,
    marginEndPercent: 0,
    marginStepPercent: 1,
    termExtensionYears: [0, 1, 3, 5, 8, 12],
    rateReductionPercent: [0, 0.001, 0.0025, 0.005, 0.01],
    deferralYears: [0, 1, 2],
    conservationSupportAmounts: [0],
    writedownAmounts: [0, 10000, 20000, 40000, 150000, 250000, 300000],
    writedownCapAmount: 300000,
    consolidationOptions: [false],
    liquidationOptions: [false, true],
    maxScenarioCount: 1500,
    recoveryCoverageFloor: 0.75,
    explanationTopCount: 5,
  },
  scoringWeights: {
    feasibility: 0.4,
    governmentProtection: 0.35,
    concessionMinimization: 0.1,
    simplicity: 0.05,
    marginAttainment: 0.1,
  },
};

function getLatestEffectiveValue(items, proposedDate) {
  const target = new Date(proposedDate);
  return (
    items
      .filter((item) => new Date(item.effectiveDate) <= target)
      .sort(
        (left, right) =>
          new Date(right.effectiveDate) - new Date(left.effectiveDate),
      )[0] ?? items[items.length - 1]
  );
}

function resolveRateTable(policy, state, proposedDate) {
  const table = policy.rateTables[state] ?? policy.rateTables.default;
  const mergedDefaults = policy.rateTables.default.filter(
    (entry) =>
      !table.some((candidate) => candidate.loanType === entry.loanType),
  );
  return [...table, ...mergedDefaults].reduce((accumulator, entry) => {
    const bucket = accumulator[entry.loanType] ?? [];
    bucket.push(entry);
    accumulator[entry.loanType] = bucket;
    return accumulator;
  }, {});
}

function resolveCountyRecoveryDefaults(policy, state, county, proposedDate) {
  const statewide = policy.countyNetRecoveryDefaults.statewide ?? {};
  const stateOverrides = policy.countyNetRecoveryDefaults[state] ?? {};
  const stateWideOverride = stateOverrides.statewide ?? {};
  const countyOverride = stateOverrides[county] ?? {};
  const candidates = [statewide, stateWideOverride, countyOverride].filter(
    (entry) => Object.keys(entry).length > 0,
  );
  const target = new Date(proposedDate);

  return candidates.reduce((resolved, candidate) => {
    if (
      !candidate.effectiveDate ||
      new Date(candidate.effectiveDate) <= target
    ) {
      return { ...resolved, ...candidate };
    }
    return resolved;
  }, {});
}

export {
  config,
  casePresets,
  sampleCase,
  getLatestEffectiveValue,
  resolveRateTable,
  resolveCountyRecoveryDefaults,
};
