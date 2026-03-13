<script setup>
// Pipeline counts help explain how aggressively the engine searched and pruned
// candidate restructuring paths.
defineProps({
  items: { type: Array, default: () => [] },
});
</script>

<template>
  <section
    v-if="items.length > 0"
    class="mb-5 rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
  >
    <header class="mb-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
      <h3 class="m-0 text-[1.2rem] font-bold text-[#0f1c2e]">Pipeline counts</h3>
      <span class="text-[0.86rem] font-[550] text-[#293c4f]">
        How many paths were generated, screened, and recommended
      </span>
    </header>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="item in items"
        :key="item.label"
        class="rounded-[14px] bg-[#eef4f9] p-4"
      >
        <span class="block text-[0.86rem] font-[550] text-[#293c4f]">{{ item.label }}</span>
        <strong class="text-[1.6rem] text-[#123b60]">{{ item.value }}</strong>
      </div>
    </div>
  </section>
</template>
