<script setup>
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  toRaw,
  watch,
} from 'vue';
import headerLogo from '../logo.svg';

function clone(value) {
  const rawValue = toRaw(value);
  try {
    return structuredClone(rawValue);
  } catch {
    return JSON.parse(JSON.stringify(rawValue));
  }
}

function serializeModel() {
  return JSON.parse(JSON.stringify(model));
}

const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const appMeta = ref({ title: '', description: '' });
const locationOptions = ref({});
const referenceData = ref({});
const casePresets = ref([]);
const currentPresetId = ref('');
const policySummary = ref({});
const scenarioControls = ref({});
const results = ref(null);
const selectedScenarioId = ref('');
const openSections = reactive({
  briefing: true,
  decision: true,
  borrower: true,
  cashFlow: true,
  existingLoans: true,
  collateral: false,
  liens: false,
  policy: false,
});

const model = reactive({
  case: {},
  cashFlow: {
    firstYear: {},
  },
  existingLoans: [],
  collateral: [],
  liens: {
    propertyLoanLinks: [],
    priorLiens: [],
  },
});

const navigationItems = [
  {
    key: 'decision',
    label: 'Decision summary',
    description: 'Recommendation, graphs, alternatives',
  },
  {
    key: 'borrower',
    label: 'Borrower and case',
    description: 'Applicant, geography, servicing dates',
  },
  {
    key: 'cashFlow',
    label: 'Cash flow capacity',
    description: 'Available cash and operating capacity',
  },
  {
    key: 'existingLoans',
    label: 'Existing debt inventory',
    description: 'Current loans under review',
  },
  {
    key: 'collateral',
    label: 'Collateral and recovery',
    description: 'Assets and liquidation inputs',
  },
  {
    key: 'liens',
    label: 'Liens and security',
    description: 'Property links and prior liens',
  },
  {
    key: 'policy',
    label: 'Policy settings',
    description: 'Scenario controls and scoring weights',
  },
];

const selectedScenario = computed(() => {
  if (!results.value) {
    return null;
  }
  return (
    results.value.scenarios.find(
      (scenario) => scenario.id === selectedScenarioId.value,
    ) ??
    results.value.scenarios[0] ??
    null
  );
});

