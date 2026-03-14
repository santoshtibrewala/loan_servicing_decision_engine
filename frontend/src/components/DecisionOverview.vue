<script setup>
import { useFormatters } from '../composables/useFormatters';

// The overview card summarizes the active recommendation at the portfolio
// level before the lender dives into loan-by-loan detail.
const props = defineProps({
  recommendation: { type: Object, default: null },
  activeCaseLabel: { type: String, default: 'Manual' },
  proposedServicingDate: { type: String, default: '' },
  currentPaymentAmount: { type: Number, default: 0 },
  recommendedPaymentAmount: { type: Number, default: 0 },
  operatingIncome: { type: Number, default: 0 },
  recommendedPaymentGap: { type: Number, default: 0 },
});

const { currencyCompact, formatDate } = useFormatters();

function outcomeTone(recommendation) {
  if (!recommendation) {
    return 'text-[#0f1c2e]';
  }
  if (recommendation.status === 'rejected') {
    return 'text-[#b42318]';
  }
  if (recommendation.status === 'valid and recommendable') {
    return 'text-[#0f7b3d]';
  }
  return 'text-[#0f1c2e]';
}

function metricTone(value) {
  return Number(value ?? 0) < 0 ? 'text-[#b42318]' : 'text-[#0f7b3d]';
}
</script>

<template>
  <article class="rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
    <div class="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <span class="mb-2 block text-[0.78rem] font-bold uppercase tracking-[0.11em] text-[#0c4a76]">
          Decision
        </span>
        <h2
          class="m-0 text-[2rem] font-bold"
          :class="outcomeTone(recommendation)"
        >
          {{ recommendation ? recommendation.outcomeCode : 'No recommendation yet' }}
        </h2>
        <p class="mt-2 max-w-3xl text-[0.98rem] leading-7 text-[#516779]">
          {{
            recommendation
              ? recommendation.explanation
              : 'Run the engine to generate ranked servicing options and compare outcomes.'
          }}
        </p>
      </div>
      <div class="grid min-w-[120px] content-start rounded-[14px] bg-[#0b3d68] p-4 text-white">
        <span class="text-[0.84rem] text-[#bcd3e5]">Score</span>
        <strong class="text-[2rem] leading-none">{{ recommendation?.score ?? '--' }}</strong>
      </div>
    </div>

    <div
      v-if="recommendation"
      class="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6"
    >
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Active case</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ activeCaseLabel }}</strong>
      </div>
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Restructuring date</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ formatDate(proposedServicingDate) }}</strong>
      </div>
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Current payment amount</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ currencyCompact(currentPaymentAmount) }}</strong>
      </div>
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Recommended payment amount</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ currencyCompact(recommendedPaymentAmount) }}</strong>
      </div>
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Operating income / cash flow</span>
        <strong class="text-[1.1rem] text-[#123b60]">{{ currencyCompact(operatingIncome) }}</strong>
      </div>
      <div class="rounded-[14px] bg-[#eef4f9] p-4">
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">Operating income vs recommended payment</span>
        <strong class="text-[1.1rem]" :class="metricTone(recommendedPaymentGap)">{{ currencyCompact(recommendedPaymentGap) }}</strong>
      </div>
    </div>
  </article>
</template>
