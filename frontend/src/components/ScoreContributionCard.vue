<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  finalScore: { type: Number, default: 0 },
  scoringSummaryRows: { type: Array, default: () => [] },
  scoringMechanism: { type: Array, default: () => [] },
});

function toneClasses(tone) {
  if (tone === 'green') {
    return {
      pill: 'bg-[#eefbf2] text-[#0f7b3d] border-[#a8d8b5]',
      bar: 'bg-[linear-gradient(90deg,#0f7b3d,#53b76f)]',
    };
  }
  if (tone === 'orange') {
    return {
      pill: 'bg-[#fff4eb] text-[#b35a12] border-[#f2c59c]',
      bar: 'bg-[linear-gradient(90deg,#d97706,#f59e0b)]',
    };
  }
  return {
    pill: 'bg-[#edf6fd] text-[#123b60] border-[#c7d8e7]',
    bar: 'bg-[linear-gradient(90deg,#0b578e,#3e8fd4)]',
  };
}
</script>

<template>
  <section
    v-if="items.length > 0"
    class="mb-5 rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
  >
    <header
      class="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between"
    >
      <div>
        <span
          class="mb-2 block text-[0.78rem] font-bold uppercase tracking-[0.11em] text-[#0c4a76]"
        >
          Scoring Graph
        </span>
        <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">
          Score contribution breakdown
        </h3>
      </div>
      <div class="rounded-[14px] bg-[#0b3d68] px-4 py-3 text-white">
        <span class="block text-[0.84rem] text-[#bcd3e5]">Final score</span>
        <strong class="text-[1.5rem] leading-none">{{
          finalScore.toFixed(2)
        }}</strong>
      </div>
    </header>

    <div class="grid gap-3">
      <article
        v-for="item in items"
        :key="item.key"
        class="rounded-[14px] border border-[#d8e1e9] bg-[#f8fafc] p-4"
      >
        <div
          class="mb-2 flex flex-col gap-2 md:flex-row md:items-start md:justify-between"
        >
          <div>
            <strong class="text-[#0f1c2e]">{{ item.label }}</strong>
            <span class="mt-1 block text-[0.86rem] text-[#516779]">
              {{ item.summary }}
            </span>
          </div>
          <div
            class="inline-flex items-center rounded-full border px-3 py-1 text-[0.8rem] font-bold"
            :class="toneClasses(item.tone).pill"
          >
            Contribution {{ item.contribution.toFixed(2) }}
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div class="grid gap-2">
            <div
              class="h-[12px] overflow-hidden rounded-full bg-[#e3ebf3] mt-2"
            >
              <div
                class="h-full rounded-full"
                :class="toneClasses(item.tone).bar"
                :style="{ width: `${item.barWidth}%` }"
              ></div>
            </div>
            <div
              class="flex flex-wrap gap-x-4 gap-y-1 text-[0.84rem] text-[#5d7387]"
            >
              <span>Raw score {{ item.rawScore.toFixed(2) }}</span>
              <span>Weight {{ item.weightLabel }}</span>
              <span
                >Weighted contribution {{ item.contribution.toFixed(2) }}</span
              >
            </div>
          </div>
          <div class="text-[0.88rem] leading-6 text-[#294051]">
            {{ item.explanation }}
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