const recommendation = computed(() => results.value?.scenarios?.[0] ?? null);
const stateOptions = computed(() => Object.entries(locationOptions.value));
const borrowerTypeOptions = computed(
  () => referenceData.value.borrowerTypes ?? [],
);
const loanTypeOptions = computed(() => referenceData.value.loanTypes ?? []);
const collateralTypeOptions = computed(
  () => referenceData.value.collateralTypes ?? [],
);
const countyOptions = computed(() => {
  const activeState = model.case.state;
  if (!activeState || !locationOptions.value[activeState]) {
    return [];
  }
  return locationOptions.value[activeState].counties ?? [];
});
const totalCollateralValue = computed(() =>
  model.collateral.reduce(
    (total, item) => total + Number(item.marketValue ?? 0),
    0,
  ),
);
const totalRecoverableValue = computed(() =>
  model.collateral.reduce(
    (total, item) => total + Number(item.recoverableValue ?? 0),
    0,
  ),
);
const firstYearOperatingIncome = computed(
  () =>
    Number(model.cashFlow.firstYear.balanceAvailable ?? 0) -
    Number(model.cashFlow.firstYear.nonAgencyDebtAndTaxes ?? 0),
);
const currentFirstYearPaymentAmount = computed(() =>
  Number(results.value?.summaryMetrics?.baseline?.firstYearRepayment ?? 0),
);
const recommendedFirstYearPaymentAmount = computed(() =>
  Number(selectedScenario.value?.firstYearMetrics?.totalDebtRepayment ?? 0),
);
const currentPaymentGap = computed(
  () => firstYearOperatingIncome.value - currentFirstYearPaymentAmount.value,
);
const recommendedPaymentGap = computed(
  () =>
    firstYearOperatingIncome.value - recommendedFirstYearPaymentAmount.value,
);
const proposedTermsSummary = computed(() => {
  if (!selectedScenario.value) {
    return ['Run the engine to generate proposed restructuring terms.'];
  }
  const lines = selectedScenario.value.paymentScheduleByLoan.map((loan) => {
    const actionLabel = formatActions(loan.servicingActions);
    return `${loan.loanId}: ${actionLabel || 'No Structural Change Proposed'}`;
  });
  return lines.length > 0 ? lines : ['No Structural Change Proposed'];
});
const briefingSections = computed(() => [
  {
    title: 'Borrower profile',
    items: [
      { label: 'Borrower ID', value: model.case.borrowerId || '--' },
      {
        label: 'Borrower type',
        value: lookupLabel(borrowerTypeOptions.value, model.case.borrowerType),
      },
      {
        label: 'State / County',
        value: `${model.case.state || '--'} / ${model.case.county || '--'}`,
      },
    ],
  },
  {
    title: 'Loan information',
    items: [
      { label: 'Loans in case', value: `${model.existingLoans.length}` },
      {
        label: 'Current annual payment',
        value: currency(currentFirstYearPaymentAmount.value),
      },
      {
        label: 'Total outstanding',
        value: currencyCompact(
          model.existingLoans.reduce(
            (sum, loan) =>
              sum +
              Number(loan.principal ?? 0) +
              Number(loan.accruedInterest ?? 0),
            0,
          ),
        ),
      },
    ],
  },
  {
    title: 'Farm business plan',
    items: [
      {
        label: 'Plan approved',
        value: formatDate(model.case.approvedFarmBusinessPlanDate),
      },
      {
        label: 'Application completed',
        value: formatDate(model.case.completedApplicationDate),
      },
      { label: 'Good faith', value: model.case.goodFaith ? 'Yes' : 'No' },
    ],
  },
  {
    title: 'Cash flow',
    items: [
      {
        label: 'Available cash',
        value: currencyCompact(model.cashFlow.firstYear.balanceAvailable),
      },
      {
        label: 'Operating expense',
        value: currencyCompact(model.cashFlow.firstYear.operatingExpense),
      },
      {
        label: 'Non-agency debt and taxes',
        value: currencyCompact(model.cashFlow.firstYear.nonAgencyDebtAndTaxes),
      },
    ],
  },
  {
    title: 'Capacity for debt',
    items: [
      {
        label: 'Operating income',
        value: currencyCompact(firstYearOperatingIncome.value),
      },
      {
        label: 'Current payment gap',
        value: currencyCompact(currentPaymentGap.value),
      },
      {
        label: 'Debt margin reserve',
        value: `${Number(model.case.debtMarginPercent ?? 0).toFixed(0)}%`,
      },
    ],
  },
  {
    title: 'Proposed restructuring terms',
    items: [
      { label: 'Recommendation path', value: proposedTermsSummary.value },
      {
        label: 'Restructuring date',
        value: formatDate(model.case.proposedServicingDate),
      },
    ],
  },
  {
    title: 'Why are these terms proposed',
    items: [
      {
        label: 'Engine rationale',
        value:
          recommendation.value?.rationale ??
          'The recommendation explanation appears here after evaluation.',
      },
    ],
  },
  {
    title: 'Cash flow after restructuring',
    items: [
      {
        label: 'Recommended annual payment',
        value: currencyCompact(recommendedFirstYearPaymentAmount.value),
      },
      {
        label: 'Remaining cash flow',
        value: currencyCompact(recommendedPaymentGap.value),
      },
    ],
  },
  {
    title: 'Collateral details',
    items: [
      { label: 'Assets', value: `${model.collateral.length}` },
      {
        label: 'Market value',
        value: currencyCompact(totalCollateralValue.value),
      },
      {
        label: 'Recoverable value',
        value: currencyCompact(totalRecoverableValue.value),
      },
    ],
  },
  {
    title: 'Net recovery value',
    items: recommendation.value
      ? [
          {
            label: 'Net recovery value',
            value: currencyCompact(
              recommendation.value.governmentProtectionMetrics.netRecoveryValue,
            ),
          },
          {
            label: 'Coverage ratio',
            value: `${recommendation.value.governmentProtectionMetrics.coverageRatio}`,
          },
        ]
      : [{ label: 'Status', value: 'Available after evaluation.' }],
  },
]);
const loanComparisonRows = computed(() => {
  if (!selectedScenario.value) {
    return [];
  }
  const recommendedLoans = new Map(
    selectedScenario.value.paymentScheduleByLoan.map((loan) => [
      loan.loanId,
      loan,
    ]),
  );
  return model.existingLoans.map((loan) => {
    const recommendedLoan = recommendedLoans.get(loan.loanId);
    return {
      loanId: loan.loanId,
      loanType: lookupLabel(loanTypeOptions.value, loan.loanType),
      currentRate: loan.existingRate,
      recommendedRate: recommendedLoan?.rate ?? loan.existingRate,
      currentTermYears: loan.remainingTermYears,
      recommendedTermYears:
        recommendedLoan?.termYears ?? loan.remainingTermYears,
      currentFirstYearPayment: loan.firstYearPayment,
      recommendedFirstYearPayment:
        recommendedLoan?.recommendedPayment ?? loan.firstYearPayment,
      actions: recommendedLoan?.servicingActions ?? [],
    };
  });
});
const recommendedLoanCards = computed(() =>
  loanComparisonRows.value.map((row) => ({
    ...row,
    currentPaymentDelta:
      row.recommendedFirstYearPayment - row.currentFirstYearPayment,
  })),
);
const calculationSummaryRows = computed(() => {
  if (!selectedScenario.value || !results.value) {
    return [];
  }

  const baseline = results.value.summaryMetrics?.baseline ?? {
    firstYearRepayment: 0,
  };
  const scenario = selectedScenario.value;
  const adjustedBalance = firstYearOperatingIncome.value;
  const marginPercent = Number(scenario.scenario.marginTarget ?? 0);
  const reservedCash = adjustedBalance * marginPercent;
  const usableCash = scenario.firstYearMetrics.cashAvailable;
  const recommendedPayment = scenario.firstYearMetrics.totalDebtRepayment;
  const paymentReduction = baseline.firstYearRepayment - recommendedPayment;
  const paymentReductionPercent =
    paymentReduction / Math.max(baseline.firstYearRepayment, 1);
  const totalOutstanding = model.existingLoans.reduce(
    (sum, loan) =>
      sum + Number(loan.principal ?? 0) + Number(loan.accruedInterest ?? 0),
    0,
  );
  const writedownAmount = Number(scenario.scenario.writedownAmount ?? 0);
  const netRecoveryValue = Number(
    scenario.governmentProtectionMetrics.netRecoveryValue ?? 0,
  );
  const netRecoveryLoss = Math.max(totalOutstanding - netRecoveryValue, 0);
  const scoringWeights = policySummary.value.scoringWeights ?? {};
  const scoreComponents = scenario.scoreComponents ?? {};

  const rows = [
    {
      category: 'Cash capacity',
      metric: 'Adjusted operating income',
      formula: 'Balance Available - Non-Agency Debt And Taxes',
      value: currency(adjustedBalance),
    },
    {
      category: 'Cash capacity',
      metric: 'Debt margin reserve',
      formula: `${(marginPercent * 100).toFixed(0)}% x ${currency(adjustedBalance)}`,
      value: currency(reservedCash),
    },
    {
      category: 'Cash capacity',
      metric: 'Usable cash for debt service',
      formula: `${currency(adjustedBalance)} - ${currency(reservedCash)}`,
      value: currency(usableCash),
    },
    {
      category: 'Payment comparison',
      metric: 'Total outstanding loan',
      formula: 'Principal + Accrued Interest Across All Loans',
      value: currency(totalOutstanding),
    },
    {
      category: 'Payment comparison',
      metric: 'Current annual payment',
      formula: 'Sum Of Current Loan Payments',
      value: currency(baseline.firstYearRepayment),
    },
    {
      category: 'Payment comparison',
      metric: 'Recommended annual payment',
      formula: 'Sum Of Recommended Loan Payments',
      value: currency(recommendedPayment),
    },
    {
      category: 'Payment comparison',
      metric: 'Annual payment reduction',
      formula: `${currency(baseline.firstYearRepayment)} - ${currency(recommendedPayment)}`,
      value: `${currency(paymentReduction)} (${percent(paymentReductionPercent)})`,
    },
    {
      category: 'Cash flow result',
      metric: 'Cash retained after payment',
      formula: `${currency(usableCash)} - ${currency(recommendedPayment)}`,
      value: currency(usableCash - recommendedPayment),
    },
    {
      category: 'Government protection',
      metric: 'Projected value',
      formula: 'Discounted Payment Stream',
      value: currency(scenario.governmentProtectionMetrics.projectedValue),
    },
    {
      category: 'Government protection',
      metric: 'Net recovery value',
      formula: 'Recovery Value - Liens - Liquidation Costs',
      value: currency(netRecoveryValue),
    },
    {
      category: 'Government protection',
      metric: 'Coverage ratio',
      formula: `${currency(scenario.governmentProtectionMetrics.projectedValue)} / ${currency(netRecoveryValue)}`,
      value: `${scenario.governmentProtectionMetrics.coverageRatio.toFixed(2)}x`,
    },
  ];

  if (writedownAmount > 0) {
    rows.push(
      {
        category: 'Writedown vs recovery',
        metric: 'Recommended writedown',
        formula: 'Scenario Writedown Amount',
        value: currency(writedownAmount),
      },
      {
        category: 'Writedown vs recovery',
        metric: 'Net recovery loss',
        formula: `${currency(totalOutstanding)} - ${currency(netRecoveryValue)}`,
        value: currency(netRecoveryLoss),
      },
      {
        category: 'Writedown vs recovery',
        metric: 'Writedown compared to loss',
        formula: `${currency(writedownAmount)} vs ${currency(netRecoveryLoss)}`,
        value:
          writedownAmount <= netRecoveryLoss
            ? 'Within net recovery loss'
            : 'Above net recovery loss',
      },
    );
  }

  rows.push(
    {
      category: 'Scoring detail',
      metric: 'Final scenario score',
      formula: 'Weighted sum of component scores',
      value: `${scenario.score.toFixed(2)}`,
    },
    {
      category: 'Scoring detail',
      metric: 'Feasibility weight x score',
      formula: `${percent(scoringWeights.feasibility)} x ${scoreComponents.feasibilityScore?.toFixed?.(2) ?? '--'}`,
      value: `${((scoringWeights.feasibility ?? 0) * (scoreComponents.feasibilityScore ?? 0)).toFixed(2)}`,
    },
    {
      category: 'Scoring detail',
      metric: 'Government protection weight x score',
      formula: `${percent(scoringWeights.governmentProtection)} x ${scoreComponents.governmentProtectionScore?.toFixed?.(2) ?? '--'}`,
      value: `${((scoringWeights.governmentProtection ?? 0) * (scoreComponents.governmentProtectionScore ?? 0)).toFixed(2)}`,
    },
    {
      category: 'Scoring detail',
      metric: 'Concession minimization weight x score',
      formula: `${percent(scoringWeights.concessionMinimization)} x ${scoreComponents.concessionMinimizationScore?.toFixed?.(2) ?? '--'}`,
      value: `${((scoringWeights.concessionMinimization ?? 0) * (scoreComponents.concessionMinimizationScore ?? 0)).toFixed(2)}`,
    },
    {
      category: 'Scoring detail',
      metric: 'Margin attainment weight x score',
      formula: `${percent(scoringWeights.marginAttainment)} x ${scoreComponents.marginAttainmentScore?.toFixed?.(2) ?? '--'}`,
      value: `${((scoringWeights.marginAttainment ?? 0) * (scoreComponents.marginAttainmentScore ?? 0)).toFixed(2)}`,
    },
    {
      category: 'Scoring detail',
      metric: 'Simplicity weight x score',
      formula: `${percent(scoringWeights.simplicity)} x ${scoreComponents.simplicityScore?.toFixed?.(2) ?? '--'}`,
      value: `${((scoringWeights.simplicity ?? 0) * (scoreComponents.simplicityScore ?? 0)).toFixed(2)}`,
    },
  );

  return rows;
});
const loanCalculationRows = computed(() =>
  recommendedLoanCards.value.map((loan) => ({
    loanId: loan.loanId,
    loanType: loan.loanType,
    currentRate: ratePercent(loan.currentRate),
    proposedRate: ratePercent(loan.recommendedRate),
    currentTerm: yearsLabel(loan.currentTermYears),
    proposedTerm: yearsLabel(loan.recommendedTermYears),
    currentPayment: currency(loan.currentFirstYearPayment),
    proposedPayment: currency(loan.recommendedFirstYearPayment),
    paymentChange: currency(
      loan.currentFirstYearPayment - loan.recommendedFirstYearPayment,
    ),
    actions: formatActions(loan.actions) || 'No Change',
  })),
);
const policyCards = computed(() => {
  const controls = policySummary.value.scenarioControls ?? {};
  const scoring = policySummary.value.scoringWeights ?? {};
  const recovery = policySummary.value.collateralRecoveryAssumptions ?? {};
  return [
    {
      title: 'Scenario controls',
      rows: [
        {
          label: 'Margin search',
          value: `${controls.marginStartPercent ?? '--'}% to ${controls.marginEndPercent ?? '--'}%`,
        },
        {
          label: 'Term extensions',
          value:
            (controls.termExtensionYears ?? []).map(yearsLabel).join(', ') ||
            '--',
        },
        {
          label: 'Rate reductions',
          value:
            (controls.rateReductionPercent ?? []).map(ratePercent).join(', ') ||
            '--',
        },
        {
          label: 'Writedown cap',
          value: currency(controls.writedownCapAmount ?? 0),
        },
      ],
    },
    {
      title: 'Scoring weights',
      rows: Object.entries(scoring).map(([key, value]) => ({
        label: formatLabel(key),
        value: percent(value),
      })),
    },
    {
      title: 'Collateral recovery assumptions',
      rows: ['real_estate', 'mixed', 'chattel'].map((key) => ({
        label: formatLabel(key),
        value: `${percent(recovery[key]?.baseRecoveryRate ?? 0)} base recovery`,
      })),
    },
  ];
});

const pipelineCounts = computed(() => {
  const counts = results.value?.metadata?.pipelineCounts;
  if (counts) {
    return [
      { label: 'Generated', value: counts.generated },
      { label: 'Feasible', value: counts.feasible },
      { label: 'Rejected', value: counts.rejected },
      { label: 'Recommended', value: counts.recommended },
    ];
  }
  return [];
});

const baselineScenarioRow = computed(() => ({
  id: 'current-baseline',
  label: 'Current baseline',
  description: 'Current loan structure before any restructuring action.',
  annualPayment: currentFirstYearPaymentAmount.value,
  cashMargin: currentPaymentGap.value,
  coverage:
    recommendation.value?.governmentProtectionMetrics?.coverageRatio ?? 0,
}));

