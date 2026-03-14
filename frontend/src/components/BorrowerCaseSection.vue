<script setup>
import AccordionPanel from './AccordionPanel.vue';
import FormattedNumberInput from './FormattedNumberInput.vue';

// Case-level controls stay grouped together because these inputs often change
// together when a lender reviews borrower details after choosing a preset.
defineProps({
  open: { type: Boolean, default: false },
  borrowerTypeOptions: { type: Array, default: () => [] },
  distressCauseOptions: { type: Array, default: () => [] },
  stateOptions: { type: Array, default: () => [] },
  countyOptions: { type: Array, default: () => [] },
  model: { type: Object, required: true },
});

const emit = defineEmits(['toggle']);
</script>

<template>
  <AccordionPanel
    id="section-borrower"
    title="Borrower / case"
    kicker="Case setup"
    :open="open"
    @toggle="emit('toggle')"
  >
    <div class="grid gap-[14px] xl:grid-cols-4">
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Borrower ID
        <input v-model="model.case.borrowerId" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Borrower type
        <select v-model="model.case.borrowerType" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]">
          <option v-for="option in borrowerTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        State
        <select v-model="model.case.state" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]">
          <option v-for="[code, state] in stateOptions" :key="code" :value="code">
            {{ code }} - {{ state.label }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        County
        <select v-model="model.case.county" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]">
          <option v-for="county in countyOptions" :key="county" :value="county">
            {{ county }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Proposed servicing date
        <input v-model="model.case.proposedServicingDate" type="date" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Debt margin (%)
        <FormattedNumberInput
          v-model="model.case.debtMarginPercent"
          kind="percent"
          :decimals="0"
          :min="0"
          :max="50"
          class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
        />
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        First payment due
        <input v-model="model.case.firstPaymentDueDate" type="date" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Conservation acres
        <input v-model.number="model.case.conservationAcres" type="number" min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Days past due
        <input v-model.number="model.case.daysPastDue" type="number" min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Notice of delinquency date
        <input v-model="model.case.noticeOfDelinquencyDate" type="date" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" />
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Distress cause
        <select v-model="model.case.distressCause" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]">
          <option value="">Select cause</option>
          <option
            v-for="option in distressCauseOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Non-essential asset liquidation value
        <FormattedNumberInput
          v-model="model.case.nonEssentialAssetLiquidationValue"
          kind="amount"
          :min="0"
          class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
        />
      </label>
      <label class="grid gap-1.5 font-semibold text-[#293c4f]">
        Buyout funds available
        <FormattedNumberInput
          v-model="model.case.buyoutFundsAvailable"
          kind="amount"
          :min="0"
          class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
        />
      </label>
    </div>

    <div class="mt-4 grid gap-[14px] md:grid-cols-2 xl:grid-cols-3">
      <label class="flex items-center gap-3 rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3 font-semibold text-[#293c4f]">
        <input v-model="model.case.goodFaith" type="checkbox" class="h-4 w-4 rounded border-[#0e416a]" />
        Good faith
      </label>
      <label class="flex items-center gap-3 rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3 font-semibold text-[#293c4f]">
        <input v-model="model.case.applicationComplete" type="checkbox" class="h-4 w-4 rounded border-[#0e416a]" />
        Application complete
      </label>
      <label class="flex items-center gap-3 rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3 font-semibold text-[#293c4f]">
        <input v-model="model.case.financiallyDistressed" type="checkbox" class="h-4 w-4 rounded border-[#0e416a]" />
        Financially distressed
      </label>
      <label class="flex items-center gap-3 rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3 font-semibold text-[#293c4f]">
        <input v-model="model.case.temporaryHardship" type="checkbox" class="h-4 w-4 rounded border-[#0e416a]" />
        Temporary hardship
      </label>
      <label class="flex items-center gap-3 rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3 font-semibold text-[#293c4f]">
        <input v-model="model.case.nonEssentialAssetsAvailable" type="checkbox" class="h-4 w-4 rounded border-[#0e416a]" />
        Non-essential assets available
      </label>
      <label class="flex items-center gap-3 rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3 font-semibold text-[#293c4f]">
        <input v-model="model.case.referredToCounsel" type="checkbox" class="h-4 w-4 rounded border-[#0e416a]" />
        Referred to counsel
      </label>
      <label class="flex items-center gap-3 rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3 font-semibold text-[#293c4f]">
        <input v-model="model.case.cropInsuranceViolation" type="checkbox" class="h-4 w-4 rounded border-[#0e416a]" />
        Crop insurance violation
      </label>
      <label class="flex items-center gap-3 rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] px-4 py-3 font-semibold text-[#293c4f]">
        <input v-model="model.case.nonMonetaryDefault" type="checkbox" class="h-4 w-4 rounded border-[#0e416a]" />
        Non-monetary default
      </label>
    </div>
  </AccordionPanel>
</template>
