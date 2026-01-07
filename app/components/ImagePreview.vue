<template>
  <div class="image-preview">
    <div class="image-preview__header">
      <h3 class="image-preview__title">{{ title }}</h3>
      <span v-if="imageSize" class="image-preview__size">{{ imageSize }}</span>
      <div v-if="src" class="image-preview__controls">
        <button type="button" class="image-preview__btn" @click="resetView">100%</button>
        <label class="image-preview__zoom">
          <span>{{ Math.round(zoom) }}%</span>
          <input
            v-model.number="zoom"
            type="range"
            min="25"
            max="300"
            step="5"
            @input="handleZoomInput"
          />
        </label>
      </div>
    </div>
    <div
      ref="containerRef"
      class="image-preview__container"
      :class="{ 'is-pannable': !!src }"
      @pointerdown="startPan"
      @pointermove.prevent="onPanMove"
      @pointerup="endPan"
      @pointerleave="endPan"
      @wheel="handleWheel"
    >
      <div
        v-if="src"
        ref="contentRef"
        class="image-preview__content"
        :style="contentStyle"
      >
        <img
          ref="imageRef"
          :src="src"
          :alt="alt"
          class="image-preview__image"
          :style="imageStyle"
          draggable="false"
          @load="handleImageLoad"
        />
      </div>
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
import { computed, onBeforeUnmount, onMounted, ref, toRefs } from 'vue';

interface Props {
  src?: string | null;
  alt?: string;
  title?: string;
  imageSize?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  alt: 'Preview image',
  title: 'Preview',
  imageSize: null,
});

const { src, alt, title, imageSize } = toRefs(props);

const containerRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const zoom = ref(100);
const offsetX = ref(0);
const offsetY = ref(0);
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0, ox: 0, oy: 0 });
const naturalSize = ref({ w: 0, h: 0 });
const containerSize = ref({ w: 0, h: 0 });
let resizeObserver: ResizeObserver | null = null;

const contentStyle = computed(() => ({
  width: `${naturalSize.value.w}px`,
  height: `${naturalSize.value.h}px`,
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${zoom.value / 100})`,
}));

const imageStyle = computed(() => ({
  left: '0px',
  top: '0px',
}));

const updateContainerSize = () => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  containerSize.value = { w: rect.width, h: rect.height };
  clampOffsets();
};

const clampOffsets = () => {
  const scale = zoom.value / 100;
  const w = naturalSize.value.w * scale;
  const h = naturalSize.value.h * scale;
  const cw = containerSize.value.w;
  const ch = containerSize.value.h;
  if (!w || !h) return;

  // Clamp only when image exceeds container; otherwise respect current offset (user can move even if smaller)
  if (w > cw) {
    const minX = cw - w;
    const maxX = 0;
    offsetX.value = Math.min(maxX, Math.max(minX, offsetX.value));
  }

  if (h > ch) {
    const minY = ch - h;
    const maxY = 0;
    offsetY.value = Math.min(maxY, Math.max(minY, offsetY.value));
  }
};

const clampZoom = (value: number) => Math.min(400, Math.max(5, value));

const applyZoom = (nextZoom: number, cursor?: { x: number; y: number }) => {
  const newZoom = clampZoom(nextZoom);
  const oldScale = zoom.value / 100;
  const newScale = newZoom / 100;
  if (!containerRef.value || newScale === oldScale) {
    zoom.value = newZoom;
    return;
  }

  const target = contentRef.value ?? containerRef.value;
  const rect = target.getBoundingClientRect();
  const px = (cursor?.x ?? rect.left + rect.width / 2) - rect.left + target.scrollLeft;
  const py = (cursor?.y ?? rect.top + rect.height / 2) - rect.top + target.scrollTop;

  const imgX = (px - offsetX.value) / oldScale;
  const imgY = (py - offsetY.value) / oldScale;

  offsetX.value = px - imgX * newScale;
  offsetY.value = py - imgY * newScale;
  zoom.value = newZoom;
  clampOffsets();
};

const resetView = () => {
  zoom.value = 100;
  offsetX.value = 0;
  offsetY.value = 0;
  clampOffsets();
};

const handleZoomInput = () => {
  const clamped = clampZoom(zoom.value);
  if (clamped <= 100) {
    offsetX.value = 0;
    offsetY.value = 0;
  }
  zoom.value = clamped;
  clampOffsets();
};

const handleImageLoad = () => {
  if (!imageRef.value) return;
  naturalSize.value = { w: imageRef.value.naturalWidth, h: imageRef.value.naturalHeight };
  updateContainerSize();
  resetView();
};

const startPan = (e: PointerEvent) => {
  if (!src.value || !contentRef.value || !containerRef.value) return;
  const rect = contentRef.value.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) return;
  isPanning.value = true;
  panStart.value = { x: e.clientX, y: e.clientY, ox: offsetX.value, oy: offsetY.value };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const onPanMove = (e: PointerEvent) => {
  if (!isPanning.value) return;
  const scale = zoom.value / 100;
  const dx = (e.clientX - panStart.value.x) / scale;
  const dy = (e.clientY - panStart.value.y) / scale;
  offsetX.value = panStart.value.ox + dx;
  offsetY.value = panStart.value.oy + dy;
  clampOffsets();
};

const endPan = (e: PointerEvent) => {
  if (isPanning.value) {
    isPanning.value = false;
  }
  try {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {
    // ignore
  }
};

const handleWheel = (e: WheelEvent) => {
  if (!contentRef.value || !containerRef.value) return;
  const rect = contentRef.value.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) return;
  // Zoom with modifier key, otherwise pan if zoomed-in
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    e.preventDefault();
    const delta = e.deltaY;
    const step = delta > 0 ? -8 : 8;
    applyZoom(zoom.value + step, { x: e.clientX, y: e.clientY });
  } else if (zoom.value > 100) {
    e.preventDefault();
    const scale = zoom.value / 100;
    offsetX.value -= e.deltaX / scale;
    offsetY.value -= e.deltaY / scale;
    clampOffsets();
  }
};

onMounted(() => {
  if (window && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => updateContainerSize());
    if (containerRef.value) resizeObserver.observe(containerRef.value);
  }
  updateContainerSize();
  clampOffsets();
});

onBeforeUnmount(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
  }
});
</script>

<style scoped>
.image-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.image-preview__header {
  display: flex;
  align-items: center;
  gap: var(--space-12);
}

.image-preview__controls {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  margin-left: auto;
}

.image-preview__btn {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.image-preview__btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-primary);
}

.image-preview__zoom {
  display: inline-flex;
  align-items: center;
  gap: var(--space-8);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.image-preview__zoom input[type='range'] {
  width: 140px;
}

.image-preview__container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  background: repeating-conic-gradient(#f5f5f5 0% 25%, #eaeaea 0% 50%);
  background-size: 24px 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  touch-action: pinch-zoom;
}

.image-preview__container.is-pannable {
  cursor: grab;
}

.image-preview__container.is-pannable:active {
  cursor: grabbing;
}

.image-preview__content {
  position: relative;
  overflow: hidden;
  transform-origin: top left;
}

.image-preview__image {
  max-width: none;
  max-height: none;
  position: absolute;
  transform-origin: top left;
  user-select: none;
  transition: transform 0.05s linear;
}

.image-preview__placeholder {
  display: grid;
  place-items: center;
  color: var(--color-text-tertiary);
}

.image-preview__placeholder svg {
  width: 48px;
  height: 48px;
}
</style>

