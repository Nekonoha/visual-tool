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
      <canvas
        v-if="src"
        ref="canvasRef"
        class="image-preview__canvas"
      />
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
import { onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';

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

const { src, title, imageSize } = toRefs(props);

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const zoom = ref(100);
const offsetX = ref(0);
const offsetY = ref(0);
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0, ox: 0, oy: 0 });
const naturalSize = ref({ w: 0, h: 0 });
const containerSize = ref({ w: 0, h: 0 });
const loadedImage = ref<HTMLImageElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let animationFrameId: number | null = null;

// マージン設定
const MARGIN = 24;

/**
 * コンテナサイズを更新
 */
const updateContainerSize = () => {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  containerSize.value = { w: rect.width, h: rect.height };
  updateCanvasSize();
};

/**
 * Canvasサイズを更新
 */
const updateCanvasSize = () => {
  if (!canvasRef.value || !containerRef.value) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = containerRef.value.getBoundingClientRect();
  
  // CSSサイズを設定
  canvasRef.value.style.width = `${rect.width}px`;
  canvasRef.value.style.height = `${rect.height}px`;
  
  // 実際のピクセルサイズを設定（高解像度対応）
  canvasRef.value.width = rect.width * dpr;
  canvasRef.value.height = rect.height * dpr;
  
  requestRender();
};

/**
 * 描画をリクエスト（RAF使用）
 */
const requestRender = () => {
  if (animationFrameId !== null) return;
  animationFrameId = requestAnimationFrame(() => {
    render();
    animationFrameId = null;
  });
};

/**
 * Canvasに画像を描画
 */
const render = () => {
  if (!canvasRef.value || !loadedImage.value) return;
  
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvasRef.value.width;
  const canvasHeight = canvasRef.value.height;
  
  // クリア
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // スケールを適用（DPR対応）
  ctx.save();
  ctx.scale(dpr, dpr);
  
  // チェッカーボード背景（透明部分の表示用）
  drawCheckerboard(ctx, containerSize.value.w, containerSize.value.h);
  
  // 画像描画
  const scale = zoom.value / 100;
  const drawWidth = naturalSize.value.w * scale;
  const drawHeight = naturalSize.value.h * scale;
  
  ctx.drawImage(
    loadedImage.value,
    offsetX.value,
    offsetY.value,
    drawWidth,
    drawHeight
  );
  
  ctx.restore();
};

/**
 * チェッカーボード背景を描画（透明部分の視覚化）
 */
const drawCheckerboard = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const size = 8;
  const color1 = '#f0f0f0';
  const color2 = '#e0e0e0';
  
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? color1 : color2;
      ctx.fillRect(x, y, size, size);
    }
  }
};

/**
 * 中央配置のオフセットを計算
 */
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

/**
 * オフセットをクランプ
 */
const clampOffsets = () => {
  const scale = zoom.value / 100;
  const scaledW = naturalSize.value.w * scale;
  const scaledH = naturalSize.value.h * scale;
  const cw = containerSize.value.w;
  const ch = containerSize.value.h;
  if (!scaledW || !scaledH || !cw || !ch) return;

  const minX = MARGIN - scaledW;
  const maxX = cw - MARGIN;
  const minY = MARGIN - scaledH;
  const maxY = ch - MARGIN;

  offsetX.value = Math.min(maxX, Math.max(minX, offsetX.value));
  offsetY.value = Math.min(maxY, Math.max(minY, offsetY.value));
};

const clampZoom = (value: number) => Math.min(800, Math.max(5, value));

/**
 * ズーム適用（カーソル位置基準）
 */
const applyZoom = (nextZoom: number, cursor?: { x: number; y: number }) => {
  const newZoom = clampZoom(nextZoom);
  const oldScale = zoom.value / 100;
  const newScale = newZoom / 100;
  if (!containerRef.value || newScale === oldScale) {
    zoom.value = newZoom;
    requestRender();
    return;
  }

  const containerRect = containerRef.value.getBoundingClientRect();
  const cx = cursor?.x ?? containerRect.left + containerRect.width / 2;
  const cy = cursor?.y ?? containerRect.top + containerRect.height / 2;
  
  const px = cx - containerRect.left;
  const py = cy - containerRect.top;

  const imgX = (px - offsetX.value) / oldScale;
  const imgY = (py - offsetY.value) / oldScale;

  offsetX.value = px - imgX * newScale;
  offsetY.value = py - imgY * newScale;
  zoom.value = newZoom;
  clampOffsets();
  requestRender();
};

/**
 * フィット表示
 */
const fitToView = () => {
  if (!naturalSize.value.w || !naturalSize.value.h) return;
  const cw = containerSize.value.w - MARGIN * 2;
  const ch = containerSize.value.h - MARGIN * 2;
  const scaleX = cw / naturalSize.value.w;
  const scaleY = ch / naturalSize.value.h;
  const fitScale = Math.min(scaleX, scaleY, 1) * 100;
  zoom.value = Math.max(10, fitScale);
  const centered = getCenteredOffset();
  offsetX.value = centered.x;
  offsetY.value = centered.y;
  requestRender();
};

/**
 * 100%表示
 */
const resetView = () => {
  zoom.value = 100;
  const centered = getCenteredOffset();
  offsetX.value = centered.x;
  offsetY.value = centered.y;
  requestRender();
};

const handleZoomInput = () => {
  const clamped = clampZoom(zoom.value);
  zoom.value = clamped;
  const centered = getCenteredOffset();
  offsetX.value = centered.x;
  offsetY.value = centered.y;
  requestRender();
};

/**
 * 画像を読み込み
 */
const loadImage = () => {
  if (!src.value) {
    loadedImage.value = null;
    naturalSize.value = { w: 0, h: 0 };
    return;
  }
  
  const img = new Image();
  img.onload = () => {
    loadedImage.value = img;
    naturalSize.value = { w: img.naturalWidth, h: img.naturalHeight };
    updateContainerSize();
    fitToView();
  };
  img.onerror = () => {
    loadedImage.value = null;
    naturalSize.value = { w: 0, h: 0 };
  };
  img.src = src.value;
};

/**
 * パン開始
 */
const startPan = (e: PointerEvent) => {
  if (!src.value || !containerRef.value) return;
  isPanning.value = true;
  panStart.value = { x: e.clientX, y: e.clientY, ox: offsetX.value, oy: offsetY.value };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

/**
 * パン移動
 */
const onPanMove = (e: PointerEvent) => {
  if (!isPanning.value) return;
  const dx = e.clientX - panStart.value.x;
  const dy = e.clientY - panStart.value.y;
  offsetX.value = panStart.value.ox + dx;
  offsetY.value = panStart.value.oy + dy;
  clampOffsets();
  requestRender();
};

/**
 * パン終了
 */
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

/**
 * ホイールズーム
 */
const handleWheel = (e: WheelEvent) => {
  if (!containerRef.value) return;
  const delta = e.deltaY;
  const step = delta > 0 ? -10 : 10;
  applyZoom(zoom.value + step, { x: e.clientX, y: e.clientY });
};

// src変更時に画像を再読み込み
watch(src, () => {
  loadImage();
});

onMounted(() => {
  if (window && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerSize();
      clampOffsets();
      requestRender();
    });
    if (containerRef.value) resizeObserver.observe(containerRef.value);
  }
  updateContainerSize();
  loadImage();
});

onBeforeUnmount(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
  }
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

