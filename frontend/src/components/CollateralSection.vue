<script setup>
import AccordionPanel from './AccordionPanel.vue';
import FormattedNumberInput from './FormattedNumberInput.vue';
import { useFormatters } from '../composables/useFormatters';

// Collateral editing is isolated because recoverable value and future asset
// widgets will likely evolve independently from the loan forms.
defineProps({
  open: { type: Boolean, default: false },
  collateral: { type: Array, default: () => [] },
  collateralTypeOptions: { type: Array, default: () => [] },
  lookupLabel: { type: Function, required: true },
});

const emit = defineEmits(['toggle', 'add-collateral', 'remove-collateral']);
const { currencyCompact } = useFormatters();
</script>

<template>
  <AccordionPanel
    id="section-collateral"
    title="Collateral"
    kicker="Recovery assumptions"
    :open="open"
    @toggle="emit('toggle')"
  >
    <div
      class="mb-[14px] flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
      <span class="text-[0.92rem] text-[#546a80]"
        >{{ collateral.length }} collateral records</span
      >
      <button
        class="rounded-[12px] border border-[#adc1d4] bg-white px-[14px] py-[9px] font-semibold text-[#0d3e68]"
        @click="emit('add-collateral')"
      >
        Add collateral
      </button>
    </div>
    <div class="grid gap-[14px]">
      <article
        v-for="(item, index) in collateral"
        :key="`${item.propertyId}-${index}`"
        class="rounded-[18px] border border-brand-line bg-brand-panel p-[18px] shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
      >
        <div
          class="mb-[14px] flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
        >
          <div>
            <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">
              {{ item.propertyId || `Collateral ${index + 1}` }}
            </h3>
            <span class="text-[0.86rem] font-[550] text-[#293c4f]">{{
              lookupLabel(collateralTypeOptions, item.propertyType)
            }}</span>
          </div>
          <button
            class="rounded-[12px] border border-[#adc1d4] bg-white px-[14px] py-[9px] font-semibold text-[#b53d2f]"
            @click="emit('remove-collateral', index)"
          >
            Remove
          </button>
        </div>
        <div class="mb-[14px] grid gap-[10px] md:grid-cols-2">
          <div class="rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] p-3">
            <span class="mb-1 block text-[0.8rem] text-[#5f7387]"
              >Market value</span
            >
            <strong class="text-[#143b5f]">{{
              currencyCompact(item.marketValue)
            }}</strong>
          </div>
          <div class="rounded-[12px] border border-[#d4dee7] bg-[#eef4f9] p-3">
            <span class="mb-1 block text-[0.8rem] text-[#5f7387]"
              >Recoverable value</span
            >
            <strong class="text-[#143b5f]">{{
              currencyCompact(item.recoverableValue)
            }}</strong>
          </div>
        </div>
        <div class="grid gap-[14px] md:grid-cols-2 xl:grid-cols-4">
          <label class="grid gap-1.5 font-semibold text-[#293c4f]"
            >Property ID<input
              v-model="item.propertyId"
              class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
          /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]"
            >Property type<select
              v-model="item.propertyType"
              class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
            >
              <option
                v-for="option in collateralTypeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select></label
          >
          <label class="grid gap-1.5 font-semibold text-[#293c4f]"
            >Description<input
              v-model="item.description"
              class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
          /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]"
            >Market value<FormattedNumberInput
              v-model="item.marketValue"
              kind="amount"
              :min="0"
              class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
          /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]"
            >Recoverable value<FormattedNumberInput
              v-model="item.recoverableValue"
              kind="amount"
              :min="0"
              class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
          /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]"
            >Monthly income<FormattedNumberInput
              v-model="item.monthlyIncome"
              kind="amount"
              :min="0"
              class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
          /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]"
            >Repair cost<FormattedNumberInput
              v-model="item.repairCost"
              kind="amount"
              :min="0"
              class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
          /></label>
          <label class="grid gap-1.5 font-semibold text-[#293c4f]"
            >Other expense<FormattedNumberInput
              v-model="item.otherExpenseCost"
              kind="amount"
              :min="0"
              class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]"
          /></label>
        </div>
      </article>
    </div>
  </AccordionPanel>
</template>
