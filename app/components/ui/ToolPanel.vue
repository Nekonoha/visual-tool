<template>
  <div class="tool-panel">
    <div class="tool-panel__header">
      <h2 class="tool-panel__title">{{ title }}</h2>
      <button v-if="showClose" class="tool-panel__close" @click="$emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="tool-panel__content">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="tool-panel__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  showClose?: boolean;
}

interface Emits {
  (e: 'close'): void;
}

withDefaults(defineProps<Props>(), {
  title: 'Tool',
  showClose: true,
});

defineEmits<Emits>();
</script>

