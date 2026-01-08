<template>
  <div 
    class="interactive-crop" 
    ref="scrollContainerRef"
    @wheel.prevent="onWheel"
    @pointerdown="onContainerPointerDown"
    @pointermove="onContainerPointerMove"
    @pointerup="onContainerPointerUp"
    @pointerleave="onContainerPointerUp"
  >
    <div class="interactive-crop__wrapper" ref="containerRef" :style="wrapperStyle">
      <img
        v-if="src"
        :src="src"
        alt="Crop preview"
        class="interactive-crop__image"
        @load="handleImageLoad"
        ref="imageRef"
        :style="imageStyle"
      />
      <svg
        v-if="isReady"
        class="interactive-crop__overlay"
        :width="imageDisplayWidth"
        :height="imageDisplayHeight"
        @pointerdown.self="handleBackgroundClick"
      >
      <!-- 暗い外側マスク -->
      <defs>
        <mask id="crop-mask">
          <rect :width="imageDisplayWidth" :height="imageDisplayHeight" fill="white" />
          <rect
            :x="displayRect.x"
            :y="displayRect.y"
            :width="displayRect.width"
            :height="displayRect.height"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        :width="imageDisplayWidth"
        :height="imageDisplayHeight"
        fill="rgba(0, 0, 0, 0.5)"
        mask="url(#crop-mask)"
      />

      <!-- クロップ矩形 -->
      <rect
        :x="displayRect.x"
        :y="displayRect.y"
        :width="displayRect.width"
        :height="displayRect.height"
        fill="none"
        stroke="#007aff"
        stroke-width="2"
        class="interactive-crop__rect"
      />

      <!-- グリッド線 -->
      <line
        v-for="i in 2"
        :key="`h-${i}`"
        :x1="displayRect.x"
        :y1="displayRect.y + (displayRect.height / 3) * i"
        :x2="displayRect.x + displayRect.width"
        :y2="displayRect.y + (displayRect.height / 3) * i"
        stroke="rgba(255, 255, 255, 0.5)"
        stroke-width="1"
      />
      <line
        v-for="i in 2"
        :key="`v-${i}`"
        :x1="displayRect.x + (displayRect.width / 3) * i"
        :y1="displayRect.y"
        :x2="displayRect.x + (displayRect.width / 3) * i"
        :y2="displayRect.y + displayRect.height"
        stroke="rgba(255, 255, 255, 0.5)"
        stroke-width="1"
      />

      <!-- 移動用の透明な領域 -->
      <rect
        :x="displayRect.x"
        :y="displayRect.y"
        :width="displayRect.width"
        :height="displayRect.height"
        fill="transparent"
        class="interactive-crop__drag-area"
        @pointerdown="handleDragStart($event, 'move')"
      />

      <!-- コーナーハンドル -->
      <circle
        v-for="corner in corners"
        :key="corner.position"
        :cx="corner.x"
        :cy="corner.y"
        r="8"
        fill="#007aff"
        stroke="white"
        stroke-width="2"
        class="interactive-crop__handle"
        @pointerdown="handleDragStart($event, corner.position)"
      />

      <!-- エッジハンドル -->
      <rect
        v-for="edge in edges"
        :key="edge.position"
        :x="edge.x - 4"
        :y="edge.y - 4"
        width="8"
        height="8"
        fill="#007aff"
        stroke="white"
        stroke-width="2"
        class="interactive-crop__handle"
        @pointerdown="handleDragStart($event, edge.position)"
      />
    </svg>
    </div>
    
    <!-- ズームコントロール -->
    <div class="interactive-crop__controls">
      <button class="interactive-crop__btn" @click="zoomOut" title="縮小">−</button>
      <span class="interactive-crop__zoom-label">{{ Math.round(viewZoom * 100) }}%</span>
      <button class="interactive-crop__btn" @click="zoomIn" title="拡大">+</button>
      <button class="interactive-crop__btn" @click="resetView" title="フィット">⊡</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

interface Props {
  src: string | null;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  imageWidth?: number;
  imageHeight?: number;
}

interface Emits {
  (e: 'update:cropX', value: number): void;
  (e: 'update:cropY', value: number): void;
  (e: 'update:cropWidth', value: number): void;
  (e: 'update:cropHeight', value: number): void;
  (e: 'cropChange', crop: { x: number; y: number; width: number; height: number }): void;
}

const props = withDefaults(defineProps<Props>(), {
  cropX: 0,
  cropY: 0,
  cropWidth: 0,
  cropHeight: 0,
  imageWidth: 0,
  imageHeight: 0,
});

const emit = defineEmits<Emits>();

const scrollContainerRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const scrollContainerWidth = ref(0);
const scrollContainerHeight = ref(0);
const imageDisplayWidth = ref(0);
const imageDisplayHeight = ref(0);
const isReady = ref(false);

// ズーム・パン状態
const viewZoom = ref(1);
const viewPanX = ref(0);
const viewPanY = ref(0);
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panStartOffset = ref({ x: 0, y: 0 });

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

