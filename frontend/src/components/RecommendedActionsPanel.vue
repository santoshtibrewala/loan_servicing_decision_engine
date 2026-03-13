<script setup>
import { useFormatters } from '../composables/useFormatters';

// Loan-level recommendation detail is separated from the summary card because
// lenders often compare the portfolio recommendation and the per-loan actions
// as two distinct review steps.
defineProps({
  selectedScenario: { type: Object, default: null },
  recommendedLoanCards: { type: Array, default: () => [] },
});

const { currency, formatActions, ratePercent, yearsLabel } = useFormatters();
</script>

<template>
  <article v-if="selectedScenario" class="rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
    <header class="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
      <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">Recommended actions by loan</h3>
      <span class="text-[0.86rem] font-[550] text-[#293c4f]">{{ selectedScenario.id }}</span>
    </header>

    <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Writedown</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ currency(selectedScenario.scenario.writedownAmount) }}</strong>
      </div>
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Support</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ currency(selectedScenario.scenario.conservationSupportAmount) }}</strong>
      </div>
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Coverage ratio</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ selectedScenario.governmentProtectionMetrics.coverageRatio }}</strong>
      </div>
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Selected actions</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ Object.values(selectedScenario.actionsByLoan).flat().length }}</strong>
      </div>
    </div>

    <div class="grid gap-[14px]">
      <article
        v-for="loan in recommendedLoanCards"
        :key="loan.loanId"
        class="rounded-[18px] border border-[#ccd7e2] bg-[#edf6fd] p-[18px] shadow-[0_14px_34px_rgba(8,45,76,0.04)]"
      >
        <div class="mb-[14px] flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h4 class="m-0 text-[1.45rem] font-bold text-[#0f1c2e]">{{ loan.loanId }}</h4>
            <span class="text-[0.95rem] font-[550] text-[#5c7488]">{{ loan.loanType }}</span>
          </div>
        </div>
        <div class="grid gap-[10px]">
          <div class="flex justify-between gap-4 border-t-0 pt-0">
            <small class="text-[0.82rem] font-semibold text-[#6c8397]">Recommended actions</small>
            <strong class="text-right text-[#0f1c2e]">{{ formatActions(loan.actions) || 'No Change' }}</strong>
          </div>
          <div class="flex justify-between gap-4 border-t border-[#d7e1ea] pt-[10px]">
            <small class="text-[0.82rem] font-semibold text-[#6c8397]">Current vs proposed term</small>
            <strong class="text-right text-[#0f1c2e]">{{ yearsLabel(loan.currentTermYears) }} -> {{ yearsLabel(loan.recommendedTermYears) }}</strong>
          </div>
          <div class="flex justify-between gap-4 border-t border-[#d7e1ea] pt-[10px]">
            <small class="text-[0.82rem] font-semibold text-[#6c8397]">Current vs proposed rate</small>
            <strong class="text-right text-[#0f1c2e]">{{ ratePercent(loan.currentRate) }} -> {{ ratePercent(loan.recommendedRate) }}</strong>
          </div>
          <div class="flex justify-between gap-4 border-t border-[#d7e1ea] pt-[10px]">
            <small class="text-[0.82rem] font-semibold text-[#6c8397]">Current vs proposed annual payment</small>
            <strong class="text-right text-[#0f1c2e]">{{ currency(loan.currentFirstYearPayment) }} -> {{ currency(loan.recommendedFirstYearPayment) }}</strong>
          </div>
        </div>
      </article>
    </div>

    <p v-if="selectedScenario.rejectionReason" class="mt-[10px] text-[#9e3124]">
      {{ selectedScenario.rejectionReason }}
    </p>
  </article>
</template>
