<script setup>
import { useFormatters } from '../composables/useFormatters';

// Comparison cards are designed for tradeoff review, so each card carries both
// action badges and the policy flags that may matter to an underwriter.
defineProps({
  scenarios: { type: Array, default: () => [] },
});

const emit = defineEmits(['select']);
const { currencyCompact, formatActionLabel } = useFormatters();

function scenarioTone(scenario) {
  if (scenario.outcomeCode === 'REJECTED') {
    return {
      card: 'border-[#efb7b3] bg-[#fff5f4]',
      title: 'text-[#b42318]',
    };
  }
  if (scenario.rank === 1) {
    return {
      card: 'border-[#9fd7b2] bg-[#f2fbf5]',
      title: 'text-[#0f7b3d]',
    };
  }
  return {
    card: '',
    title: 'text-[#0e365a]',
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
  <section
    v-if="scenarios.length > 0"
    class="mb-5 rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
  >
    <header class="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
      <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">Recommendation comparison</h3>
      <span class="text-[0.86rem] font-[550] text-[#293c4f]">Top 3 ranked paths shown side by side</span>
    </header>
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <button
        v-for="scenario in scenarios"
        :key="scenario.id"
        class="grid gap-3 rounded-[14px] border border-[#d2dde8] bg-white p-4 text-left transition"
        :class="[
          scenarioTone(scenario).card,
          scenario.isSelected ? 'border-[#1a6fb0] bg-[#edf6fd]' : '',
        ]"
        @click="emit('select', scenario.id)"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <strong :class="scenarioTone(scenario).title">#{{ scenario.rank }} {{ scenario.outcomeCode }}</strong>
            <span class="mt-1 block text-[0.86rem] font-[550] text-[#293c4f]">
              {{ scenario.actionSummary }}
            </span>
          </div>
          <strong class="text-[#0e365a]">{{ scenario.score }}</strong>
        </div>

        <div class="flex flex-wrap gap-2">
          <span
            v-for="badge in scenario.actionBadges"
            :key="`${scenario.id}-${badge}`"
            class="inline-flex items-center rounded-full border border-[#c7d8e7] bg-[#edf6fd] px-2 py-1 text-[0.75rem] font-bold text-[#123b60]"
          >
            {{ formatActionLabel(badge) }}
          </span>
          <span
            v-for="flag in scenario.flags"
            :key="`${scenario.id}-${flag}`"
            class="inline-flex items-center rounded-full border px-2 py-1 text-[0.75rem] font-bold"
            :class="flagTone(flag)"
          >
            {{ flag }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="grid gap-1">
            <span class="text-[0.86rem] font-[550] text-[#293c4f]">Score</span>
            <strong class="text-[#123b60]">{{ scenario.score }}</strong>
            <div class="h-[10px] overflow-hidden rounded-full bg-[#e3ebf3]">
              <div class="h-full rounded-full bg-[linear-gradient(90deg,#042d51,#165d8e)]" :style="{ width: `${scenario.scoreWidth}%` }"></div>
            </div>
          </div>
          <div class="grid gap-1">
            <span class="text-[0.86rem] font-[550] text-[#293c4f]">Annual payment</span>
            <strong class="text-[#123b60]">{{ currencyCompact(scenario.annualPayment) }}</strong>
            <div class="h-[10px] overflow-hidden rounded-full bg-[#e3ebf3]">
              <div class="h-full rounded-full bg-[linear-gradient(90deg,#d96533,#ff8a45)]" :style="{ width: `${scenario.annualPaymentWidth}%` }"></div>
            </div>
          </div>
          <div class="grid gap-1">
            <span class="text-[0.86rem] font-[550] text-[#293c4f]">Cash retained</span>
            <strong class="text-[#123b60]">{{ currencyCompact(scenario.retainedCash) }}</strong>
            <div class="h-[10px] overflow-hidden rounded-full bg-[#e3ebf3]">
              <div class="h-full rounded-full bg-[linear-gradient(90deg,#1e8a92,#52d0bd)]" :style="{ width: `${scenario.retainedCashWidth}%` }"></div>
            </div>
          </div>
          <div class="grid gap-1">
            <span class="text-[0.86rem] font-[550] text-[#293c4f]">Coverage ratio</span>
            <strong class="text-[#123b60]">{{ scenario.coverageRatio.toFixed(2) }}x</strong>
            <div class="h-[10px] overflow-hidden rounded-full bg-[#e3ebf3]">
              <div class="h-full rounded-full bg-[linear-gradient(90deg,#0b578e,#3e8fd4)]" :style="{ width: `${scenario.coverageWidth}%` }"></div>
            </div>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>