const topScenarioComparisons = computed(() => {
  if (!results.value?.scenarios?.length) {
    return [];
  }

  const candidates = [];
  const seenSignatures = new Set();
  for (const scenario of results.value.scenarios) {
    if (scenario.status === 'rejected') {
      continue;
    }
    const signature = JSON.stringify({
      actions: scenario.actionsByLoan,
      annualPayment:
        Math.round(scenario.firstYearMetrics.totalDebtRepayment / 250) * 250,
      coverage:
        Math.round(scenario.governmentProtectionMetrics.coverageRatio * 100) /
        100,
      rateReduction: scenario.scenario.rateReductionPercent,
      termExtension: scenario.scenario.termExtensionYears,
    });
    if (seenSignatures.has(signature)) {
      continue;
    }
    seenSignatures.add(signature);
    candidates.push(scenario);
    if (candidates.length === 3) {
      break;
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  const maxScore = Math.max(...candidates.map((scenario) => scenario.score), 1);
  const maxRepayment = Math.max(
    ...candidates.map(
      (scenario) => scenario.firstYearMetrics.totalDebtRepayment,
    ),
    1,
  );
  const maxCoverage = Math.max(
    ...candidates.map(
      (scenario) => scenario.governmentProtectionMetrics.coverageRatio,
    ),
    1,
  );

  return candidates.map((scenario) => {
    const annualPayment = scenario.firstYearMetrics.totalDebtRepayment;
    const retainedCash = firstYearOperatingIncome.value - annualPayment;
    return {
      id: scenario.id,
      rank: scenario.rank,
      outcomeCode: scenario.outcomeCode,
      score: scenario.score,
      scoreWidth: (scenario.score / maxScore) * 100,
      annualPayment,
      annualPaymentWidth: (annualPayment / maxRepayment) * 100,
      retainedCash,
      retainedCashWidth:
        ((retainedCash + firstYearOperatingIncome.value) /
          Math.max(firstYearOperatingIncome.value * 2, 1)) *
        100,
      coverageRatio: scenario.governmentProtectionMetrics.coverageRatio,
      coverageWidth:
        (scenario.governmentProtectionMetrics.coverageRatio / maxCoverage) *
        100,
      isSelected: selectedScenario.value?.id === scenario.id,
      flags: scenarioPolicyFlags(scenario),
      actionBadges: Object.values(scenario.actionsByLoan).flat(),
      actionSummary: scenario.paymentScheduleByLoan
        .map(
          (loan) =>
            `${loan.loanId}: ${formatActions(loan.servicingActions) || 'No Change'}`,
        )
        .join(' | '),
    };
  });
});

const outcomeSeries = computed(() => {
  if (!recommendation.value || !results.value) {
    return [];
  }

  const baseline = results.value.summaryMetrics?.baseline ?? {
    firstYearRepayment: 0,
  };
  const scenario = selectedScenario.value ?? recommendation.value;
  const retainedCash =
    firstYearOperatingIncome.value -
    scenario.firstYearMetrics.totalDebtRepayment;
  const paymentReductionPercent =
    ((baseline.firstYearRepayment -
      scenario.firstYearMetrics.totalDebtRepayment) /
      Math.max(baseline.firstYearRepayment, 1)) *
    100;
  const availableCashRatio =
    (scenario.firstYearMetrics.cashAvailable /
      Math.max(firstYearOperatingIncome.value, 1)) *
    100;
  const nrvMaxBase = Math.max(totalCollateralValue.value, 1);

  return [
    {
      label: 'Cash flow margin',
      displayValue: `${Math.max(0, scenario.firstYearMetrics.cashFlowMargin * 100).toFixed(1)}%`,
      value: Math.max(0, scenario.firstYearMetrics.cashFlowMargin * 100),
      target: 10,
      max: 25,
      unit: '%',
      tone: 'teal',
    },
    {
      label: 'Coverage ratio',
      displayValue: `${scenario.governmentProtectionMetrics.coverageRatio.toFixed(2)}x`,
      value: scenario.governmentProtectionMetrics.coverageRatio,
      target: 1,
      max: 2,
      unit: 'x',
      tone: 'orange',
    },
    {
      label: 'Payment reduction',
      displayValue: `${Math.max(0, paymentReductionPercent).toFixed(1)}%`,
      value: Math.max(0, paymentReductionPercent),
      target: 0,
      max: 40,
      unit: '%',
      tone: 'navy',
    },
    {
      label: 'Cash retained after payment',
      displayValue: currencyCompact(retainedCash),
      value: Math.max(0, retainedCash),
      target: 0,
      max: Math.max(firstYearOperatingIncome.value, 1),
      unit: '$',
      tone: 'blue',
    },
    {
      label: 'Usable cash after reserve',
      displayValue: `${availableCashRatio.toFixed(1)}% of operating income`,
      value: Math.max(0, availableCashRatio),
      target: 90,
      max: 110,
      unit: '%',
      tone: 'teal',
    },
    {
      label: 'Net recovery value',
      displayValue: currencyCompact(
        scenario.governmentProtectionMetrics.netRecoveryValue,
      ),
      value: Math.max(0, scenario.governmentProtectionMetrics.netRecoveryValue),
      target: 0,
      max: nrvMaxBase,
      unit: '$',
      tone: 'navy',
    },
  ];
});

function assignModel(source) {
  model.case = clone(source.case);
  model.cashFlow = clone(source.cashFlow);
  model.existingLoans = clone(source.existingLoans);
  model.collateral = clone(source.collateral);
  model.liens = clone(source.liens);
  results.value = null;
  selectedScenarioId.value = '';
}

function applyPreset(presetId) {
  const preset = casePresets.value.find((item) => item.id === presetId);
  if (!preset) {
    return;
  }
  currentPresetId.value = preset.id;
  assignModel(preset.data);
}

async function loadDefaults() {
  loading.value = true;
  error.value = '';
  try {
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error('Unable to load configuration.');
    }
    const payload = await response.json();
    appMeta.value = payload.app;
    locationOptions.value = payload.locationOptions ?? {};
    referenceData.value = payload.referenceData ?? {};
    casePresets.value = payload.casePresets ?? [];
    policySummary.value = payload.policySummary ?? {};
    scenarioControls.value = payload.scenarioControls;
    const initialPreset = casePresets.value[0]?.id ?? '';
    if (initialPreset) {
      applyPreset(initialPreset);
    } else {
      assignModel(payload.sampleCase);
    }
  } catch (loadError) {
    error.value =
      loadError instanceof Error
        ? loadError.message
        : 'Failed to load configuration.';
  } finally {
    loading.value = false;
  }
}

async function runEvaluation() {
  submitting.value = true;
  error.value = '';
  try {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serializeModel()),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.errors?.join(' ') ?? 'Evaluation failed.');
    }
    results.value = payload;
    selectedScenarioId.value =
      payload.recommendedScenarioId ?? payload.scenarios[0]?.id ?? '';
    openSections.decision = true;
  } catch (submitError) {
    error.value =
      submitError instanceof Error ? submitError.message : 'Evaluation failed.';
  } finally {
    submitting.value = false;
  }
}

function toggleSection(sectionKey) {
  openSections[sectionKey] = !openSections[sectionKey];
}

function activateSection(sectionKey) {
  openSections[sectionKey] = true;
}