const dragging = ref<string | null>(null);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartCropX = ref(0);
const dragStartCropY = ref(0);
const dragStartCropWidth = ref(0);
const dragStartCropHeight = ref(0);

// 画像の自然なサイズ（元画像）
const naturalWidth = computed(() => props.imageWidth || imageRef.value?.naturalWidth || 1);
const naturalHeight = computed(() => props.imageHeight || imageRef.value?.naturalHeight || 1);

// ラッパーとイメージのスタイル
const wrapperStyle = computed(() => ({
  width: `${imageDisplayWidth.value}px`,
  height: `${imageDisplayHeight.value}px`,
  transform: `translate(${viewPanX.value}px, ${viewPanY.value}px) scale(${viewZoom.value})`,
  transformOrigin: 'center center',
}));

const imageStyle = computed(() => ({
  width: `${imageDisplayWidth.value}px`,
  height: `${imageDisplayHeight.value}px`,
}));

// 表示座標系でのクロップ矩形（オフセット不要、wrapper内で位置が決まる）
const displayRect = computed(() => {
  const scaleX = imageDisplayWidth.value / naturalWidth.value;
  const scaleY = imageDisplayHeight.value / naturalHeight.value;
  return {
    x: props.cropX * scaleX,
    y: props.cropY * scaleY,
    width: props.cropWidth * scaleX,
    height: props.cropHeight * scaleY,
  };
});

const corners = computed(() => [
  { position: 'nw', x: displayRect.value.x, y: displayRect.value.y },
  { position: 'ne', x: displayRect.value.x + displayRect.value.width, y: displayRect.value.y },
  { position: 'sw', x: displayRect.value.x, y: displayRect.value.y + displayRect.value.height },
  { position: 'se', x: displayRect.value.x + displayRect.value.width, y: displayRect.value.y + displayRect.value.height },
]);

const edges = computed(() => [
  { position: 'n', x: displayRect.value.x + displayRect.value.width / 2, y: displayRect.value.y },
  { position: 's', x: displayRect.value.x + displayRect.value.width / 2, y: displayRect.value.y + displayRect.value.height },
  { position: 'w', x: displayRect.value.x, y: displayRect.value.y + displayRect.value.height / 2 },
  { position: 'e', x: displayRect.value.x + displayRect.value.width, y: displayRect.value.y + displayRect.value.height / 2 },
]);

const handleImageLoad = () => {
  updateDimensions();
  isReady.value = true;
};

const updateDimensions = () => {
  if (!scrollContainerRef.value || !imageRef.value) return;
  const scrollContainer = scrollContainerRef.value.getBoundingClientRect();
  scrollContainerWidth.value = scrollContainer.width;
  scrollContainerHeight.value = scrollContainer.height;

  const imgNaturalW = naturalWidth.value;
  const imgNaturalH = naturalHeight.value;
  
  // 利用可能なスペース（マージン48px分を引く）
  const availableW = scrollContainer.width - 48;
  const availableH = scrollContainer.height - 48;

  // 画像がコンテナに収まる場合はフィット、収まらない場合はスクロール
  // ただし最小でも400x400は確保
  const maxDisplayW = Math.max(400, availableW);
  const maxDisplayH = Math.max(400, availableH);

  // アスペクト比を保ってスケール
  const scaleW = maxDisplayW / imgNaturalW;
  const scaleH = maxDisplayH / imgNaturalH;
  const scale = Math.min(scaleW, scaleH, 1); // 1以下に制限して拡大しない
  
  imageDisplayWidth.value = Math.round(imgNaturalW * scale);
  imageDisplayHeight.value = Math.round(imgNaturalH * scale);
};

const handleDragStart = (e: PointerEvent, position: string) => {
  e.preventDefault();
  e.stopPropagation();
  dragging.value = position;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  dragStartCropX.value = props.cropX;
  dragStartCropY.value = props.cropY;
  dragStartCropWidth.value = props.cropWidth;
  dragStartCropHeight.value = props.cropHeight;
  window.addEventListener('pointermove', handleDragMove);
  window.addEventListener('pointerup', handleDragEnd, { once: true });
};

