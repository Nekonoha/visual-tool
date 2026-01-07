<template>
  <div class="slider">
    <div class="slider__header">
      <label v-if="label" :for="id" class="slider__label">{{ label }}</label>
      <div class="slider__controls" v-if="showInput">
        <button class="slider__step" type="button" @click="stepDown" :disabled="disabled">
          −
        </button>
        <input
          class="slider__number"
          type="number"
          :value="displayValue"
          :step="step"
          :min="min"
          :max="max"
          :disabled="disabled"
          @input="handleNumberInput"
          @change="handleNumberChange"
        />
        <button class="slider__step" type="button" @click="stepUp" :disabled="disabled">
          ＋
        </button>
      </div>
      <span v-else class="slider__value">{{ displayValue }}{{ unit }}</span>
    </div>
    <div class="slider__track">
      <input
        :id="id"
        type="range"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        class="slider__input"
        @input="handleInput"
        @change="handleChange"
        @pointerdown="handlePointerDown"
      />
      <div class="slider__fill" :style="{ width: getPercentage() + '%' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue';

interface Props {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  showInput?: boolean;
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: number): void;
  (e: 'change', value: number): void;
  (e: 'drag-start', value: number): void;
  (e: 'drag-end', value: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  unit: '',
  showInput: true,
  disabled: false,
});

const emit = defineEmits<Emits>();

const id = ref(`slider-${Math.random().toString(36).substr(2, 9)}`);
const isDragging = ref(false);
const lastValue = ref(props.modelValue);

const decimals = computed(() => {
  if (!props.step) return 0;
  const stepStr = props.step.toString();
  const dot = stepStr.indexOf('.');
  return dot === -1 ? 0 : stepStr.length - dot - 1;
});

const displayValue = computed(() => props.modelValue.toFixed(decimals.value));

const handleInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).valueAsNumber;
  lastValue.value = value;
  emit('update:modelValue', value);
};

const handleChange = (e: Event) => {
  const value = (e.target as HTMLInputElement).valueAsNumber;
  lastValue.value = value;
  emit('change', value);
};

const clamp = (val: number) => {
  const min = props.min ?? Number.NEGATIVE_INFINITY;
  const max = props.max ?? Number.POSITIVE_INFINITY;
  return Math.min(max, Math.max(min, val));
};

const commitValue = (val: number) => {
  const v = clamp(val);
  lastValue.value = v;
  emit('update:modelValue', v);
  emit('change', v);
};

const handleNumberInput = (e: Event) => {
  const value = Number((e.target as HTMLInputElement).value);
  const v = clamp(isNaN(value) ? props.min ?? 0 : value);
  lastValue.value = v;
  emit('update:modelValue', v);
};

const handleNumberChange = (e: Event) => {
  const value = Number((e.target as HTMLInputElement).value);
  commitValue(isNaN(value) ? props.min ?? 0 : value);
};

const stepUp = () => {
  const next = lastValue.value + props.step;
  commitValue(next);
};

const stepDown = () => {
  const next = lastValue.value - props.step;
  commitValue(next);
};

const handlePointerDown = (e: PointerEvent) => {
  isDragging.value = true;
  emit('drag-start', lastValue.value);
  const target = e.currentTarget as HTMLElement;
  target?.setPointerCapture?.(e.pointerId);
  window.addEventListener('pointerup', handlePointerUp, { once: true });
};

const handlePointerUp = (e: PointerEvent) => {
  if (!isDragging.value) return;
  isDragging.value = false;
  emit('drag-end', lastValue.value);
  const target = e.target as HTMLElement | null;
  target?.releasePointerCapture?.(e.pointerId);
};

const getPercentage = () => {
  const range = props.max - props.min;
  const position = props.modelValue - props.min;
  return (position / range) * 100;
};

watch(
  () => props.modelValue,
  (val) => {
    lastValue.value = val;
  }
);

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', handlePointerUp);
});
</script>

