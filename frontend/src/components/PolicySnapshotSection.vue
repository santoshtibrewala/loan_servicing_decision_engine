<script setup>
import AccordionPanel from './AccordionPanel.vue';

// Policy cards intentionally render a curated slice of config instead of the
// raw config object so loan officers see the assumptions that matter most.
defineProps({
  open: { type: Boolean, default: false },
  cards: { type: Array, default: () => [] },
});

const emit = defineEmits(['toggle']);
</script>

<template>
  <AccordionPanel
    id="section-policy"
    title="Policy snapshot"
    kicker="Engine settings"
    :open="open"
    @toggle="emit('toggle')"
  >
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article
        v-for="card in cards"
        :key="card.title"
        class="rounded-[14px] border border-[#d4dee7] bg-[#eef4f9] p-[18px]"
      >
        <span class="mb-2 block text-[0.82rem] font-bold uppercase tracking-[0.04em] text-[#4b6880]">
          {{ card.title }}
        </span>
        <div class="grid gap-[10px]">
          <div
            v-for="row in card.rows"
            :key="`${card.title}-${row.label}`"
            class="flex items-start justify-between gap-4 border-t border-[#d6e0e9] pt-[10px] first:border-t-0 first:pt-0"
          >
            <small class="text-[0.82rem] font-semibold text-[#6b8195]">{{ row.label }}</small>
            <strong class="max-w-[60%] text-right text-[1rem] leading-[1.4] text-[#143b5f]">
              {{ row.value }}
            </strong>
          </div>
        </div>
      </article>
    </div>
  </AccordionPanel>
</template>
