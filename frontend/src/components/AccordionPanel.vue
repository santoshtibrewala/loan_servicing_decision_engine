<script setup>
// Reusable accordion shell for the large editable sections in the workspace.
defineProps({
  id: { type: String, default: '' },
  title: { type: String, required: true },
  kicker: { type: String, default: '' },
  open: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle']);
</script>

<template>
  <article
    :id="id"
    class="rounded-[18px] border border-brand-line bg-brand-panel shadow-[0_14px_34px_rgba(8,45,76,0.06)]"
  >
    <button
      class="flex w-full cursor-pointer items-center justify-between gap-4 bg-transparent px-[22px] py-[22px] text-left"
      @click="emit('toggle')"
    >
      <div>
        <span
          v-if="kicker"
          class="mb-2 block text-[0.78rem] font-bold uppercase tracking-[0.11em] text-[#0c4a76]"
        >
          {{ kicker }}
        </span>
        <h2 class="m-0 text-[1.35rem] font-bold text-[#0f1c2e]">{{ title }}</h2>
      </div>
      <span class="text-[0.92rem] font-semibold text-[#35536a]">
        {{ open ? 'Collapse' : 'Expand' }}
      </span>
    </button>
    <div v-if="open" class="px-[22px] pb-[22px]">
      <slot />
    </div>
  </article>
</template>
