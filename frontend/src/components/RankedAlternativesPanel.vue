<script setup>
import { useFormatters } from '../composables/useFormatters';

// Ranked alternatives keep the decision explainable by showing the lender that
// the top recommendation is still part of a broader screened set.
defineProps({
  baselineRow: { type: Object, required: true },
  scenarios: { type: Array, default: () => [] },
  selectedScenarioId: { type: String, default: '' },
});

const emit = defineEmits(['select']);
const { currencyCompact, percent } = useFormatters();

function scenarioTone(scenario) {
  if (scenario.status === 'rejected') {
    return {
      card: 'border-[#efb7b3] bg-[#fff5f4]',
      title: 'text-[#b42318]',
      metric: 'text-[#b42318]',
    };
  }
  if (scenario.status === 'valid and recommendable') {
    return {
      card: 'border-[#9fd7b2] bg-[#f2fbf5]',
      title: 'text-[#0f7b3d]',
      metric: 'text-[#0f7b3d]',
    };
  }
  return {
    card: '',
    title: 'text-[#0e365a]',
    metric: 'text-[#0e365a]',
  };
}

function flagTone(flag) {
  const isNegative =
    flag.includes('Failed') ||
    flag.includes('Not Allowed') ||
    flag.includes('Review') ||
    flag.includes('Required');
  return isNegative
    ? 'border-[#efb7b3] bg-[#fff1f0] text-[#b42318]'
    : 'border-[#a8d8b5] bg-[#eefbf2] text-[#0f7b3d]';
}
</script>

<template>
  <article class="rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
    <header class="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
      <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">Ranked alternatives</h3>
      <span class="text-[0.86rem] font-[550] text-[#293c4f]">Lender can still choose from the ranked set</span>
    </header>
    <div class="grid gap-[14px]">
      <div class="flex cursor-default justify-between gap-4 rounded-[14px] border border-[#d2dde8] bg-[#f7fafc] p-4">
        <div>
          <strong class="text-[#0e365a]">{{ baselineRow.label }}</strong>
          <span class="mt-1 block text-[0.86rem] font-[550] text-[#293c4f]">{{ baselineRow.description }}</span>
        </div>
        <div class="text-right">
          <strong class="block text-[#0e365a]">{{ currencyCompact(baselineRow.annualPayment) }}</strong>
          <span class="block text-[0.86rem] font-[550] text-[#293c4f]">{{ currencyCompact(baselineRow.cashMargin) }}</span>
        </div>
      </div>

      <button
        v-for="scenario in scenarios"
        :key="scenario.id"
        class="flex justify-between gap-4 rounded-[14px] border border-[#d2dde8] bg-white p-4 text-left"
        :class="[
          scenarioTone(scenario).card,
          selectedScenarioId === scenario.id ? 'border-[#1a6fb0] bg-[#edf6fd]' : '',
        ]"
        @click="emit('select', scenario.id)"
      >
        <div>
          <strong :class="scenarioTone(scenario).title">#{{ scenario.rank }} {{ scenario.outcomeCode }}</strong>
          <span class="mt-1 block text-[0.86rem] font-[550] text-[#293c4f]">{{ scenario.rationale }}</span>
          <div v-if="scenario.flags?.length" class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="flag in scenario.flags"
              :key="`${scenario.id}-${flag}`"
              class="inline-flex items-center rounded-full border px-2 py-1 text-[0.75rem] font-bold"
              :class="flagTone(flag)"
            >
              {{ flag }}
            </span>
          </div>
        </div>
        <div class="text-right">
          <strong class="block" :class="scenarioTone(scenario).metric">{{ scenario.score }}</strong>
          <span class="block text-[0.86rem] font-[550] text-[#293c4f]">{{ percent(scenario.firstYearMetrics.cashFlowMargin) }}</span>
        </div>
      </button>
    </div>
  </article>
</template>
