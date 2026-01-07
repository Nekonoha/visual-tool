<template>
  <div class="image-preview">
    <div class="image-preview__header">
      <h3 class="image-preview__title">{{ title }}</h3>
      <span v-if="imageSize" class="image-preview__size">{{ imageSize }}</span>
    </div>
    <div class="image-preview__container">
      <img v-if="src" :src="src" :alt="alt" class="image-preview__image" />
      <div v-else class="image-preview__placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  src?: string | null;
  alt?: string;
  title?: string;
  imageSize?: string | null;
}

withDefaults(defineProps<Props>(), {
  src: null,
  alt: 'Preview image',
  title: 'Preview',
  imageSize: null,
});
</script>

