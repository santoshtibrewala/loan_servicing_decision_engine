<script setup>
import AccordionPanel from './AccordionPanel.vue';
import FormattedNumberInput from './FormattedNumberInput.vue';

// Liens contain two related repeating groups, so the component owns the layout
// while App.vue retains only the add/remove handlers.
defineProps({
  open: { type: Boolean, default: false },
  liens: { type: Object, required: true },
});

const emit = defineEmits([
  'toggle',
  'add-property-link',
  'remove-property-link',
  'add-prior-lien',
  'remove-prior-lien',
]);
</script>

<template>
  <AccordionPanel
    id="section-liens"
    title="Liens & security"
    kicker="Security mapping"
    :open="open"
    @toggle="emit('toggle')"
  >
    <div class="grid gap-4 xl:grid-cols-2">
      <div class="rounded-[18px] border border-brand-line bg-brand-panel p-[18px] shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
        <div class="mb-[14px] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span class="text-[0.92rem] text-[#546a80]">Property / loan links</span>
          <button class="rounded-[12px] border border-[#adc1d4] bg-white px-[14px] py-[9px] font-semibold text-[#0d3e68]" @click="emit('add-property-link')">
            Add link
          </button>
        </div>
        <div class="grid gap-[14px]">
          <article
            v-for="(link, index) in liens.propertyLoanLinks"
            :key="`${link.propertyId}-${link.loanId}-${index}`"
            class="rounded-[18px] border border-brand-line bg-brand-panel p-[14px] shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
          >
            <div class="mb-[14px] flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <h4 class="m-0 text-[1rem] font-bold text-[#0f1c2e]">Link {{ index + 1 }}</h4>
              <button class="rounded-[12px] border border-[#adc1d4] bg-white px-[14px] py-[9px] font-semibold text-[#b53d2f]" @click="emit('remove-property-link', index)">
                Remove
              </button>
            </div>
            <div class="grid gap-[14px] md:grid-cols-2">
              <label class="grid gap-1.5 font-semibold text-[#293c4f]">Property ID<input v-model="link.propertyId" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
              <label class="grid gap-1.5 font-semibold text-[#293c4f]">Loan ID<input v-model="link.loanId" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
              <label class="grid gap-1.5 font-semibold text-[#293c4f]">Filing date<input v-model="link.filingDate" type="date" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
              <label class="grid gap-1.5 font-semibold text-[#293c4f]">Lien rank<input v-model.number="link.lienRank" type="number" min="1" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
            </div>
          </article>
        </div>
      </div>

      <div class="rounded-[18px] border border-brand-line bg-brand-panel p-[18px] shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
        <div class="mb-[14px] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span class="text-[0.92rem] text-[#546a80]">Prior liens</span>
          <button class="rounded-[12px] border border-[#adc1d4] bg-white px-[14px] py-[9px] font-semibold text-[#0d3e68]" @click="emit('add-prior-lien')">
            Add prior lien
          </button>
        </div>
        <div class="grid gap-[14px]">
          <article
            v-for="(lien, index) in liens.priorLiens"
            :key="`${lien.propertyId}-${index}`"
            class="rounded-[18px] border border-brand-line bg-brand-panel p-[14px] shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
          >
            <div class="mb-[14px] flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <h4 class="m-0 text-[1rem] font-bold text-[#0f1c2e]">Prior lien {{ index + 1 }}</h4>
              <button class="rounded-[12px] border border-[#adc1d4] bg-white px-[14px] py-[9px] font-semibold text-[#b53d2f]" @click="emit('remove-prior-lien', index)">
                Remove
              </button>
            </div>
            <div class="grid gap-[14px] md:grid-cols-2">
              <label class="grid gap-1.5 font-semibold text-[#293c4f]">Property ID<input v-model="lien.propertyId" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
              <label class="grid gap-1.5 font-semibold text-[#293c4f]">Creditor<input v-model="lien.creditorName" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
              <label class="grid gap-1.5 font-semibold text-[#293c4f]">Prior debt<FormattedNumberInput v-model="lien.totalDebtPriorToFsaLien" kind="amount" :min="0" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
              <label class="grid gap-1.5 font-semibold text-[#293c4f]">Filing date<input v-model="lien.filingDate" type="date" class="w-full rounded-[10px] border-2 border-[#0e416a] bg-white px-[14px] py-3 text-[#17334d]" /></label>
            </div>
          </article>
        </div>
      </div>
    </div>
  </AccordionPanel>
</template>
