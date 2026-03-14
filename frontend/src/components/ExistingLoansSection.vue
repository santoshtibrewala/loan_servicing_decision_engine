<script setup>
import AccordionPanel from './AccordionPanel.vue';
import FormattedNumberInput from './FormattedNumberInput.vue';
import { useFormatters } from '../composables/useFormatters';

// Existing loans are the largest repeating form group, so they were extracted
// first to keep App.vue from owning all add/remove and summary markup.
defineProps({
  open: { type: Boolean, default: false },
  loans: { type: Array, default: () => [] },
  loanTypeOptions: { type: Array, default: () => [] },
  lookupLabel: { type: Function, required: true },
});

const emit = defineEmits(['toggle', 'add-loan', 'remove-loan']);
const { currencyCompact, yearsLabel } = useFormatters();
</script>

<template>
  <AccordionPanel
    id="section-existingLoans"
    title="Existing loans"
    kicker="Debt inventory"
    :open="open"
    @toggle="emit('toggle')"
  >
    <div class="mb-[14px] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <span class="text-[0.92rem] text-[#546a80]">{{ loans.length }} loans</span>
      <button class="rounded-[12px] border border-[#adc1d4] bg-white px-[14px] py-[9px] font-semibold text-[#0d3e68]" @click="emit('add-loan')">
        Add loan
      </button>
    </div>
    <div class="grid gap-[14px]">
      <article
        v-for="(loan, index) in loans"
        :key="`${loan.loanId}-${index}`"
        class="rounded-[18px] border border-brand-line bg-brand-panel p-[18px] shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
      >
        <div class="mb-[14px] flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">{{ loan.loanId || `Loan ${index + 1}` }}</h3>
            <span class="text-[0.86rem] font-[550] text-[#293c4f]">{{ lookupLabel(loanTypeOptions, loan.loanType) }}</span>
          </div>
          <button class="rounded-[12px] border border-[#adc1d4] bg-white px-[14px] py-[9px] font-semibold text-[#b53d2f]" @click="emit('remove-loan', index)">
            Remove
          </button>
        </div>
        <div class="mb-[14px] grid gap-[10px] md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] p-3">
            <span class="mb-1 block text-[0.8rem] text-[#5f7387]">Loan type</span>
            <strong class="text-[#143b5f]">{{ lookupLabel(loanTypeOptions, loan.loanType) }}</strong>
          </div>
          <div class="rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] p-3">
            <span class="mb-1 block text-[0.8rem] text-[#5f7387]">Remaining term</span>
            <strong class="text-[#143b5f]">{{ yearsLabel(loan.remainingTermYears || 0) }}</strong>
          </div>
          <div class="rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] p-3">
            <span class="mb-1 block text-[0.8rem] text-[#5f7387]">Payment amount</span>
            <strong class="text-[#143b5f]">{{ currencyCompact(loan.firstYearPayment) }}</strong>
          </div>
          <div class="rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] p-3">
            <span class="mb-1 block text-[0.8rem] text-[#5f7387]">Total outstanding</span>
            <strong class="text-[#143b5f]">{{ currencyCompact(Number(loan.principal ?? 0) + Number(loan.accruedInterest ?? 0)) }}</strong>
          </div>
        </div>
        <div class="grid gap-[14px] md:grid-cols-2 xl:grid-cols-4">
          <label class="grid gap-1.5 font-semibold text-[#293c4f]">Fund code<input v-model="loan.fundCode" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]">Loan ID<input v-model="loan.loanId" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]">Loan type<select v-model="loan.loanType" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"><option v-for="option in loanTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]">Principal<FormattedNumberInput v-model="loan.principal" kind="amount" :min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]">Accrued interest<FormattedNumberInput v-model="loan.accruedInterest" kind="amount" :min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]">Existing rate<FormattedNumberInput v-model="loan.existingRate" kind="percent" :scale="100" :decimals="2" :min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]">Remaining term<input v-model.number="loan.remainingTermYears" type="number" min="1" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]">First-year payment<FormattedNumberInput v-model="loan.firstYearPayment" kind="amount" :min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
        </div>
      </article>
    </div>
  </AccordionPanel>
</template>
