<script setup>
// This component is intentionally generic so the same bar treatment can be
// reused if more scenario metrics are added later.
defineProps({
  outcomeSeries: { type: Array, default: () => [] },
  graphPercent: { type: Function, required: true },
});
</script>

<template>
  <article class="rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
    <header class="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
      <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">Outcome graph</h3>
      <span class="text-[0.86rem] font-[550] text-[#293c4f]">
        Selected scenario across affordability and protection measures
      </span>
    </header>
    <div v-if="outcomeSeries.length > 0" class="grid gap-[18px]">
      <div v-for="item in outcomeSeries" :key="item.label" class="grid gap-2">
        <div class="flex justify-between gap-3">
          <strong>{{ item.label }}</strong>
          <span class="text-[0.86rem] font-[550] text-[#293c4f]">{{ item.displayValue }}</span>
        </div>
        <div class="relative h-[14px] overflow-hidden rounded-full bg-[#e3ebf3]">
          <div
            class="absolute top-[-2px] bottom-[-2px] w-[2px] bg-[rgba(255,90,42,0.9)]"
            :style="{ left: graphPercent(item.target, item.max) }"
          ></div>
          <div
            class="h-full rounded-full"
            :class="{
              'bg-[linear-gradient(90deg,#1e8a92,#52d0bd)]': item.tone === 'teal',
              'bg-[linear-gradient(90deg,#0b578e,#3e8fd4)]': item.tone === 'blue',
              'bg-[linear-gradient(90deg,#d96533,#ff8a45)]': item.tone === 'orange',
              'bg-[linear-gradient(90deg,#042d51,#165d8e)]': item.tone === 'navy',
            }"
            :style="{ width: graphPercent(item.value, item.max) }"
          ></div>
        </div>
      </div>
    </div>
  </article>
</template>
