<script setup>
import { useFormatters } from '../composables/useFormatters';

// This section keeps the borrower-facing affordability comparison separate from
// the recommendation ranking logic above it.
defineProps({
  proposedServicingDate: { type: String, default: '' },
  operatingIncome: { type: Number, default: 0 },
  currentPaymentAmount: { type: Number, default: 0 },
  recommendedPaymentAmount: { type: Number, default: 0 },
  currentPaymentGap: { type: Number, default: 0 },
  recommendedPaymentGap: { type: Number, default: 0 },
  debtMarginPercent: { type: Number, default: 0 },
  loanComparisonRows: { type: Array, default: () => [] },
});

const { currency, currencyCompact, formatActions, formatDate, ratePercent, yearsLabel } =
  useFormatters();

function metricTone(value) {
  return Number(value ?? 0) < 0 ? 'text-[#b42318]' : 'text-[#0f7b3d]';
}

function paymentDelta(row) {
  return Number(row.currentFirstYearPayment ?? 0) - Number(row.recommendedFirstYearPayment ?? 0);
}

function deltaTone(value) {
  return Number(value ?? 0) < 0 ? 'text-[#b42318]' : 'text-[#0f7b3d]';
}
</script>

<template>
  <section class="mb-5 rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
    <header class="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
      <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">Current vs recommended loan terms</h3>
      <span class="text-[0.86rem] font-[550] text-[#293c4f]">
        Restructuring date: {{ formatDate(proposedServicingDate) }}
      </span>
    </header>

    <div class="grid gap-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div class="rounded-[14px] bg-[#eef4f9] p-4"><span class="block text-[0.86rem] font-[550] text-[#293c4f]">Operating income / cash flow</span><strong class="text-[1.1rem] text-[#123b60]">{{ currencyCompact(operatingIncome) }}</strong></div>
        <div class="rounded-[14px] bg-[#eef4f9] p-4"><span class="block text-[0.86rem] font-[550] text-[#293c4f]">Current payment amount</span><strong class="text-[1.1rem] text-[#123b60]">{{ currencyCompact(currentPaymentAmount) }}</strong></div>
        <div class="rounded-[14px] bg-[#eef4f9] p-4"><span class="block text-[0.86rem] font-[550] text-[#293c4f]">Recommended payment amount</span><strong class="text-[1.1rem] text-[#123b60]">{{ currencyCompact(recommendedPaymentAmount) }}</strong></div>
        <div class="rounded-[14px] bg-[#eef4f9] p-4"><span class="block text-[0.86rem] font-[550] text-[#293c4f]">Income minus current payment</span><strong class="text-[1.1rem]" :class="metricTone(currentPaymentGap)">{{ currencyCompact(currentPaymentGap) }}</strong></div>
        <div class="rounded-[14px] bg-[#eef4f9] p-4"><span class="block text-[0.86rem] font-[550] text-[#293c4f]">Income minus recommended payment</span><strong class="text-[1.1rem]" :class="metricTone(recommendedPaymentGap)">{{ currencyCompact(recommendedPaymentGap) }}</strong></div>
        <div class="rounded-[14px] bg-[#eef4f9] p-4"><span class="block text-[0.86rem] font-[550] text-[#293c4f]">Debt margin reserve</span><strong class="text-[1.1rem] text-[#123b60]">{{ debtMarginPercent.toFixed(0) }}%</strong></div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[840px] border-collapse">
          <thead>
            <tr>
              <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Loan</th>
              <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Proposed rate</th>
              <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Proposed term</th>
              <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Proposed annual</th>
              <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in loanComparisonRows" :key="row.loanId">
              <td class="border-b border-[#d8e1e9] px-[10px] py-4 align-top">
                <strong class="block text-[1.1rem] text-[#0f1c2e]">{{ row.loanId }}</strong>
                <span class="mt-1 block text-[0.82rem] font-[550] text-[#6b8195]">Decision-ready comparison</span>
              </td>
              <td class="border-b border-[#d8e1e9] px-[10px] py-4 align-top">
                <strong class="block text-[1.02rem] text-[#0f1c2e]">{{ ratePercent(row.recommendedRate) }}</strong>
                <span class="mt-1 block text-[0.84rem] text-[#6b8195]">(Current {{ ratePercent(row.currentRate) }})</span>
              </td>
              <td class="border-b border-[#d8e1e9] px-[10px] py-4 align-top">
                <strong class="block text-[1.02rem] text-[#0f1c2e]">{{ yearsLabel(row.recommendedTermYears) }}</strong>
                <span class="mt-1 block text-[0.84rem] text-[#6b8195]">(Current {{ yearsLabel(row.currentTermYears) }})</span>
              </td>
              <td class="border-b border-[#d8e1e9] px-[10px] py-4 align-top">
                <strong class="block text-[1.02rem] text-[#0f1c2e]">{{ currency(row.recommendedFirstYearPayment) }}</strong>
                <span class="mt-1 block text-[0.84rem] text-[#6b8195]">(Current {{ currency(row.currentFirstYearPayment) }})</span>
                <span
                  class="mt-2 inline-block text-[0.82rem] font-bold"
                  :class="deltaTone(paymentDelta(row))"
                >
                  {{ paymentDelta(row) >= 0 ? 'Payment relief' : 'Higher cost' }}
                  {{ currency(Math.abs(paymentDelta(row))) }}
                </span>
              </td>
              <td class="border-b border-[#d8e1e9] px-[10px] py-4 align-top">
                <span class="text-[0.96rem] leading-7 text-[#0f1c2e]">
                  {{ formatActions(row.actions) || 'No Change' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
