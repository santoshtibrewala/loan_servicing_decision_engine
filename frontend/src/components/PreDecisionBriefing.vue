<script setup>
// The briefing card takes normalized section data so business ordering can be
// changed in App.vue without editing the presentational markup.
defineProps({
  sections: { type: Array, default: () => [] },
  open: { type: Boolean, default: true },
});

const emit = defineEmits(['toggle']);
</script>

<template>
  <section class="mb-5 rounded-[18px] border border-brand-line bg-brand-panel p-6 shadow-[0_14px_34px_rgba(8,45,76,0.06)]">
    <button
      class="mb-[18px] flex w-full cursor-pointer items-center justify-between gap-4 bg-transparent text-left"
      @click="emit('toggle')"
    >
      <div>
        <span class="mb-2 block text-[0.78rem] font-bold uppercase tracking-[0.11em] text-[#0c4a76]">
          Case summary
        </span>
        <h2 class="m-0 text-[1.45rem] font-bold text-[#0f1c2e]">Pre-decision briefing</h2>
      </div>
      <span class="text-[0.92rem] font-semibold text-[#35536a]">
        {{ open ? 'Collapse' : 'Expand' }}
      </span>
    </button>

    <div v-if="open" class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <article
        v-for="section in sections"
        :key="section.title"
        class="rounded-[14px] border border-[#d4dee7] bg-[#eef4f9] p-[18px]"
      >
        <span class="mb-2 block text-[0.82rem] font-bold uppercase tracking-[0.04em] text-[#4b6880]">
          {{ section.title }}
        </span>
        <div class="grid gap-[10px]">
          <div
            v-for="item in section.items"
            :key="`${section.title}-${item.label}`"
            class="flex items-start justify-between gap-4 border-t border-[#d6e0e9] pt-[10px] first:border-t-0 first:pt-0"
          >
            <small class="text-[0.82rem] font-semibold text-[#6b8195]">{{ item.label }}</small>
            <div v-if="Array.isArray(item.value)" class="grid max-w-[60%] justify-items-end gap-1.5">
              <strong
                v-for="line in item.value"
                :key="`${section.title}-${item.label}-${line}`"
                class="text-right text-[1rem] leading-[1.4] text-[#143b5f]"
              >
                {{ line }}
              </strong>
            </div>
            <strong v-else class="max-w-[60%] text-right text-[1rem] leading-[1.4] text-[#143b5f]">
              {{ item.value }}
            </strong>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
