<script setup>
// This card intentionally stays read-only. App.vue owns the calculation data
// while the component focuses on table presentation and print intent.
defineProps({
  rows: { type: Array, default: () => [] },
});

const emit = defineEmits(['print']);

function toneClass(tone) {
  if (tone === 'danger') {
    return 'text-[#b42318]';
  }
  if (tone === 'success') {
    return 'text-[#0f7b3d]';
  }
  return 'text-[#0f1c2e]';
}
</script>

<template>
  <section
    class="mb-5 rounded-[18px] border border-[#c4d3e0] bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
  >
    <header class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">Calculation detail worksheet</h3>
        <span class="text-[0.86rem] font-[550] text-[#293c4f]">
          Line-by-line view of how the selected recommendation is derived
        </span>
      </div>
      <button
        class="min-w-[220px] rounded-xl bg-[linear-gradient(180deg,#0d5d96,#083f68)] px-[18px] py-[14px] font-bold text-[#f7fbff]"
        @click="emit('print')"
      >
        Print worksheet
      </button>
    </header>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[860px] border-collapse">
        <thead>
          <tr>
            <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Category</th>
            <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Metric</th>
            <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Formula / basis</th>
            <th class="border-b border-[#d8e1e9] px-[10px] py-3 text-left text-[0.82rem] uppercase tracking-[0.05em] text-[#476178]">Result</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="`${row.category}-${row.metric}`">
            <td class="border-b border-[#d8e1e9] px-[10px] py-3 align-top">{{ row.category }}</td>
            <td class="border-b border-[#d8e1e9] px-[10px] py-3 align-top"><strong>{{ row.metric }}</strong></td>
            <td class="border-b border-[#d8e1e9] px-[10px] py-3 align-top">{{ row.formula }}</td>
            <td class="border-b border-[#d8e1e9] px-[10px] py-3 align-top">
              <strong :class="toneClass(row.tone)">{{ row.value }}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
