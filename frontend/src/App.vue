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
import BorrowerCaseSection from './components/BorrowerCaseSection.vue';
import CalculationWorksheetCard from './components/CalculationWorksheetCard.vue';
import CashFlowSection from './components/CashFlowSection.vue';
import CollateralSection from './components/CollateralSection.vue';
import CurrentVsRecommendedSection from './components/CurrentVsRecommendedSection.vue';
import DecisionOverview from './components/DecisionOverview.vue';
import ExistingLoansSection from './components/ExistingLoansSection.vue';
import LiensSection from './components/LiensSection.vue';
import OutcomeGraphCard from './components/OutcomeGraphCard.vue';
import PipelineCountsCard from './components/PipelineCountsCard.vue';
import PolicySnapshotSection from './components/PolicySnapshotSection.vue';
import PreDecisionBriefing from './components/PreDecisionBriefing.vue';
import RankedAlternativesPanel from './components/RankedAlternativesPanel.vue';
import RecommendedActionsPanel from './components/RecommendedActionsPanel.vue';
import ScenarioComparisonGrid from './components/ScenarioComparisonGrid.vue';
import { useFormatters } from './composables/useFormatters';
import { useWorksheetExport } from './composables/useWorksheetExport';

// Clone reactive form state into plain JSON-safe objects before sending it to
// the API or replacing nested sections from a preset payload.
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

// Shared display helpers are centralized so the cards, tables, and form
// summaries render amounts and labels consistently across the page.
const {
  currency,
  currencyCompact,
  percent,
  ratePercent,
  formatDate,
  yearsLabel,
  lookupLabel,
  toDisplayText,
  formatLabel,
  formatActionLabel,
  formatActions,
} = useFormatters();
// Worksheet printing is kept in a composable so App.vue only prepares data for
// export instead of owning the print-window markup.
const { exportWorksheet: printWorksheet } = useWorksheetExport();

// Top-level async, UI, and result state for the servicing workspace.
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

// Sidebar navigation drives the expand-and-scroll behavior for the accordion
// sections below the decision area.
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