const handleDragMove = (e: PointerEvent) => {
  if (!dragging.value) return;
  const dx = e.clientX - dragStartX.value;
  const dy = e.clientY - dragStartY.value;
  const scaleX = naturalWidth.value / imageDisplayWidth.value;
  const scaleY = naturalHeight.value / imageDisplayHeight.value;
  const realDx = dx * scaleX;
  const realDy = dy * scaleY;

  let newX = dragStartCropX.value;
  let newY = dragStartCropY.value;
  let newW = dragStartCropWidth.value;
  let newH = dragStartCropHeight.value;

  const minSize = 10;

  if (dragging.value === 'move') {
    newX = Math.max(0, Math.min(naturalWidth.value - newW, dragStartCropX.value + realDx));
    newY = Math.max(0, Math.min(naturalHeight.value - newH, dragStartCropY.value + realDy));
  } else if (dragging.value === 'nw') {
    newX = Math.max(0, Math.min(dragStartCropX.value + dragStartCropWidth.value - minSize, dragStartCropX.value + realDx));
    newY = Math.max(0, Math.min(dragStartCropY.value + dragStartCropHeight.value - minSize, dragStartCropY.value + realDy));
    newW = dragStartCropWidth.value - (newX - dragStartCropX.value);
    newH = dragStartCropHeight.value - (newY - dragStartCropY.value);
  } else if (dragging.value === 'ne') {
    newY = Math.max(0, Math.min(dragStartCropY.value + dragStartCropHeight.value - minSize, dragStartCropY.value + realDy));
    newW = Math.max(minSize, Math.min(naturalWidth.value - dragStartCropX.value, dragStartCropWidth.value + realDx));
    newH = dragStartCropHeight.value - (newY - dragStartCropY.value);
  } else if (dragging.value === 'sw') {
    newX = Math.max(0, Math.min(dragStartCropX.value + dragStartCropWidth.value - minSize, dragStartCropX.value + realDx));
    newW = dragStartCropWidth.value - (newX - dragStartCropX.value);
    newH = Math.max(minSize, Math.min(naturalHeight.value - dragStartCropY.value, dragStartCropHeight.value + realDy));
  } else if (dragging.value === 'se') {
    newW = Math.max(minSize, Math.min(naturalWidth.value - dragStartCropX.value, dragStartCropWidth.value + realDx));
    newH = Math.max(minSize, Math.min(naturalHeight.value - dragStartCropY.value, dragStartCropHeight.value + realDy));
  } else if (dragging.value === 'n') {
    newY = Math.max(0, Math.min(dragStartCropY.value + dragStartCropHeight.value - minSize, dragStartCropY.value + realDy));
    newH = dragStartCropHeight.value - (newY - dragStartCropY.value);
  } else if (dragging.value === 's') {
    newH = Math.max(minSize, Math.min(naturalHeight.value - dragStartCropY.value, dragStartCropHeight.value + realDy));
  } else if (dragging.value === 'w') {
    newX = Math.max(0, Math.min(dragStartCropX.value + dragStartCropWidth.value - minSize, dragStartCropX.value + realDx));
    newW = dragStartCropWidth.value - (newX - dragStartCropX.value);
  } else if (dragging.value === 'e') {
    newW = Math.max(minSize, Math.min(naturalWidth.value - dragStartCropX.value, dragStartCropWidth.value + realDx));
  }

  emit('update:cropX', Math.round(newX));
  emit('update:cropY', Math.round(newY));
  emit('update:cropWidth', Math.round(newW));
  emit('update:cropHeight', Math.round(newH));
};

const handleDragEnd = () => {
  dragging.value = null;
  window.removeEventListener('pointermove', handleDragMove);
  emit('cropChange', {
    x: Math.round(props.cropX),
    y: Math.round(props.cropY),
    width: Math.round(props.cropWidth),
    height: Math.round(props.cropHeight),
  });
};

const handleBackgroundClick = () => {
  // オプション: 背景クリックで何かアクションを起こす
};

// ズーム・パン機能
const zoomIn = () => {
  viewZoom.value = Math.min(MAX_ZOOM, viewZoom.value + ZOOM_STEP);
};

const zoomOut = () => {
  viewZoom.value = Math.max(MIN_ZOOM, viewZoom.value - ZOOM_STEP);
};

const resetView = () => {
  viewZoom.value = 1;
  viewPanX.value = 0;
  viewPanY.value = 0;
};

const onWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewZoom.value + delta));
  
  if (newZoom !== viewZoom.value) {
    if (scrollContainerRef.value) {
      const rect = scrollContainerRef.value.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      
      const ratio = newZoom / viewZoom.value;
      viewPanX.value = viewPanX.value * ratio - mouseX * (ratio - 1);
      viewPanY.value = viewPanY.value * ratio - mouseY * (ratio - 1);
    }
    viewZoom.value = newZoom;
  }
};

const onContainerPointerDown = (e: PointerEvent) => {
  // 中ボタン、またはAlt+左クリックでパン開始
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    e.preventDefault();
    isPanning.value = true;
    panStart.value = { x: e.clientX, y: e.clientY };
    panStartOffset.value = { x: viewPanX.value, y: viewPanY.value };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
};

const onContainerPointerMove = (e: PointerEvent) => {
  if (!isPanning.value) return;
  viewPanX.value = panStartOffset.value.x + (e.clientX - panStart.value.x);
  viewPanY.value = panStartOffset.value.y + (e.clientY - panStart.value.y);
};

const onContainerPointerUp = () => {
  isPanning.value = false;
};

const resizeObserver = new ResizeObserver(() => {
  updateDimensions();
});

onMounted(() => {
  if (scrollContainerRef.value) {
    resizeObserver.observe(scrollContainerRef.value);
  }
  updateDimensions();
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleDragMove);
  resizeObserver.disconnect();
});

watch(() => props.src, () => {
  isReady.value = false;
});
</script>
