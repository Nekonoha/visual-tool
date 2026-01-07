<template>
  <div class="interactive-crop" ref="containerRef">
    <img
      v-if="src"
      :src="src"
      alt="Crop preview"
      class="interactive-crop__image"
      @load="handleImageLoad"
      ref="imageRef"
    />
    <svg
      v-if="isReady"
      class="interactive-crop__overlay"
      :width="containerWidth"
      :height="containerHeight"
      @pointerdown.self="handleBackgroundClick"
    >
      <!-- 暗い外側マスク -->
      <defs>
        <mask id="crop-mask">
          <rect :width="containerWidth" :height="containerHeight" fill="white" />
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
        :width="containerWidth"
        :height="containerHeight"
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

const containerRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const containerWidth = ref(0);
const containerHeight = ref(0);
const imageDisplayWidth = ref(0);
const imageDisplayHeight = ref(0);
const imageOffsetX = ref(0);
const imageOffsetY = ref(0);
const isReady = ref(false);

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

// 表示座標系でのクロップ矩形
const displayRect = computed(() => {
  const scaleX = imageDisplayWidth.value / naturalWidth.value;
  const scaleY = imageDisplayHeight.value / naturalHeight.value;
  return {
    x: imageOffsetX.value + props.cropX * scaleX,
    y: imageOffsetY.value + props.cropY * scaleY,
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
  if (!containerRef.value || !imageRef.value) return;
  const container = containerRef.value.getBoundingClientRect();
  containerWidth.value = container.width;
  containerHeight.value = container.height;

  const imgNaturalW = naturalWidth.value;
  const imgNaturalH = naturalHeight.value;
  const containerAspect = container.width / container.height;
  const imageAspect = imgNaturalW / imgNaturalH;

  if (imageAspect > containerAspect) {
    imageDisplayWidth.value = container.width;
    imageDisplayHeight.value = container.width / imageAspect;
    imageOffsetX.value = 0;
    imageOffsetY.value = (container.height - imageDisplayHeight.value) / 2;
  } else {
    imageDisplayHeight.value = container.height;
    imageDisplayWidth.value = container.height * imageAspect;
    imageOffsetX.value = (container.width - imageDisplayWidth.value) / 2;
    imageOffsetY.value = 0;
  }
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

const resizeObserver = new ResizeObserver(() => {
  updateDimensions();
});

onMounted(() => {
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
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