async function navigateToSection(sectionKey) {
  activateSection(sectionKey);
  await nextTick();
  document.getElementById(`section-${sectionKey}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function currencyCompact(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

function percent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

function ratePercent(value) {
  return `${(Number(value ?? 0) * 100).toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) {
    return '--';
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function yearsLabel(value) {
  return `${Number(value ?? 0)} ${Number(value ?? 0) === 1 ? 'year' : 'years'}`;
}

function lookupLabel(options, value) {
  return (
    options.find((option) => option.value === value)?.label ?? value ?? '--'
  );
}

function toDisplayText(value) {
  return String(value ?? '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLabel(value) {
  return toDisplayText(
    String(value ?? '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' '),
  );
}

function formatActionLabel(action) {
  const rawAction = String(action ?? '').trim();
  const amountMatch = rawAction.match(
    /^(writedown|support|conservation cancellation)\s+(-?\d+(?:\.\d+)?)$/i,
  );
  if (amountMatch) {
    return `${toDisplayText(amountMatch[1])} ${currency(Number(amountMatch[2]))}`;
  }
  return toDisplayText(rawAction);
}

function formatActions(actions) {
  return (actions ?? []).map((action) => formatActionLabel(action)).join(', ');
}

function scenarioPolicyFlags(scenario) {
  const flags = [];
  if (scenario.governmentProtectionMetrics?.writedownVsNrvRequired) {
    flags.push('Writedown Required');
  }
  if (scenario.governmentProtectionMetrics?.passesCoverageFloor === false) {
    flags.push('Coverage Floor Failed');
  }
  if (scenario.status === 'rejected') {
    flags.push('Review Needed');
  }
  if (
    scenario.status !== 'rejected' &&
    scenario.governmentProtectionMetrics?.coverageRatio < 1
  ) {
    flags.push('Review Needed');
  }
  return flags;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function barWidth(value, max = 160) {
  return `${Math.max(8, Math.min(max, value))}px`;
}

function graphPercent(value, max) {
  if (!max || max <= 0) {
    return '8%';
  }
  return `${Math.max(8, Math.min(100, (value / max) * 100))}%`;
}

function buildWorksheetMarkup() {
  if (!selectedScenario.value) {
    return '';
  }

  const summaryRows = calculationSummaryRows.value
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.category)}</td>
          <td><strong>${escapeHtml(row.metric)}</strong></td>
          <td>${escapeHtml(row.formula)}</td>
          <td><strong>${escapeHtml(row.value)}</strong></td>
        </tr>`,
    )
    .join('');

  const loanRows = loanCalculationRows.value
    .map(
      (row) => `
        <tr>
          <td><strong>${escapeHtml(row.loanId)}</strong></td>
          <td>${escapeHtml(row.currentRate)}</td>
          <td>${escapeHtml(row.proposedRate)}</td>
          <td>${escapeHtml(row.currentTerm)}</td>
          <td>${escapeHtml(row.proposedTerm)}</td>
          <td>${escapeHtml(row.currentPayment)}</td>
          <td>${escapeHtml(row.proposedPayment)}</td>
          <td>${escapeHtml(row.paymentChange)}</td>
          <td>${escapeHtml(row.actions)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(appMeta.value.title || 'A-STAR')} Worksheet</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 32px;
          color: #17334d;
        }
        h1, h2, h3, p {
          margin: 0 0 12px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 26px;
        }
        .meta-card {
          border: 1px solid #ccd7e2;
          border-radius: 12px;
          padding: 12px;
          background: #f8fafc;
        }
        .meta-card span {
          display: block;
          font-size: 12px;
          color: #5f7387;
          margin-bottom: 6px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        th, td {
          border: 1px solid #d7e1ea;
          padding: 10px 12px;
          text-align: left;
          vertical-align: top;
          font-size: 13px;
        }
        th {
          background: #edf6fd;
          color: #123b60;
        }
        .section-title {
          margin: 24px 0 12px;
        }
        @media print {
          body {
            margin: 12px;
          }
        }
      </style>
    </head>
    <body>
      <p>${escapeHtml(appMeta.value.description || 'Allocore Servicing Term Analysis and Recommendation')}</p>
      <h2 class="section-title">Lender Worksheet</h2>
      <div class="meta-grid">
        <div class="meta-card">
          <span>Borrower ID</span>
          <strong>${escapeHtml(model.case.borrowerId || '--')}</strong>
        </div>
        <div class="meta-card">
          <span>State / County</span>
          <strong>${escapeHtml(`${model.case.state || '--'} / ${model.case.county || '--'}`)}</strong>
        </div>
        <div class="meta-card">
          <span>Restructuring Date</span>
          <strong>${escapeHtml(formatDate(model.case.proposedServicingDate))}</strong>
        </div>
        <div class="meta-card">
          <span>Selected Scenario</span>
          <strong>${escapeHtml(`${selectedScenario.value.rank ? `#${selectedScenario.value.rank} ` : ''}${selectedScenario.value.outcomeCode}`)}</strong>
        </div>
      </div>
      <h3 class="section-title">Portfolio Calculation Detail</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Metric</th>
            <th>Formula / Basis</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>${summaryRows}</tbody>
      </table>
      <h3 class="section-title">Loan Calculation Detail</h3>
      <table>
        <thead>
          <tr>
            <th>Loan</th>

            <th>Current Rate</th>
            <th>Proposed Rate</th>
            <th>Current Term</th>
            <th>Proposed Term</th>
            <th>Current Payment</th>
            <th>Proposed Payment</th>
            <th>Payment Reduction</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${loanRows}</tbody>
      </table>
    </body>
  </html>`;
}

function exportWorksheet() {
  if (!selectedScenario.value) {
    return;
  }
  const printWindow = window.open(
    '',
    '_blank',
    'noopener,noreferrer,width=1200,height=900',
  );
  if (!printWindow) {
    error.value =
      'Unable to open printable worksheet. Please allow pop-ups and try again.';
    return;
  }
  printWindow.document.open();
  printWindow.document.write(buildWorksheetMarkup());
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function addExistingLoan() {
  model.existingLoans.push({
    loanId: `LN-${model.existingLoans.length + 1}`,
    fundCode: 'OL',
    loanType: 'operating',
    principal: 0,
    accruedInterest: 0,
    existingRate: 0.05,
    remainingTermYears: 5,
    firstYearPayment: 0,
    maxTermYears: 10,
    servicingAction: 'Y',
    paidInFull: false,
  });
}

function removeExistingLoan(index) {
  model.existingLoans.splice(index, 1);
}

function addCollateral() {
  model.collateral.push({
    propertyId: `COL-${model.collateral.length + 1}`,
    propertyType: 'CHL',
    description: '',
    marketValue: 0,
    recoverableValue: 0,
    monthlyIncome: 0,
    repairCost: 0,
    otherExpenseCost: 0,
  });
}

function removeCollateral(index) {
  model.collateral.splice(index, 1);
}

function addPriorLien() {
  model.liens.priorLiens.push({
    propertyId: model.collateral[0]?.propertyId ?? '',
    creditorName: '',
    creditorLoanNumber: '',
    totalDebtPriorToFsaLien: 0,
    lienRelationshipCode: 'PRIOR',
    filingDate: '',
    lienRank: 1,
  });
}

function removePriorLien(index) {
  model.liens.priorLiens.splice(index, 1);
}

function addPropertyLink() {
  model.liens.propertyLoanLinks.push({
    propertyId: model.collateral[0]?.propertyId ?? '',
    loanId: model.existingLoans[0]?.loanId ?? '',
    filingDate: '',
    lienRank: 1,
  });
}

function removePropertyLink(index) {
  model.liens.propertyLoanLinks.splice(index, 1);
}

onMounted(() => {
  loadDefaults();
});

watch(
  () => model.case.state,
  (nextState) => {
    const validCounties = locationOptions.value[nextState]?.counties ?? [];
    if (!validCounties.includes(model.case.county)) {
      model.case.county = validCounties[0] ?? '';
    }
  },
);
</script>

<template>
  <div class="workspace">
    <header class="topbar">
      <div class="topbar-copy">
        <img :src="headerLogo" alt="Application logo" class="topbar-logo" />
      </div>
      <div>
        <button
          class="primary-button topbar-button"
          :disabled="loading || submitting"
          @click="runEvaluation"
        >
          {{ submitting ? 'Running evaluation...' : 'Run decision engine' }}
        </button>
      </div>
    </header>

    <div class="workspace-shell">
      <aside class="sidebar">
        <div class="sidebar-card">
          <p class="sidebar-case">{{ model.case.borrowerId || 'Case' }}</p>
          <strong>{{
            recommendation ? 'Recommendation ready' : 'In Progress'
          }}</strong>
          <span
            >{{ model.case.state || '--' }} /
            {{ model.case.county || '--' }}</span
          >
        </div>

        <div class="sidebar-nav">
          <button
            v-for="item in navigationItems"
            :key="item.key"
            class="nav-item"
            :class="{ active: openSections[item.key] }"
            @click="navigateToSection(item.key)"
          >
            <span class="nav-dot"></span>
            <span class="nav-copy">
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </button>
        </div>

        <div class="sidebar-note">
          <span>Margin search</span>
          <strong
            >{{ scenarioControls.marginStartPercent ?? 10 }}% to
            {{ scenarioControls.marginEndPercent ?? 0 }}%</strong
          >
          <span
            >{{ scenarioControls.maxScenarioCount ?? '-' }} scenarios
            capped</span
          >
        </div>
      </aside>

      <main class="content-area">
        <p v-if="error" class="error-banner">{{ error }}</p>
        <p v-if="loading" class="loading-copy">Loading case...</p>

        <template v-else>
          <div class="prelude-header">
            <span class="page-heading"
              >Allocore - Servicing Term Analysis and Recommendation
              Engine</span
            >
          </div>
          <section class="briefing-panel chart-panel">
            <button
              class="accordion-header briefing-header"
              @click="toggleSection('briefing')"
            >
              <div>
                <span class="section-kicker">Case summary</span>
                <h2>Pre-decision briefing</h2>
              </div>
              <span>{{ openSections.briefing ? 'Collapse' : 'Expand' }}</span>
            </button>
            <div v-if="openSections.briefing" class="briefing-grid">
              <article
                v-for="section in briefingSections"
                :key="section.title"
                class="briefing-card"
              >
                <span>{{ section.title }}</span>
                <div class="briefing-detail-list">
                  <div
                    v-for="item in section.items"
                    :key="`${section.title}-${item.label}`"
                    class="briefing-detail-row"
                  >
                    <small>{{ item.label }}</small>
                    <div
                      v-if="Array.isArray(item.value)"
                      class="briefing-multiline"
                    >
                      <strong
                        v-for="line in item.value"
                        :key="`${section.title}-${item.label}-${line}`"
                      >
                        {{ line }}
                      </strong>
                    </div>
                    <strong v-else>{{ item.value }}</strong>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section id="section-decision" class="decision-top">
            <article class="decision-card">
              <div class="decision-header">
                <div>
                  <span class="section-kicker">Decision</span>
                  <h2>
                    {{
                      recommendation
                        ? recommendation.outcomeCode
                        : 'No recommendation yet'
                    }}
                  </h2>
                  <p>
                    {{
                      recommendation
                        ? recommendation.explanation
                        : 'Run the engine to generate ranked servicing options and compare outcomes.'
                    }}
                  </p>
                </div>
                <div class="score-pill">
                  <span>Score</span>
                  <strong>{{ recommendation?.score ?? '--' }}</strong>
                </div>
              </div>

              <div v-if="recommendation" class="decision-metrics">
                <div class="decision-metric">
                  <span>Active case</span>
                  <strong>{{
                    casePresets.find((preset) => preset.id === currentPresetId)
                      ?.label ?? 'Manual'
                  }}</strong>
                </div>
                <div class="decision-metric">
                  <span>Restructuring date</span>
                  <strong>{{
                    formatDate(model.case.proposedServicingDate)
                  }}</strong>
                </div>
                <div class="decision-metric">
                  <span>Current payment amount</span>
                  <strong>{{
                    currencyCompact(currentFirstYearPaymentAmount)
                  }}</strong>
                </div>
                <div class="decision-metric">
                  <span>Recommended payment amount</span>
                  <strong>{{
                    currencyCompact(recommendedFirstYearPaymentAmount)
                  }}</strong>
                </div>
                <div class="decision-metric">
                  <span>Operating income / cash flow</span>
                  <strong>{{
                    currencyCompact(firstYearOperatingIncome)
                  }}</strong>
                </div>
                <div class="decision-metric">
                  <span>Operating income vs recommended payment</span>
                  <strong>{{ currencyCompact(recommendedPaymentGap) }}</strong>
                </div>
              </div>
            </article>

            <article class="chart-panel">
              <header class="mini-header">
                <h3>Outcome graph</h3>
                <span
                  >Selected scenario across affordability and protection
                  measures</span
                >
              </header>
              <div v-if="outcomeSeries.length > 0" class="outcome-graph">
                <div
                  v-for="item in outcomeSeries"
                  :key="item.label"
                  class="graph-row"
                >
                  <div class="graph-labels">
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.displayValue }}</span>
                  </div>
                  <div class="graph-track">
                    <div
                      class="graph-target"
                      :style="{ left: graphPercent(item.target, item.max) }"
                    ></div>
                    <div
                      class="graph-bar"
                      :class="item.tone"
                      :style="{ width: graphPercent(item.value, item.max) }"
                    ></div>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section
            v-if="pipelineCounts.length > 0"
            class="comparison-panel chart-panel full-width-card"
          >
            <header class="mini-header">
              <h3>Pipeline counts</h3>
              <span
                >How many paths were generated, screened, and recommended</span
              >
            </header>
            <div class="pipeline-grid">
              <div
                v-for="item in pipelineCounts"
                :key="item.label"
                class="metric-tile pipeline-tile"
              >
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </section>

          <section
            v-if="topScenarioComparisons.length > 0"
            class="comparison-panel chart-panel full-width-card"
          >
            <header class="mini-header">
              <h3>Recommendation comparison</h3>
              <span>Top 3 ranked paths shown side by side</span>
            </header>
            <div class="scenario-comparison-layout">
              <button
                v-for="scenario in topScenarioComparisons"
                :key="scenario.id"
                class="scenario-compare-card"
                :class="{ active: scenario.isSelected }"
                @click="selectedScenarioId = scenario.id"
              >
                <div class="scenario-compare-head">
                  <div>
                    <strong
                      >#{{ scenario.rank }} {{ scenario.outcomeCode }}</strong
                    >
                    <span class="ml-2">
                      &nbsp;{{ scenario.actionSummary }}</span
                    >
                  </div>
                  <strong>{{ scenario.score }}</strong>
                </div>
                <div class="tag-row">
                  <span
                    v-for="badge in scenario.actionBadges"
                    :key="`${scenario.id}-${badge}`"
                    class="action-badge"
                  >
                    {{ formatActionLabel(badge) }}
                  </span>
                  <span
                    v-for="flag in scenario.flags"
                    :key="`${scenario.id}-${flag}`"
                    class="action-badge flag"
                  >
                    {{ flag }}
                  </span>
                </div>
                <div class="scenario-compare-grid">
                  <div class="scenario-compare-metric">
                    <span>Score</span>
                    <strong>{{ scenario.score }}</strong>
                    <div class="mini-track">
                      <div
                        class="mini-bar navy"
                        :style="{ width: `${scenario.scoreWidth}%` }"
                      ></div>
                    </div>
                  </div>
                  <div class="scenario-compare-metric">
                    <span>Annual payment</span>
                    <strong>{{
                      currencyCompact(scenario.annualPayment)
                    }}</strong>
                    <div class="mini-track">
                      <div
                        class="mini-bar orange"
                        :style="{ width: `${scenario.annualPaymentWidth}%` }"
                      ></div>
                    </div>
                  </div>
                  <div class="scenario-compare-metric">
                    <span>Cash retained</span>
                    <strong>{{
                      currencyCompact(scenario.retainedCash)
                    }}</strong>
                    <div class="mini-track">
                      <div
                        class="mini-bar teal"
                        :style="{ width: `${scenario.retainedCashWidth}%` }"
                      ></div>
                    </div>
                  </div>
                  <div class="scenario-compare-metric">
                    <span>Coverage ratio</span>
                    <strong>{{ scenario.coverageRatio.toFixed(2) }}x</strong>
                    <div class="mini-track">
                      <div
                        class="mini-bar blue"
                        :style="{ width: `${scenario.coverageWidth}%` }"
                      ></div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <section v-if="results" class="decision-top secondary">
            <article class="chart-panel">
              <header class="mini-header">
                <h3>Ranked alternatives</h3>
                <span>Lender can still choose from the ranked set</span>
              </header>
              <div class="scenario-list">
                <div class="scenario-button baseline-row">
                  <div>
                    <strong>{{ baselineScenarioRow.label }}</strong>
                    <span>{{ baselineScenarioRow.description }}</span>
                  </div>
                  <div class="scenario-stats">
                    <strong>{{
                      currencyCompact(baselineScenarioRow.annualPayment)
                    }}</strong>
                    <span>{{
                      currencyCompact(baselineScenarioRow.cashMargin)
                    }}</span>
                  </div>
                </div>
                <button
                  v-for="scenario in results.scenarios"
                  :key="scenario.id"
                  class="scenario-button"
                  :class="{
                    active:
                      selectedScenario && selectedScenario.id === scenario.id,
                  }"
                  @click="selectedScenarioId = scenario.id"
                >
                  <div>
                    <strong
                      >#{{ scenario.rank }} {{ scenario.outcomeCode }}</strong
                    >
                    <span>{{ scenario.rationale }}</span>
                    <div class="tag-row compact">
                      <span
                        v-for="flag in scenarioPolicyFlags(scenario)"
                        :key="`${scenario.id}-${flag}`"
                        class="action-badge flag"
                      >
                        {{ flag }}
                      </span>
                    </div>
                  </div>
                  <div class="scenario-stats">
                    <strong>{{ scenario.score }}</strong>
                    <span>{{
                      percent(scenario.firstYearMetrics.cashFlowMargin)
                    }}</span>
                  </div>
                </button>
              </div>
            </article>

            <article v-if="selectedScenario" class="chart-panel">
              <header class="mini-header">
                <h3>Recommended actions by loan</h3>
                <span>{{ selectedScenario.id }}</span>
              </header>
              <div class="metric-grid">
                <div class="metric-tile">
                  <span>Writedown</span>
                  <strong>{{
                    currency(selectedScenario.scenario.writedownAmount)
                  }}</strong>
                </div>
                <div class="metric-tile">
                  <span>Support</span>
                  <strong>{{
                    currency(
                      selectedScenario.scenario.conservationSupportAmount,
                    )
                  }}</strong>
                </div>
                <div class="metric-tile">
                  <span>Coverage ratio</span>
                  <strong>{{
                    selectedScenario.governmentProtectionMetrics.coverageRatio
                  }}</strong>
                </div>
                <div class="metric-tile">
                  <span>Selected actions</span>
                  <strong>{{
                    Object.values(selectedScenario.actionsByLoan).flat().length
                  }}</strong>
                </div>
              </div>
              <div class="record-stack compact">
                <article
                  v-for="loan in recommendedLoanCards"
                  :key="loan.loanId"
                  class="record-card tone-soft"
                >
                  <div class="record-card-head">
                    <h4>{{ loan.loanId }}</h4>
                    <span>{{ loan.loanType }}</span>
                  </div>
                  <div class="loan-recommendation-grid">
                    <div class="loan-recommendation-row">
                      <small>Recommended actions</small>
                      <strong>{{
                        formatActions(loan.actions) || 'No Change'
                      }}</strong>
                    </div>
                    <div class="loan-recommendation-row">
                      <small>Current vs proposed term</small>
                      <strong
                        >{{ yearsLabel(loan.currentTermYears) }} ->
                        {{ yearsLabel(loan.recommendedTermYears) }}</strong
                      >
                    </div>
                    <div class="loan-recommendation-row">
                      <small>Current vs proposed rate</small>
                      <strong
                        >{{ ratePercent(loan.currentRate) }} ->
                        {{ ratePercent(loan.recommendedRate) }}</strong
                      >
                    </div>
                    <div class="loan-recommendation-row">
                      <small>Current vs proposed annual payment</small>
                      <strong
                        >{{ currency(loan.currentFirstYearPayment) }} ->
                        {{ currency(loan.recommendedFirstYearPayment) }}</strong
                      >
                    </div>
                  </div>
                </article>
              </div>
              <p v-if="selectedScenario.rejectionReason" class="rejection-copy">
                {{ selectedScenario.rejectionReason }}
              </p>
            </article>
          </section>

          <section v-if="selectedScenario" class="comparison-panel chart-panel">
            <header class="mini-header">
              <h3>Current vs recommended loan terms</h3>
              <span>
                Restructuring date:
                {{ formatDate(model.case.proposedServicingDate) }}
              </span>
            </header>
            <div class="comparison-grid">
              <div class="comparison-summary">
                <div class="metric-tile">
                  <span>Operating income / cash flow</span>
                  <strong>{{
                    currencyCompact(firstYearOperatingIncome)
                  }}</strong>
                </div>
                <div class="metric-tile">
                  <span>Current payment amount</span>
                  <strong>{{
                    currencyCompact(currentFirstYearPaymentAmount)
                  }}</strong>
                </div>
                <div class="metric-tile">
                  <span>Recommended payment amount</span>
                  <strong>{{
                    currencyCompact(recommendedFirstYearPaymentAmount)
                  }}</strong>
                </div>
                <div class="metric-tile">
                  <span>Income minus current payment</span>
                  <strong>{{ currencyCompact(currentPaymentGap) }}</strong>
                </div>
                <div class="metric-tile">
                  <span>Income minus recommended payment</span>
                  <strong>{{ currencyCompact(recommendedPaymentGap) }}</strong>
                </div>
                <div class="metric-tile">
                  <span>Debt margin reserve</span>
                  <strong
                    >{{
                      Number(model.case.debtMarginPercent ?? 0).toFixed(0)
                    }}%</strong
                  >
                </div>
              </div>

              <div class="comparison-table-wrap">
                <table class="comparison-table">
                  <thead>
                    <tr>
                      <th>Loan</th>
                      <th>Current rate</th>
                      <th>Rec. rate</th>
                      <th>Current term</th>
                      <th>Rec. term</th>
                      <th>Current annual</th>
                      <th>Rec. annual</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in loanComparisonRows" :key="row.loanId">
                      <td>
                        <strong>{{ row.loanId }}</strong>
                      </td>
                      <td>{{ ratePercent(row.currentRate) }}</td>
                      <td>{{ ratePercent(row.recommendedRate) }}</td>
                      <td>{{ yearsLabel(row.currentTermYears) }}</td>
                      <td>{{ yearsLabel(row.recommendedTermYears) }}</td>
                      <td>{{ currency(row.currentFirstYearPayment) }}</td>
                      <td>{{ currency(row.recommendedFirstYearPayment) }}</td>
                      <td>{{ formatActions(row.actions) || 'No Change' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section
            v-if="selectedScenario"
            class="comparison-panel chart-panel full-width-card worksheet-card"
          >
            <header class="mini-header worksheet-header">
              <div>
                <h3>Calculation detail worksheet</h3>
                <span
                  >Line-by-line view of how the selected recommendation is
                  derived</span
                >
              </div>
              <button
                class="primary-button worksheet-button"
                @click="exportWorksheet"
              >
                Print worksheet
              </button>
            </header>
            <div class="comparison-table-wrap">
              <table class="comparison-table calculation-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Metric</th>
                    <th>Formula / basis</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in calculationSummaryRows"
                    :key="`${row.category}-${row.metric}`"
                  >
                    <td>{{ row.category }}</td>
                    <td>
                      <strong>{{ row.metric }}</strong>
                    </td>
                    <td>{{ row.formula }}</td>
                    <td>
                      <strong>{{ row.value }}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="accordion-list">
            <article id="section-borrower" class="accordion-panel">
              <button
                class="accordion-header"
                @click="toggleSection('borrower')"
              >
                <div>
                  <span class="section-kicker">Case setup</span>
                  <h2>Borrower / case</h2>
                </div>
                <span>{{ openSections.borrower ? 'Collapse' : 'Expand' }}</span>
              </button>
              <div v-if="openSections.borrower" class="accordion-body">
                <div class="field-grid four-columns">
                  <label>
                    Case preset
                    <select
                      :value="currentPresetId"
                      @change="applyPreset($event.target.value)"
                    >
                      <option
                        v-for="preset in casePresets"
                        :key="preset.id"
                        :value="preset.id"
                      >
                        {{ preset.label }}
                      </option>
                    </select>
                  </label>
                  <label>
                    Borrower ID
                    <input v-model="model.case.borrowerId" />
                  </label>
                  <label>
                    Borrower type
                    <select v-model="model.case.borrowerType">
                      <option
                        v-for="option in borrowerTypeOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </label>
                  <label>
                    State
                    <select v-model="model.case.state">
                      <option
                        v-for="[code, state] in stateOptions"
                        :key="code"
                        :value="code"
                      >
                        {{ code }} - {{ state.label }}
                      </option>
                    </select>
                  </label>
                  <label>
                    County
                    <select v-model="model.case.county">
                      <option
                        v-for="county in countyOptions"
                        :key="county"
                        :value="county"
                      >
                        {{ county }}
                      </option>
                    </select>
                  </label>
                  <label>
                    Proposed servicing date
                    <input
                      v-model="model.case.proposedServicingDate"
                      type="date"
                    />
                  </label>
                  <label>
                    Debt margin (%)
                    <input
                      v-model.number="model.case.debtMarginPercent"
                      type="number"
                      min="0"
                      max="50"
                    />
                  </label>
                  <label>
                    First payment due
                    <input
                      v-model="model.case.firstPaymentDueDate"
                      type="date"
                    />
                  </label>
                  <label>
                    Conservation acres
                    <input
                      v-model.number="model.case.conservationAcres"
                      type="number"
                      min="0"
                    />
                  </label>
                </div>
              </div>
            </article>

            <article id="section-cashFlow" class="accordion-panel">
              <button
                class="accordion-header"
                @click="toggleSection('cashFlow')"
              >
                <div>
                  <span class="section-kicker">Repayment capacity</span>
                  <h2>Cash flow</h2>
                </div>
                <span>{{ openSections.cashFlow ? 'Collapse' : 'Expand' }}</span>
              </button>
              <div v-if="openSections.cashFlow" class="accordion-body">
                <div class="inner-panel">
                  <h3>Annual operating view</h3>
                  <div class="field-grid">
                    <label>
                      Balance available
                      <input
                        v-model.number="
                          model.cashFlow.firstYear.balanceAvailable
                        "
                        type="number"
                        min="0"
                      />
                    </label>
                    <label>
                      Operating expense
                      <input
                        v-model.number="
                          model.cashFlow.firstYear.operatingExpense
                        "
                        type="number"
                        min="0"
                      />
                    </label>
                    <label>
                      Operating interest
                      <input
                        v-model.number="
                          model.cashFlow.firstYear.operatingInterestExpense
                        "
                        type="number"
                        min="0"
                      />
                    </label>
                    <label>
                      Owner withdrawals
                      <input
                        v-model.number="
                          model.cashFlow.firstYear.ownerWithdrawals
                        "
                        type="number"
                        min="0"
                      />
                    </label>
                    <label>
                      Non-agency debt + taxes
                      <input
                        v-model.number="
                          model.cashFlow.firstYear.nonAgencyDebtAndTaxes
                        "
                        type="number"
                        min="0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </article>

            <article id="section-existingLoans" class="accordion-panel">
              <button
                class="accordion-header"
                @click="toggleSection('existingLoans')"
              >
                <div>
                  <span class="section-kicker">Debt inventory</span>
                  <h2>Existing loans</h2>
                </div>
                <span>{{
                  openSections.existingLoans ? 'Collapse' : 'Expand'
                }}</span>
              </button>
              <div v-if="openSections.existingLoans" class="accordion-body">
                <div class="section-actions">
                  <span>{{ model.existingLoans.length }} loans</span>
                  <button class="ghost-button" @click="addExistingLoan">
                    Add loan
                  </button>
                </div>
                <div class="record-stack">
                  <article
                    v-for="(loan, index) in model.existingLoans"
                    :key="`${loan.loanId}-${index}`"
                    class="record-card"
                  >
                    <div class="record-card-head">
                      <div>
                        <h3>{{ loan.loanId || `Loan ${index + 1}` }}</h3>
                        <span>{{
                          lookupLabel(loanTypeOptions, loan.loanType)
                        }}</span>
                      </div>
                      <button
                        class="ghost-button destructive"
                        @click="removeExistingLoan(index)"
                      >
                        Remove
                      </button>
                    </div>
                    <div class="loan-summary-row">
                      <div class="loan-summary-chip">
                        <span>Loan type</span>
                        <strong>{{
                          lookupLabel(loanTypeOptions, loan.loanType)
                        }}</strong>
                      </div>
                      <div class="loan-summary-chip">
                        <span>Remaining term</span>
                        <strong>{{
                          yearsLabel(loan.remainingTermYears || 0)
                        }}</strong>
                      </div>
                      <div class="loan-summary-chip">
                        <span>Payment amount</span>
                        <strong>{{
                          currencyCompact(loan.firstYearPayment)
                        }}</strong>
                      </div>
                      <div class="loan-summary-chip">
                        <span>Total outstanding</span>
                        <strong>{{
                          currencyCompact(
                            Number(loan.principal ?? 0) +
                              Number(loan.accruedInterest ?? 0),
                          )
                        }}</strong>
                      </div>
                    </div>
                    <div class="field-grid four-columns">
                      <label>
                        Fund code
                        <input v-model="loan.fundCode" />
                      </label>
                      <label>
                        Loan ID
                        <input v-model="loan.loanId" />
                      </label>
                      <label>
                        Loan type
                        <select v-model="loan.loanType">
                          <option
                            v-for="option in loanTypeOptions"
                            :key="option.value"
                            :value="option.value"
                          >
                            {{ option.label }}
                          </option>
                        </select>
                      </label>
                      <label>
                        Principal
                        <input
                          v-model.number="loan.principal"
                          type="number"
                          min="0"
                        />
                      </label>
                      <label>
                        Accrued interest
                        <input
                          v-model.number="loan.accruedInterest"
                          type="number"
                          min="0"
                        />
                      </label>
                      <label>
                        Existing rate
                        <input
                          v-model.number="loan.existingRate"
                          type="number"
                          step="0.001"
                          min="0"
                        />
                      </label>
                      <label>
                        Remaining term
                        <input
                          v-model.number="loan.remainingTermYears"
                          type="number"
                          min="1"
                        />
                      </label>
                      <label>
                        First-year payment
                        <input
                          v-model.number="loan.firstYearPayment"
                          type="number"
                          min="0"
                        />
                      </label>
                    </div>
                  </article>
                </div>
              </div>
            </article>

            <article id="section-collateral" class="accordion-panel">
              <button
                class="accordion-header"
                @click="toggleSection('collateral')"
              >
                <div>
                  <span class="section-kicker">Recovery assumptions</span>
                  <h2>Collateral</h2>
                </div>
                <span>{{
                  openSections.collateral ? 'Collapse' : 'Expand'
                }}</span>
              </button>
              <div v-if="openSections.collateral" class="accordion-body">
                <div class="section-actions">
                  <span>{{ model.collateral.length }} collateral records</span>
                  <button class="ghost-button" @click="addCollateral">
                    Add collateral
                  </button>
                </div>
                <div class="record-stack">
                  <article
                    v-for="(item, index) in model.collateral"
                    :key="`${item.propertyId}-${index}`"
                    class="record-card"
                  >
                    <div class="record-card-head">
                      <div>
                        <h3>
                          {{ item.propertyId || `Collateral ${index + 1}` }}
                        </h3>
                        <span>{{
                          lookupLabel(collateralTypeOptions, item.propertyType)
                        }}</span>
                      </div>
                      <button
                        class="ghost-button destructive"
                        @click="removeCollateral(index)"
                      >
                        Remove
                      </button>
                    </div>
                    <div class="loan-summary-row">
                      <div class="loan-summary-chip">
                        <span>Market value</span>
                        <strong>{{ currencyCompact(item.marketValue) }}</strong>
                      </div>
                      <div class="loan-summary-chip">
                        <span>Recoverable value</span>
                        <strong>{{
                          currencyCompact(item.recoverableValue)
                        }}</strong>
                      </div>
                    </div>
                    <div class="field-grid four-columns">
                      <label>
                        Property ID
                        <input v-model="item.propertyId" />
                      </label>
                      <label>
                        Property type
                        <select v-model="item.propertyType">
                          <option
                            v-for="option in collateralTypeOptions"
                            :key="option.value"
                            :value="option.value"
                          >
                            {{ option.label }}
                          </option>
                        </select>
                      </label>
                      <label>
                        Description
                        <input v-model="item.description" />
                      </label>
                      <label>
                        Market value
                        <input
                          v-model.number="item.marketValue"
                          type="number"
                          min="0"
                        />
                      </label>
                      <label>
                        Recoverable value
                        <input
                          v-model.number="item.recoverableValue"
                          type="number"
                          min="0"
                        />
                      </label>
                      <label>
                        Monthly income
                        <input
                          v-model.number="item.monthlyIncome"
                          type="number"
                          min="0"
                        />
                      </label>
                      <label>
                        Repair cost
                        <input
                          v-model.number="item.repairCost"
                          type="number"
                          min="0"
                        />
                      </label>
                      <label>
                        Other expense
                        <input
                          v-model.number="item.otherExpenseCost"
                          type="number"
                          min="0"
                        />
                      </label>
                    </div>
                  </article>
                </div>
              </div>
            </article>

            <article id="section-liens" class="accordion-panel">
              <button class="accordion-header" @click="toggleSection('liens')">
                <div>
                  <span class="section-kicker">Security mapping</span>
                  <h2>Liens & security</h2>
                </div>
                <span>{{ openSections.liens ? 'Collapse' : 'Expand' }}</span>
              </button>
              <div v-if="openSections.liens" class="accordion-body">
                <div class="split-columns">
                  <div class="inner-panel">
                    <div class="section-actions">
                      <span>Property / loan links</span>
                      <button class="ghost-button" @click="addPropertyLink">
                        Add link
                      </button>
                    </div>
                    <div class="record-stack compact">
                      <article
                        v-for="(link, index) in model.liens.propertyLoanLinks"
                        :key="`${link.propertyId}-${link.loanId}-${index}`"
                        class="record-card compact"
                      >
                        <div class="record-card-head">
                          <h4>Link {{ index + 1 }}</h4>
                          <button
                            class="ghost-button destructive"
                            @click="removePropertyLink(index)"
                          >
                            Remove
                          </button>
                        </div>
                        <div class="field-grid">
                          <label>
                            Property ID
                            <input v-model="link.propertyId" />
                          </label>
                          <label>
                            Loan ID
                            <input v-model="link.loanId" />
                          </label>
                          <label>
                            Filing date
                            <input v-model="link.filingDate" type="date" />
                          </label>
                          <label>
                            Lien rank
                            <input
                              v-model.number="link.lienRank"
                              type="number"
                              min="1"
                            />
                          </label>
                        </div>
                      </article>
                    </div>
                  </div>

                  <div class="inner-panel">
                    <div class="section-actions">
                      <span>Prior liens</span>
                      <button class="ghost-button" @click="addPriorLien">
                        Add prior lien
                      </button>
                    </div>
                    <div class="record-stack compact">
                      <article
                        v-for="(lien, index) in model.liens.priorLiens"
                        :key="`${lien.propertyId}-${index}`"
                        class="record-card compact"
                      >
                        <div class="record-card-head">
                          <h4>Prior lien {{ index + 1 }}</h4>
                          <button
                            class="ghost-button destructive"
                            @click="removePriorLien(index)"
                          >
                            Remove
                          </button>
                        </div>
                        <div class="field-grid">
                          <label>
                            Property ID
                            <input v-model="lien.propertyId" />
                          </label>
                          <label>
                            Creditor
                            <input v-model="lien.creditorName" />
                          </label>
                          <label>
                            Prior debt
                            <input
                              v-model.number="lien.totalDebtPriorToFsaLien"
                              type="number"
                              min="0"
                            />
                          </label>
                          <label>
                            Filing date
                            <input v-model="lien.filingDate" type="date" />
                          </label>
                        </div>
                      </article>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article id="section-policy" class="accordion-panel">
              <button class="accordion-header" @click="toggleSection('policy')">
                <div>
                  <span class="section-kicker">Engine settings</span>
                  <h2>Policy snapshot</h2>
                </div>
                <span>{{ openSections.policy ? 'Collapse' : 'Expand' }}</span>
              </button>
              <div v-if="openSections.policy" class="accordion-body">
                <div class="briefing-grid">
                  <article
                    v-for="card in policyCards"
                    :key="card.title"
                    class="briefing-card"
                  >
                    <span>{{ card.title }}</span>
                    <div class="briefing-detail-list">
                      <div
                        v-for="row in card.rows"
                        :key="`${card.title}-${row.label}`"
                        class="briefing-detail-row"
                      >
                        <small>{{ row.label }}</small>
                        <strong>{{ row.value }}</strong>
                      </div>
                    </div>
                  </article>
                </div>
              </div>
            </article>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  background: #dfe5eb;
  color: #0f1c2e;
  font-family: 'Avenir Next', 'Segoe UI', 'Helvetica Neue', sans-serif;
}

:global(*) {
  box-sizing: border-box;
}

button,
input,
select {
  font: inherit;
}

.workspace {
  min-height: 100vh;
  background: #dfe5eb;
}

.topbar {
  min-height: 74px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 0 28px;
  background: #f8fafc;
  border-bottom: 1px solid #c8d3df;
}

.topbar-copy {
  display: flex;
  align-items: center;
  gap: 14px;
}

.topbar-copy strong {
  color: #123d67;
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  line-height: 1;
}

.topbar-logo {
  width: 170px;
  height: 40px;
  object-fit: contain;
}

.workspace-shell {
  display: grid;
  grid-template-columns: 295px minmax(0, 1fr);
  min-height: calc(100vh - 108px);
}

.sidebar {
  background: linear-gradient(180deg, #033a67, #022c50 100%);
  color: #f4f8fb;
  padding: 0px 0 0px;
}

.sidebar-card,
.sidebar-note {
  margin: 20px 20px 20px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.sidebar-case {
  margin: 0 0 6px;
  color: #b9d7ec;
  font-size: 0.84rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar-card strong,
.sidebar-note strong {
  display: block;
  font-size: 1.15rem;
  margin-bottom: 8px;
}

.sidebar-card span,
.sidebar-note span {
  display: block;
  color: #d0e3f2;
  font-size: 0.92rem;
}

.sidebar-nav {
  display: grid;
}

.nav-item {
  border: 0;
  border-top: 1px solid rgba(195, 215, 232, 0.18);
  padding: 18px 20px;
  background: transparent;
  color: #edf5fb;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.nav-item.active {
  background: rgba(42, 135, 214, 0.32);
}

.nav-copy {
  display: grid;
  gap: 2px;
}

.nav-copy strong {
  color: #edf5fb;
  font-size: 0.98rem;
}

.nav-copy small {
  color: #b9d2e5;
  font-size: 0.8rem;
  font-weight: 500;
}

.nav-dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #24dd6f;
  flex: 0 0 auto;
}

.content-area {
  padding: 32px 28px 48px;
}

.prelude-header {
  margin-bottom: 12px;
}

.section-kicker {
  margin: 0 0 8px;
  color: #0c4a76;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.page-heading {
  margin: 0 0 28px;
  color: #0c4a76;
  font-size: 2rem;
  font-weight: 700;
}

.primary-button,
.ghost-button {
  border-radius: 12px;
  cursor: pointer;
  transition: 140ms ease;
}

.primary-button {
  border: 0;
  min-width: 220px;
  padding: 14px 18px;
  background: linear-gradient(180deg, #0d5d96, #083f68);
  color: #f7fbff;
  font-weight: 700;
}

.topbar-button {
  min-width: 210px;
}

.primary-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.ghost-button {
  border: 1px solid #adc1d4;
  padding: 9px 14px;
  background: #fff;
  color: #0d3e68;
  font-weight: 600;
}

.ghost-button.destructive {
  color: #b53d2f;
}

.error-banner,
.loading-copy {
  margin: 0 0 18px;
  padding: 14px 16px;
  border-radius: 14px;
}

.error-banner {
  background: #fbe7e5;
  color: #9e3124;
}

.loading-copy {
  background: #e9f1f8;
  color: #34566f;
}

.decision-top {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 20px;
  margin-bottom: 20px;
}

.decision-top.secondary {
  grid-template-columns: 0.9fr 1.1fr;
}

.decision-card,
.chart-panel,
.accordion-panel,
.inner-panel,
.record-card {
  background: #f8fafc;
  border: 1px solid #ccd7e2;
  border-radius: 18px;
  box-shadow: 0 14px 34px rgba(8, 45, 76, 0.06);
}

.decision-card,
.chart-panel {
  padding: 22px;
}

.decision-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.decision-header h2,
.mini-header h3,
.accordion-header h2,
.record-card h3,
.record-card h4 {
  margin: 0;
}

.loan-recommendation-grid {
  display: grid;
  gap: 10px;
}

.loan-recommendation-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid #d7e1ea;
}

.loan-recommendation-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.loan-recommendation-row small {
  color: #6c8397;
  font-size: 0.82rem;
  font-weight: 600;
}

.decision-header p {
  margin: 8px 0 0;
  color: #516779;
  line-height: 1.6;
}

.score-pill {
  min-width: 120px;
  padding: 14px;
  border-radius: 14px;
  background: #0b3d68;
  color: #f7fbff;
  display: grid;
  align-content: start;
}

.score-pill span {
  color: #bcd3e5;
  font-size: 0.84rem;
}

.score-pill strong {
  font-size: 2rem;
  line-height: 1;
}

.decision-metrics,
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.decision-metric,
.metric-tile {
  padding: 14px;
  border-radius: 14px;
  background: #eef4f9;
}

.decision-metric span,
.metric-tile span,
.mini-header span,
.record-card span,
.graph-labels span,
.scenario-button span,
label {
  display: block;
  color: #293c4f;
  font-size: 0.86rem;
  font-weight: 550;
}

.decision-metric strong,
.metric-tile strong {
  color: #123b60;
  font-size: 1.1rem;
}

.mini-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
  margin-bottom: 16px;
}

.outcome-graph {
  display: grid;
  gap: 18px;
}

.full-width-card {
  margin-bottom: 20px;
}

.pipeline-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.pipeline-tile strong {
  font-size: 1.6rem;
}

.worksheet-card {
  border-color: #c4d3e0;
}

.worksheet-header {
  align-items: center;
}

.worksheet-button {
  white-space: nowrap;
}

.scenario-comparison-layout {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.graph-row {
  display: grid;
  gap: 8px;
}

.graph-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.graph-track {
  position: relative;
  height: 14px;
  border-radius: 999px;
  background: #e3ebf3;
  overflow: hidden;
}

.graph-bar {
  height: 100%;
  border-radius: 999px;
}

.graph-bar.teal {
  background: linear-gradient(90deg, #1e8a92, #52d0bd);
}

.graph-bar.blue {
  background: linear-gradient(90deg, #0b578e, #3e8fd4);
}

.graph-bar.orange {
  background: linear-gradient(90deg, #d96533, #ff8a45);
}

.graph-bar.navy {
  background: linear-gradient(90deg, #042d51, #165d8e);
}

.graph-target {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: rgba(255, 90, 42, 0.9);
}

.scenario-compare-card {
  border: 1px solid #d2dde8;
  border-radius: 14px;
  padding: 16px;
  background: #fff;
  display: grid;
  gap: 14px;
  text-align: left;
  cursor: pointer;
}

.scenario-compare-card.active {
  border-color: #1a6fb0;
  background: #edf6fd;
}

.scenario-compare-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.scenario-compare-head strong {
  color: #0e365a;
}

.scenario-compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-row.compact {
  margin-top: 8px;
}

.action-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: #edf6fd;
  border: 1px solid #c7d8e7;
  color: #123b60;
  font-size: 0.75rem;
  font-weight: 700;
}

.action-badge.flag {
  background: #fff1e8;
  border-color: #f0c2a8;
  color: #8a421c;
}

.scenario-compare-metric {
  display: grid;
  gap: 6px;
}

.scenario-compare-metric strong {
  color: #123b60;
  font-size: 0.95rem;
}

.mini-track {
  height: 10px;
  border-radius: 999px;
  background: #e3ebf3;
  overflow: hidden;
}

.mini-bar {
  height: 100%;
  border-radius: 999px;
}

.mini-bar.teal {
  background: linear-gradient(90deg, #1e8a92, #52d0bd);
}

.mini-bar.blue {
  background: linear-gradient(90deg, #0b578e, #3e8fd4);
}

.mini-bar.orange {
  background: linear-gradient(90deg, #d96533, #ff8a45);
}

.mini-bar.navy {
  background: linear-gradient(90deg, #042d51, #165d8e);
}

.scenario-list,
.record-stack,
.accordion-list {
  display: grid;
  gap: 14px;
}

.baseline-row {
  cursor: default;
  background: #f7fafc;
}

.briefing-panel {
  margin-bottom: 20px;
}

.briefing-header {
  width: 100%;
  margin-bottom: 18px;
}

.briefing-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.briefing-card {
  padding: 18px;
  border-radius: 14px;
  background: #eef4f9;
  border: 1px solid #d4dee7;
}

.briefing-card span {
  display: block;
  margin-bottom: 8px;
  color: #4b6880;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.briefing-detail-list {
  display: grid;
  gap: 10px;
}

.briefing-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid #d6e0e9;
}

.briefing-detail-row:first-child {
  padding-top: 0;
  border-top: 0;
}

.briefing-detail-row small {
  color: #6b8195;
  font-size: 0.82rem;
  font-weight: 600;
}

.briefing-detail-row strong {
  color: #143b5f;
  font-size: 1rem;
  line-height: 1.4;
  text-align: right;
  max-width: 60%;
}

.briefing-multiline {
  display: grid;
  gap: 6px;
  justify-items: end;
  max-width: 60%;
}

.briefing-multiline strong {
  text-align: right;
}

.loan-summary-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.loan-summary-chip {
  padding: 12px;
  border-radius: 12px;
  background: #eef4f9;
  border: 1px solid #d4dee7;
}

.loan-summary-chip span {
  display: block;
  margin-bottom: 6px;
  color: #5f7387;
  font-size: 0.8rem;
}

.loan-summary-chip strong {
  color: #143b5f;
}

.comparison-panel {
  margin-bottom: 20px;
}

.comparison-grid {
  display: grid;
  gap: 16px;
}

.comparison-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.comparison-table-wrap {
  overflow-x: auto;
}

.loan-calc-table {
  margin-top: 16px;
}

.comparison-table {
  width: 100%;
  min-width: 1080px;
  border-collapse: collapse;
}

.calculation-table {
  min-width: 860px;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #d8e1e9;
  text-align: left;
  vertical-align: top;
}

.comparison-table th {
  color: #476178;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.comparison-table td span {
  margin-top: 4px;
}

.scenario-button {
  border: 1px solid #d2dde8;
  border-radius: 14px;
  padding: 16px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
  cursor: pointer;
}

.scenario-button.active {
  border-color: #1a6fb0;
  background: #edf6fd;
}

.scenario-button strong {
  color: #0e365a;
}

.scenario-stats {
  text-align: right;
}

.rejection-copy {
  margin: 10px 0 0;
  color: #9e3124;
  line-height: 1.5;
}

.accordion-header {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  cursor: pointer;
}

.accordion-body {
  padding: 0 22px 22px;
}

.field-grid {
  display: grid;
  gap: 14px;
}

.four-columns {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.split-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.inner-panel {
  padding: 18px;
}

.section-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  color: #546a80;
  font-size: 0.92rem;
}

.record-card {
  padding: 18px;
}

.record-card.compact,
.record-stack.compact .record-card {
  padding: 14px;
}

.record-card-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.tone-soft {
  background: #edf6fd;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input,
select {
  width: 100%;
  border: 2px solid #0e416a;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
  color: #17334d;
}

@media (max-width: 1260px) {
  .decision-top,
  .decision-top.secondary,
  .workspace-shell,
  .split-columns,
  .four-columns,
  .decision-metrics,
  .metric-grid,
  .comparison-summary,
  .briefing-grid,
  .loan-summary-row,
  .scenario-compare-grid,
  .scenario-comparison-layout,
  .pipeline-grid {
    grid-template-columns: 1fr;
  }

  .sidebar {
    padding-bottom: 0;
  }
}

@media (max-width: 920px) {
  .topbar,
  .decision-header,
  .mini-header,
  .record-card-head,
  .section-actions,
  .scenario-compare-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .content-area {
    padding: 18px 14px 28px;
  }

  .topbar {
    height: auto;
    padding: 16px 14px;
  }
}
</style>
