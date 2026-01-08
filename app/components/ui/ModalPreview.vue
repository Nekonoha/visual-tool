<template>
  <div 
    ref="containerRef" 
    class="modal-preview"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
    @dblclick="resetView"
  >
    <canvas
      v-if="src"
      ref="canvasRef"
      class="modal-preview__canvas"
    />
    <div v-else class="modal-preview__placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </div>
    <!-- ズームコントロール -->
    <div v-if="src" class="modal-preview__controls">
      <button class="modal-preview__btn" @click="zoomOut" title="縮小">−</button>
      <span class="modal-preview__zoom-label">{{ Math.round(zoom * 100) }}%</span>
      <button class="modal-preview__btn" @click="zoomIn" title="拡大">+</button>
      <button class="modal-preview__btn modal-preview__btn--fit" @click="resetView" title="フィット">⊡</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, toRefs, watch } from 'vue';

interface Props {
  src?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
});

const { src } = toRefs(props);

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const loadedImage = ref<HTMLImageElement | null>(null);
let resizeObserver: ResizeObserver | null = null;
let animationFrameId: number | null = null;

// ズーム・パン状態
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const panStart = ref({ x: 0, y: 0 });

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.1;

/**
 * Canvasサイズを更新
 */
const updateCanvasSize = () => {
  if (!canvasRef.value || !containerRef.value) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = containerRef.value.getBoundingClientRect();
  
  canvasRef.value.style.width = `${rect.width}px`;
  canvasRef.value.style.height = `${rect.height}px`;
  canvasRef.value.width = rect.width * dpr;
  canvasRef.value.height = rect.height * dpr;
  
  requestRender();
};

/**
 * 描画をリクエスト
 */
const requestRender = () => {
  if (animationFrameId !== null) return;
  animationFrameId = requestAnimationFrame(() => {
    render();
    animationFrameId = null;
  });
};

/**
 * 描画
 */
const render = () => {
  if (!canvasRef.value || !loadedImage.value || !containerRef.value) return;
  
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvasRef.value.width;
  const canvasHeight = canvasRef.value.height;
  const containerWidth = containerRef.value.clientWidth;
  const containerHeight = containerRef.value.clientHeight;
  
  // クリア
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  ctx.save();
  ctx.scale(dpr, dpr);
  
  // チェッカーボード背景
  drawCheckerboard(ctx, containerWidth, containerHeight);
  
  // 画像をズーム・パンを適用して描画
  const img = loadedImage.value;
  const baseScale = Math.min(
    containerWidth / img.naturalWidth,
    containerHeight / img.naturalHeight,
    1
  );
  
  const scale = baseScale * zoom.value;
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const offsetX = (containerWidth - drawWidth) / 2 + panX.value;
  const offsetY = (containerHeight - drawHeight) / 2 + panY.value;
  
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  
  ctx.restore();
};

/**
 * チェッカーボード背景
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
 * ズームイン
 */
const zoomIn = () => {
  zoom.value = Math.min(MAX_ZOOM, zoom.value + ZOOM_STEP);
  requestRender();
};

/**
 * ズームアウト
 */
const zoomOut = () => {
  zoom.value = Math.max(MIN_ZOOM, zoom.value - ZOOM_STEP);
  requestRender();
};

/**
 * ビューをリセット
 */
const resetView = () => {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
  requestRender();
};

/**
 * ホイールイベント（ズーム）
 */
const onWheel = (e: WheelEvent) => {
  if (!containerRef.value) return;
  
  const rect = containerRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const oldZoom = zoom.value;
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value + delta));
  
  if (newZoom !== oldZoom) {
    // ズーム中心を維持
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = mouseX - centerX - panX.value;
    const dy = mouseY - centerY - panY.value;
    const ratio = newZoom / oldZoom;
    
    panX.value = panX.value - dx * (ratio - 1);
    panY.value = panY.value - dy * (ratio - 1);
    zoom.value = newZoom;
    
    requestRender();
  }
};

/**
 * ポインターダウン
 */
const onPointerDown = (e: PointerEvent) => {
  if (e.button !== 0) return;
  isDragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY };
  panStart.value = { x: panX.value, y: panY.value };
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
};

/**
 * ポインタームーブ
 */
const onPointerMove = (e: PointerEvent) => {
  if (!isDragging.value) return;
  panX.value = panStart.value.x + (e.clientX - dragStart.value.x);
  panY.value = panStart.value.y + (e.clientY - dragStart.value.y);
  requestRender();
};

/**
 * ポインターアップ
 */
const onPointerUp = () => {
  isDragging.value = false;
};

/**
 * 画像を読み込み
 */
const loadImage = () => {
  if (!src.value) {
    loadedImage.value = null;
    return;
  }
  
  const img = new Image();
  img.onload = () => {
    loadedImage.value = img;
    // 新しい画像が読み込まれたらビューをリセット
    zoom.value = 1;
    panX.value = 0;
    panY.value = 0;
    updateCanvasSize();
  };
  img.onerror = () => {
    loadedImage.value = null;
  };
  img.src = src.value;
};

watch(src, () => {
  loadImage();
});

onMounted(() => {
  if (window && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    if (containerRef.value) resizeObserver.observe(containerRef.value);
  }
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
