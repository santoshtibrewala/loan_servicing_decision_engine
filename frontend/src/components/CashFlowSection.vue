<script setup>
import AccordionPanel from './AccordionPanel.vue';

// Cash flow inputs are isolated so a future numeric component library can be
// introduced here without touching the rest of the page.
defineProps({
  open: { type: Boolean, default: false },
  model: { type: Object, required: true },
});

const emit = defineEmits(['toggle']);
</script>

<template>
  <AccordionPanel
    id="section-cashFlow"
    title="Cash flow"
    kicker="Repayment capacity"
    :open="open"
    @toggle="emit('toggle')"
  >
    <div class="rounded-[18px] border border-brand-line bg-brand-panel p-[18px] shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
      <h3 class="mb-4 mt-0 text-[1.1rem] font-bold text-[#0f1c2e]">Annual operating view</h3>
      <div class="grid gap-[14px] md:grid-cols-2 xl:grid-cols-3">
        <label class="grid gap-1.5 font-semibold text-[#293c4f]">
          Balance available
          <input v-model.number="model.cashFlow.firstYear.balanceAvailable" type="number" min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
        </label>
        <label class="grid gap-1.5 font-semibold text-[#293c4f]">
          Operating expense
          <input v-model.number="model.cashFlow.firstYear.operatingExpense" type="number" min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
        </label>
        <label class="grid gap-1.5 font-semibold text-[#293c4f]">
          Operating interest
          <input v-model.number="model.cashFlow.firstYear.operatingInterestExpense" type="number" min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
        </label>
        <label class="grid gap-1.5 font-semibold text-[#293c4f]">
          Owner withdrawals
          <input v-model.number="model.cashFlow.firstYear.ownerWithdrawals" type="number" min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
        </label>
        <label class="grid gap-1.5 font-semibold text-[#293c4f]">
          Non-agency debt + taxes
          <input v-model.number="model.cashFlow.firstYear.nonAgencyDebtAndTaxes" type="number" min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
        </label>
      </div>
    </div>
  </AccordionPanel>
</template>
