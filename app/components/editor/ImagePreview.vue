<template>
  <div class="image-preview">
    <div class="image-preview__header">
      <h3 class="image-preview__title">{{ title }}</h3>
      <span v-if="imageSize" class="image-preview__size">{{ imageSize }}</span>
      <div v-if="src" class="image-preview__controls">
        <button type="button" class="image-preview__btn" @click="fitToView" title="フィット">Fit</button>
        <button type="button" class="image-preview__btn" @click="resetView" title="等倍表示">100%</button>
        <label class="image-preview__zoom">
          <span>{{ Math.round(zoom) }}%</span>
          <input
            v-model.number="zoom"
            type="range"
            min="10"
            max="400"
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
      @wheel.prevent="handleWheel"
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
import { computed, onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';

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

// マージン設定（コンテナ内での余白）
const MARGIN = 24;

const contentStyle = computed(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${zoom.value / 100})`,
  transformOrigin: '0 0',
  width: `${naturalSize.value.w}px`,
  height: `${naturalSize.value.h}px`,
}));

const updateContainerSize = () => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  containerSize.value = { w: rect.width, h: rect.height };
};

// 画像を中央に配置するオフセットを計算
const getCenteredOffset = () => {
  const scale = zoom.value / 100;
  const scaledW = naturalSize.value.w * scale;
  const scaledH = naturalSize.value.h * scale;
  const cw = containerSize.value.w;
  const ch = containerSize.value.h;
  return {
    x: (cw - scaledW) / 2,
    y: (ch - scaledH) / 2,
  };
};

// 画像がコンテナ外に出すぎないよう制限（ただし余裕を持たせる）
const clampOffsets = () => {
  const scale = zoom.value / 100;
  const scaledW = naturalSize.value.w * scale;
  const scaledH = naturalSize.value.h * scale;
  const cw = containerSize.value.w;
  const ch = containerSize.value.h;
  if (!scaledW || !scaledH || !cw || !ch) return;

  // 画像の少なくとも一部（MARGIN分）がコンテナ内に見えるよう制限
  const minX = MARGIN - scaledW;
  const maxX = cw - MARGIN;
  const minY = MARGIN - scaledH;
  const maxY = ch - MARGIN;

  offsetX.value = Math.min(maxX, Math.max(minX, offsetX.value));
  offsetY.value = Math.min(maxY, Math.max(minY, offsetY.value));
};

const clampZoom = (value: number) => Math.min(800, Math.max(5, value));

const applyZoom = (nextZoom: number, cursor?: { x: number; y: number }) => {
  const newZoom = clampZoom(nextZoom);
  const oldScale = zoom.value / 100;
  const newScale = newZoom / 100;
  if (!containerRef.value || newScale === oldScale) {
    zoom.value = newZoom;
    return;
  }

  // カーソル位置を基準にズーム
  const containerRect = containerRef.value.getBoundingClientRect();
  const cx = cursor?.x ?? containerRect.left + containerRect.width / 2;
  const cy = cursor?.y ?? containerRect.top + containerRect.height / 2;
  
  // コンテナ内でのカーソル位置
  const px = cx - containerRect.left;
  const py = cy - containerRect.top;

  // 現在のスケールでの画像上の位置
  const imgX = (px - offsetX.value) / oldScale;
  const imgY = (py - offsetY.value) / oldScale;

  // 新しいオフセットを計算（カーソル位置が同じ画像位置を指すように）
  offsetX.value = px - imgX * newScale;
  offsetY.value = py - imgY * newScale;
  zoom.value = newZoom;
  clampOffsets();
};

// 画像をコンテナにフィットさせる
const fitToView = () => {
  if (!naturalSize.value.w || !naturalSize.value.h) return;
  const cw = containerSize.value.w - MARGIN * 2;
  const ch = containerSize.value.h - MARGIN * 2;
  const scaleX = cw / naturalSize.value.w;
  const scaleY = ch / naturalSize.value.h;
  const fitScale = Math.min(scaleX, scaleY, 1) * 100; // 100%以上にはしない
  zoom.value = Math.max(10, fitScale);
  const centered = getCenteredOffset();
  offsetX.value = centered.x;
  offsetY.value = centered.y;
};

// 100%表示で中央配置
const resetView = () => {
  zoom.value = 100;
  const centered = getCenteredOffset();
  offsetX.value = centered.x;
  offsetY.value = centered.y;
};

const handleZoomInput = () => {
  const clamped = clampZoom(zoom.value);
  zoom.value = clamped;
  // ズーム変更時は中央を維持
  const centered = getCenteredOffset();
  offsetX.value = centered.x;
  offsetY.value = centered.y;
};

const handleImageLoad = () => {
  if (!imageRef.value) return;
  naturalSize.value = { w: imageRef.value.naturalWidth, h: imageRef.value.naturalHeight };
  updateContainerSize();
  // 初期表示はフィット
  fitToView();
};

const startPan = (e: PointerEvent) => {
  if (!src.value || !containerRef.value) return;
  isPanning.value = true;
  panStart.value = { x: e.clientX, y: e.clientY, ox: offsetX.value, oy: offsetY.value };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const onPanMove = (e: PointerEvent) => {
  if (!isPanning.value) return;
  const dx = e.clientX - panStart.value.x;
  const dy = e.clientY - panStart.value.y;
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
  if (!containerRef.value) return;
  // ホイールで直接ズーム（修飾キー不要）
  const delta = e.deltaY;
  const step = delta > 0 ? -10 : 10;
  applyZoom(zoom.value + step, { x: e.clientX, y: e.clientY });
};

// srcが変わったら初期化
watch(src, () => {
  if (src.value) {
    // 画像が変わったらリセット（handleImageLoadで再計算される）
  } else {
    naturalSize.value = { w: 0, h: 0 };
    zoom.value = 100;
    offsetX.value = 0;
    offsetY.value = 0;
  }
});

onMounted(() => {
  if (window && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerSize();
      clampOffsets();
    });
    if (containerRef.value) resizeObserver.observe(containerRef.value);
  }
  updateContainerSize();
});

onBeforeUnmount(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
  }
});
</script>

