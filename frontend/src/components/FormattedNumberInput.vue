<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: { type: [Number, String], default: 0 },
  kind: { type: String, default: 'number' },
  scale: { type: Number, default: 1 },
  decimals: { type: Number, default: 0 },
  min: { type: Number, default: Number.NEGATIVE_INFINITY },
  max: { type: Number, default: Number.POSITIVE_INFINITY },
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur']);
const isFocused = ref(false);
const editValue = ref('');

const numberFormatter = computed(
  () =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: props.decimals,
      maximumFractionDigits: props.decimals,
    }),
);

const inputMode = computed(() =>
  props.decimals > 0 || props.scale !== 1 ? 'decimal' : 'numeric',
);

function toNumber(value) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clamp(value) {
  return Math.min(Math.max(value, props.min), props.max);
}

function scaledValue(value) {
  return toNumber(value) * props.scale;
}

function sanitizeInput(value) {
  const stripped = String(value ?? '').replace(/[^0-9.-]/g, '');
  const negative = stripped.startsWith('-') ? '-' : '';
  const unsigned = stripped.replace(/-/g, '');
  const [integerPart = '', ...fractionParts] = unsigned.split('.');
  const fractionPart = fractionParts.join('');
  return `${negative}${integerPart}${fractionParts.length > 0 ? `.${fractionPart}` : ''}`;
}

function formatDisplay(value) {
  const formatted = numberFormatter.value.format(scaledValue(value));
  if (props.kind === 'amount') {
    return `$${formatted}`;
  }
  if (props.kind === 'percent') {
    return `${formatted}%`;
  }
  return formatted;
}

const displayValue = computed(() =>
  isFocused.value ? editValue.value : formatDisplay(props.modelValue),
);

function emitParsedValue(rawValue) {
  const sanitized = sanitizeInput(rawValue);
  if (
    sanitized === '' ||
    sanitized === '-' ||
    sanitized === '.' ||
    sanitized === '-.'
  ) {
    return;
  }
  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed)) {
    return;
  }
  emit('update:modelValue', clamp(parsed / props.scale));
}

function handleFocus(event) {
  isFocused.value = true;
  editValue.value = String(scaledValue(props.modelValue));
  emit('focus', event);
}

function handleInput(event) {
  const sanitized = sanitizeInput(event.target.value);
  editValue.value = sanitized;
  emitParsedValue(sanitized);
}

function handleBlur(event) {
  if (
    editValue.value === '' ||
    editValue.value === '-' ||
    editValue.value === '.' ||
    editValue.value === '-.'
  ) {
    emit('update:modelValue', clamp(0));
  }
  isFocused.value = false;
  emit('blur', event);
}
</script>

<template>
  <input
    type="text"
    :inputmode="inputMode"
    :value="displayValue"
    @focus="handleFocus"
    @input="handleInput"
    @blur="handleBlur"
  />
</template>