// The selected scenario is either the user-picked alternative or the top
// recommended path when evaluation first returns.
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
// Config-backed dropdowns are derived from the `/api/config` payload.
const stateOptions = computed(() => Object.entries(locationOptions.value));
const borrowerTypeOptions = computed(
  () => referenceData.value.borrowerTypes ?? [],
);
const distressCauseOptions = computed(
  () => referenceData.value.distressCauses ?? [],
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
// Portfolio-level summary values feed the pre-decision briefing and the
// selected-scenario comparison views.
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
// The pre-decision cards are assembled as data so the section can stay
// presentational and easy to reorder.
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
// Loan comparison rows normalize current and proposed terms into a single table
// shape that can be reused by both the UI table and the printable worksheet.
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
// Calculation rows deliberately expose both formulas and results so the loan
// officer can audit how the selected scenario score and affordability were
// derived.
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
  const eligibility = results.value.metadata?.eligibility ?? {};

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
    {
      category: 'Eligibility gate',
      metric: 'Borrower eligibility status',
      formula: 'Primary servicing gate checks',
      value: eligibility.overallEligible ? 'Passed' : 'Review required',
    },
    {
      category: 'Eligibility gate',
      metric: 'Application timing',
      formula: 'Completed Application Date - Notice Of Delinquency Date',
      value:
        eligibility.applicationWindowDays == null
          ? '--'
          : `${eligibility.applicationWindowDays} days`,
    },
    {
      category: 'Eligibility gate',
      metric: 'Total delinquent due',
      formula: 'Sum Of Delinquent Amount Due Across Loans',
      value: currency(eligibility.totalDelinquent ?? 0),
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
// Worksheet loan rows use already-formatted display values so printed output
// matches the on-screen recommendation view.
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
// Policy cards surface a lender-readable slice of the config instead of dumping
// raw JSON into the UI.
const policyCards = computed(() => {
  const controls = policySummary.value.scenarioControls ?? {};
  const scoring = policySummary.value.scoringWeights ?? {};
  const recovery = policySummary.value.collateralRecoveryAssumptions ?? {};
  const rules = policySummary.value.servicingRules ?? {};
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
      title: 'Eligibility and servicing rules',
      rows: [
        {
          label: 'Delinquency threshold',
          value: `${rules.delinquencyDaysThreshold ?? '--'} days`,
        },
        {
          label: 'Application window',
          value: `${rules.applicationWindowDays ?? '--'} days`,
        },
        {
          label: 'Max deferral',
          value:
            rules.maxDeferralYears == null
              ? '--'
              : yearsLabel(rules.maxDeferralYears),
        },
        {
          label: 'Rate reduction gate',
          value:
            rules.requireLimitedResourceEligibilityForRateReduction === false
              ? 'Open'
              : 'Limited Resource Eligible Only',
        },
      ],
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

const scoringSummaryRows = computed(() => {
  const scoring = policySummary.value.scoringWeights ?? {};
  return [
    {
      label: 'Feasibility',
      value: percent(scoring.feasibility ?? 0),
    },
    {
      label: 'Gov. Protection',
      value: percent(scoring.governmentProtection ?? 0),
    },
    {
      label: 'Concessions',
      value: percent(scoring.concessionMinimization ?? 0),
    },
    {
      label: 'Margin',
      value: percent(scoring.marginAttainment ?? 0),
    },
    {
      label: 'Simplicity',
      value: percent(scoring.simplicity ?? 0),
    },
  ];
});

const scoringMechanism = computed(() => [
  'Feasibility scores whether usable cash covers the proposed annual payment.',
  'Government protection scores the projected value against net recovery value and coverage floor.',
  'Concession minimization penalizes larger writedowns, deeper rate cuts, deferral, and other relief.',
  'Margin attainment rewards scenarios that preserve the target reserve while remaining feasible.',
  'Simplicity breaks ties in favor of fewer actions and less structural complexity.',
]);

// Pipeline counts explain how many candidate paths were generated and how many
// survived the recommendation screens.
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

// The current baseline row gives lenders a no-change benchmark before they look
// at ranked restructuring alternatives.
const baselineScenarioRow = computed(() => ({
  id: 'current-baseline',
  label: 'Current baseline',
  description: 'Current loan structure before any restructuring action.',
  annualPayment: currentFirstYearPaymentAmount.value,
  cashMargin: currentPaymentGap.value,
  coverage:
    recommendation.value?.governmentProtectionMetrics?.coverageRatio ?? 0,
}));

const rankedAlternativeRows = computed(() =>
  (results.value?.scenarios ?? []).map((scenario) => ({
    ...scenario,
    flags: scenarioPolicyFlags(scenario),
  })),
);

// Comparison cards intentionally choose materially different scenarios rather
// than simply showing the next three rows in rank order.
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

// Outcome bars show the selected scenario across the main affordability and
// government-protection measures used throughout the engine.
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

// Apply a preset by fully replacing the editable form model and clearing any
// prior evaluation output that no longer matches the inputs.
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

// Pull the editable sample case, location dropdowns, and policy summaries from
// the lightweight backend config endpoint.
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

// Send the normalized case payload to the backend and hydrate the ranked
// scenario set used across the recommendation panels.
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

// Accordion and sidebar navigation helpers.
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

// Flags are intentionally simple lender-facing warnings rather than raw engine
// internals so they can be shown directly on comparison cards.
function scenarioPolicyFlags(scenario) {
  const flags = [];
  if (
    scenario.phaseOutputs?.eligibility?.overallEligible === false ||
    (scenario.phaseOutputs?.eligibility?.gateReasons?.length ?? 0) > 0
  ) {
    flags.push('Eligibility Gate Failed');
  }
  if (scenario.governmentProtectionMetrics?.writedownVsNrvRequired) {
    flags.push('Writedown Required');
  }
  if (
    scenario.phaseOutputs?.constraints?.deferralAllowed === false &&
    scenario.scenario?.deferralYears > 0
  ) {
    flags.push('Deferral Not Allowed');
  }
  if (
    scenario.phaseOutputs?.constraints?.consolidationAllowed === false &&
    scenario.scenario?.consolidateLoans
  ) {
    flags.push('Consolidation Not Allowed');
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

// Graph helpers convert absolute values into bounded bar widths.
function barWidth(value, max = 160) {
  return `${Math.max(8, Math.min(max, value))}px`;
}

function graphPercent(value, max) {
  if (!max || max <= 0) {
    return '8%';
  }
  return `${Math.max(8, Math.min(100, (value / max) * 100))}%`;
}

function exportWorksheet() {
  if (!selectedScenario.value) {
    return;
  }
  try {
    printWorksheet({
      appMeta: appMeta.value,
      caseData: model.case,
      selectedScenario: selectedScenario.value,
      calculationSummaryRows: calculationSummaryRows.value,
      loanCalculationRows: loanCalculationRows.value,
      scoringSummaryRows: scoringSummaryRows.value,
      scoringMechanism: scoringMechanism.value,
      formatDate,
    });
  } catch (worksheetError) {
    error.value =
      worksheetError instanceof Error
        ? worksheetError.message
        : 'Unable to export worksheet.';
  }
}

// Editable multi-record sections use local helpers so the page can stay
// database-free while still supporting add/remove interactions.
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

// Keep county selection valid when the state dropdown changes.
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
  <div class="min-h-screen bg-brand-canvas workspace">
    <!-- Header keeps branding and the primary evaluation action visible without
         repeating controls inside the page body. -->
    <header
      class="flex min-h-[74px] items-center justify-between gap-6 border-b border-[#c8d3df] bg-[#f8fafc] px-7 topbar"
    >
      <div class="flex items-center gap-[14px] topbar-copy">
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

    <div
      class="grid min-h-[calc(100vh-108px)] grid-cols-[295px_minmax(0,1fr)] workspace-shell max-[1260px]:grid-cols-1"
    >
      <!-- Left rail is navigation plus a compact case status summary. The
           preset selector lives here so lenders can switch seeded examples
           without opening the borrower form first. -->
      <aside
        class="bg-[linear-gradient(180deg,#033a67,#022c50_100%)] text-[#f4f8fb] sidebar"
      >
        <div
          class="m-5 rounded-2xl bg-[rgba(255,255,255,0.08)] p-5 sidebar-card"
        >
          <label class="mb-4 grid gap-1.5 font-semibold text-[#d0e3f2]">
            <span
              class="text-[0.8rem] uppercase tracking-[0.08em] text-[#b9d7ec]"
            >
              Case preset
            </span>
            <select
              class="w-full rounded-[10px] border border-[rgba(185,215,236,0.45)] bg-[rgba(255,255,255,0.14)] px-3 py-2 text-[#f4f8fb] outline-none"
              :value="currentPresetId"
              @change="applyPreset($event.target.value)"
            >
              <option
                v-for="preset in casePresets"
                :key="preset.id"
                :value="preset.id"
                class="text-[#17334d]"
              >
                {{ preset.label }}
              </option>
            </select>
          </label>
          <p class="sidebar-case">{{ model.case.borrowerId || 'Case' }}</p>
          <strong>{{
            recommendation ? 'Recommendation ready' : 'In Progress'
          }}</strong>
          <span
            >{{ model.case.state || '--' }} /
            {{ model.case.county || '--' }}</span
          >
        </div>

        <div class="grid sidebar-nav">
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

        <div
          class="m-5 rounded-2xl bg-[rgba(255,255,255,0.08)] p-5 sidebar-note"
        >
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

        <div
          class="m-5 rounded-2xl bg-[rgba(255,255,255,0.08)] p-5 sidebar-note"
        >
          <span>Scoring model</span>
          <strong>Weighted servicing score</strong>
          <div class="mt-3 grid gap-2">
            <div
              v-for="row in scoringSummaryRows"
              :key="row.label"
              class="flex items-center justify-between gap-3 text-[0.84rem]"
            >
              <span class="text-[#d0e3f2]">{{ row.label }}</span>
              <strong class="!m-0 text-[0.9rem] text-white">{{
                row.value
              }}</strong>
            </div>
          </div>
        </div>
      </aside>

      <main
        class="px-7 pb-12 pt-8 content-area max-[920px]:px-3.5 max-[920px]:pb-7 max-[920px]:pt-[18px]"
      >
        <p v-if="error" class="error-banner">{{ error }}</p>
        <p v-if="loading" class="loading-copy">Loading case...</p>

        <template v-else>
          <!-- Prelude title sits above the case briefing and frames the page as
               the A-STAR decision workspace. -->
          <div class="mb-3 prelude-header">
            <span class="page-heading"
              >Servicing Term Analysis and Recommendation Engine</span
            >
          </div>

          <!-- Pre-decision briefing shows the normalized input story before the
               lender reviews any engine output. -->
          <PreDecisionBriefing
            :sections="briefingSections"
            :open="openSections.briefing"
            @toggle="toggleSection('briefing')"
          />

          <!-- Decision summary and selected scenario graph stay at the top of
               the workspace because they are the primary underwriting outputs. -->
          <section
            id="section-decision"
            class="mb-5 grid gap-5 decision-top max-[1260px]:grid-cols-1"
          >
            <DecisionOverview
              :recommendation="recommendation"
              :active-case-label="
                casePresets.find((preset) => preset.id === currentPresetId)
                  ?.label ?? 'Manual'
              "
              :proposed-servicing-date="model.case.proposedServicingDate"
              :current-payment-amount="currentFirstYearPaymentAmount"
              :recommended-payment-amount="recommendedFirstYearPaymentAmount"
              :operating-income="firstYearOperatingIncome"
              :recommended-payment-gap="recommendedPaymentGap"
            />

            <OutcomeGraphCard
              :outcome-series="outcomeSeries"
              :graph-percent="graphPercent"
            />
          </section>

          <PipelineCountsCard :items="pipelineCounts" />

          <ScenarioComparisonGrid
            :scenarios="topScenarioComparisons"
            @select="selectedScenarioId = $event"
          />

          <section
            v-if="results"
            class="mb-5 grid gap-5 decision-top secondary max-[1260px]:grid-cols-1"
          >
            <RankedAlternativesPanel
              :baseline-row="baselineScenarioRow"
              :scenarios="rankedAlternativeRows"
              :selected-scenario-id="selectedScenarioId"
              @select="selectedScenarioId = $event"
            />

            <RecommendedActionsPanel
              :selected-scenario="selectedScenario"
              :recommended-loan-cards="recommendedLoanCards"
            />
          </section>

          <CurrentVsRecommendedSection
            v-if="selectedScenario"
            :proposed-servicing-date="model.case.proposedServicingDate"
            :operating-income="firstYearOperatingIncome"
            :current-payment-amount="currentFirstYearPaymentAmount"
            :recommended-payment-amount="recommendedFirstYearPaymentAmount"
            :current-payment-gap="currentPaymentGap"
            :recommended-payment-gap="recommendedPaymentGap"
            :debt-margin-percent="Number(model.case.debtMarginPercent ?? 0)"
            :loan-comparison-rows="loanComparisonRows"
          />

          <CalculationWorksheetCard
            v-if="selectedScenario"
            :rows="calculationSummaryRows"
            @print="exportWorksheet"
          />

          <section
            class="mb-5 rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
          >
            <header
              class="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between"
            >
              <div>
                <span
                  class="mb-2 block text-[0.78rem] font-bold uppercase tracking-[0.11em] text-[#0c4a76]"
                >
                  Scoring
                </span>
                <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">
                  How recommendation scores are built
                </h3>
              </div>
              <span class="text-[0.86rem] font-[550] text-[#293c4f]">
                Weighted ranking applied after eligibility and protection checks
              </span>
            </header>

            <div class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div class="grid gap-3">
                <div
                  v-for="row in scoringSummaryRows"
                  :key="`main-${row.label}`"
                  class="flex items-center justify-between rounded-[14px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3"
                >
                  <strong class="text-[#143b5f]">{{ row.label }}</strong>
                  <span class="text-[0.98rem] font-bold text-[#0f1c2e]">
                    {{ row.value }}
                  </span>
                </div>
              </div>

              <div
                class="rounded-[14px] border border-[#d4dee7] bg-[#f7fafc] p-4"
              >
                <div class="grid gap-3">
                  <div
                    v-for="line in scoringMechanism"
                    :key="line"
                    class="flex gap-3 border-t border-[#d6e0e9] pt-3 first:border-t-0 first:pt-0"
                  >
                    <span
                      class="mt-1 inline-block h-2.5 w-2.5 flex-none rounded-full bg-[#0c4a76]"
                    ></span>
                    <span class="text-[0.95rem] leading-6 text-[#294051]">
                      {{ line }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Editable case setup remains below the recommendation area so the
               lender can iterate on assumptions and rerun the engine. -->
          <section class="grid gap-[14px]">
            <BorrowerCaseSection
              :open="openSections.borrower"
              :borrower-type-options="borrowerTypeOptions"
              :distress-cause-options="distressCauseOptions"
              :state-options="stateOptions"
              :county-options="countyOptions"
              :model="model"
              @toggle="toggleSection('borrower')"
            />

            <CashFlowSection
              :open="openSections.cashFlow"
              :model="model"
              @toggle="toggleSection('cashFlow')"
            />

            <ExistingLoansSection
              :open="openSections.existingLoans"
              :loans="model.existingLoans"
              :loan-type-options="loanTypeOptions"
              :lookup-label="lookupLabel"
              @toggle="toggleSection('existingLoans')"
              @add-loan="addExistingLoan"
              @remove-loan="removeExistingLoan"
            />

            <CollateralSection
              :open="openSections.collateral"
              :collateral="model.collateral"
              :collateral-type-options="collateralTypeOptions"
              :lookup-label="lookupLabel"
              @toggle="toggleSection('collateral')"
              @add-collateral="addCollateral"
              @remove-collateral="removeCollateral"
            />

            <LiensSection
              :open="openSections.liens"
              :liens="model.liens"
              @toggle="toggleSection('liens')"
              @add-property-link="addPropertyLink"
              @remove-property-link="removePropertyLink"
              @add-prior-lien="addPriorLien"
              @remove-prior-lien="removePriorLien"
            />

            <PolicySnapshotSection
              :open="openSections.policy"
              :cards="policyCards"
              @toggle="toggleSection('policy')"
            />
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

.sidebar {
  color: #f4f8fb;
  padding: 0px 0 0px;
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
  font-weight: 500;
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
  .decision-top.secondary,
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
  .decision-header,
  .mini-header,
  .record-card-head,
  .section-actions,
  .scenario-compare-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
