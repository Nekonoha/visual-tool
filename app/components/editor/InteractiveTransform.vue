<template>
  <div 
    class="interactive-transform" 
    ref="scrollContainerRef"
    @wheel.prevent="onWheel"
    @pointerdown="onContainerPointerDown"
    @pointermove="onContainerPointerMove"
    @pointerup="onContainerPointerUp"
    @pointerleave="onContainerPointerUp"
  >
    <div class="interactive-transform__wrapper" ref="containerRef" :style="wrapperStyle">
      <!-- 変形プレビュー用Canvas -->
      <canvas
        ref="previewCanvasRef"
        class="interactive-transform__canvas"
        :width="canvasPhysicalWidth"
        :height="canvasPhysicalHeight"
        :style="canvasStyle"
      />
      <svg
        v-if="isReady"
        class="interactive-transform__overlay"
        :width="canvasWidth"
        :height="canvasHeight"
      >
        <!-- 変形後の四角形 -->
        <polygon
          :points="polygonPoints"
          fill="rgba(0, 122, 255, 0.05)"
          stroke="#007aff"
          stroke-width="2"
        />
        
        <!-- グリッド線 -->
        <line
          v-for="i in 2"
          :key="`h-${i}`"
          :x1="lerp(corners.tl.x, corners.tr.x, i/3)"
          :y1="lerp(corners.tl.y, corners.tr.y, i/3)"
          :x2="lerp(corners.bl.x, corners.br.x, i/3)"
          :y2="lerp(corners.bl.y, corners.br.y, i/3)"
          stroke="rgba(255, 255, 255, 0.4)"
          stroke-width="1"
          stroke-dasharray="4,4"
        />
        <line
          v-for="i in 2"
          :key="`v-${i}`"
          :x1="lerp(corners.tl.x, corners.bl.x, i/3)"
          :y1="lerp(corners.tl.y, corners.bl.y, i/3)"
          :x2="lerp(corners.tr.x, corners.br.x, i/3)"
          :y2="lerp(corners.tr.y, corners.br.y, i/3)"
          stroke="rgba(255, 255, 255, 0.4)"
          stroke-width="1"
          stroke-dasharray="4,4"
        />
        
        <!-- 8つのハンドル（rotateモード以外で表示） -->
        <rect
          v-for="handle in handles"
          v-show="props.mode !== 'rotate'"
          :key="handle.id"
          :x="handle.x - handleSize / 2"
          :y="handle.y - handleSize / 2"
          :width="handleSize"
          :height="handleSize"
          fill="white"
          stroke="#007aff"
          stroke-width="2"
          :class="['interactive-transform__handle', `cursor-${handle.cursor}`]"
          @pointerdown="(e) => handleDragStart(e, handle.id)"
        />
        
        <!-- 回転ハンドル（free/rotateモード時のみ表示） -->
        <g v-if="props.mode === 'free' || props.mode === 'rotate'">
          <line
            :x1="rotateHandlePosition.lineStart.x"
            :y1="rotateHandlePosition.lineStart.y"
            :x2="rotateHandlePosition.handle.x"
            :y2="rotateHandlePosition.handle.y"
            stroke="#007aff"
            stroke-width="2"
          />
          <circle
            :cx="rotateHandlePosition.handle.x"
            :cy="rotateHandlePosition.handle.y"
            r="8"
            fill="white"
            stroke="#007aff"
            stroke-width="2"
            class="interactive-transform__handle cursor-crosshair"
            @pointerdown="(e) => handleDragStart(e, 'rotate')"
          />
        </g>
        
        <!-- アンカー点マーカー（自由変形以外で表示） -->
        <g v-if="props.mode !== 'free'" class="anchor-marker">
          <circle
            :cx="anchorDisplayPosition.x"
            :cy="anchorDisplayPosition.y"
            r="6"
            fill="none"
            stroke="#ff6b00"
            stroke-width="2"
          />
          <circle
            :cx="anchorDisplayPosition.x"
            :cy="anchorDisplayPosition.y"
            r="2"
            fill="#ff6b00"
          />
        </g>
      </svg>
    </div>
    
    <!-- ズームコントロール -->
    <div class="interactive-transform__controls">
      <button class="interactive-transform__btn" @click="zoomOut" title="縮小">−</button>
      <span class="interactive-transform__zoom-label">{{ Math.round(viewZoom * 100) }}%</span>
      <button class="interactive-transform__btn" @click="zoomIn" title="拡大">+</button>
      <button class="interactive-transform__btn" @click="resetView" title="フィット">⊡</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { 
  Corner, 
  Corners, 
  TransformMode, 
  InterpolationMethod, 
  AnchorPosition 
} from '~/types';

interface Props {
  src: string | null;
  imageWidth: number;
  imageHeight: number;
  mode?: TransformMode;
  interpolation?: InterpolationMethod;
  anchor?: AnchorPosition;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'free',
  interpolation: 'bilinear',
  anchor: 'c',
});

const emit = defineEmits<{
  (e: 'change', corners: Corners): void;
}>();

const scrollContainerRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const previewCanvasRef = ref<HTMLCanvasElement | null>(null);
const isReady = ref(false);
const sourceImage = ref<HTMLImageElement | null>(null);

// 表示サイズ
const displayWidth = ref(400);
const displayHeight = ref(300);
const dynamicPadding = ref(80);
const handleSize = 14;

// 固定のpadding値（互換性のため）
const padding = computed(() => dynamicPadding.value);

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

// 四隅の位置（表示座標系、canvas内の座標）
const corners = reactive<Corners>({
  tl: { x: 0, y: 0 },
  tr: { x: 0, y: 0 },
  bl: { x: 0, y: 0 },
  br: { x: 0, y: 0 },
});

// 初期位置を保存
const initCorners = () => {
  corners.tl = { x: padding.value, y: padding.value };
  corners.tr = { x: padding.value + displayWidth.value, y: padding.value };
  corners.bl = { x: padding.value, y: padding.value + displayHeight.value };
  corners.br = { x: padding.value + displayWidth.value, y: padding.value + displayHeight.value };
};

// アンカー座標を計算（初期四角形での座標）
const getAnchorPosition = (): Corner => {
  const anchorMap: Record<AnchorPosition, { xRatio: number; yRatio: number }> = {
    tl: { xRatio: 0, yRatio: 0 },
    t: { xRatio: 0.5, yRatio: 0 },
    tr: { xRatio: 1, yRatio: 0 },
    l: { xRatio: 0, yRatio: 0.5 },
    c: { xRatio: 0.5, yRatio: 0.5 },
    r: { xRatio: 1, yRatio: 0.5 },
    bl: { xRatio: 0, yRatio: 1 },
    b: { xRatio: 0.5, yRatio: 1 },
    br: { xRatio: 1, yRatio: 1 },
  };
  const { xRatio, yRatio } = anchorMap[props.anchor];
  return {
    x: padding.value + displayWidth.value * xRatio,
    y: padding.value + displayHeight.value * yRatio,
  };
};

// ドラッグ状態
const dragging = ref<string | null>(null);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartCorners = reactive<Corners>({
  tl: { x: 0, y: 0 },
  tr: { x: 0, y: 0 },
  bl: { x: 0, y: 0 },
  br: { x: 0, y: 0 },
});

const canvasWidth = computed(() => displayWidth.value + padding.value * 2);
const canvasHeight = computed(() => displayHeight.value + padding.value * 2);

// 高解像度レンダリング用（デバイスピクセル比考慮）
const dpr = computed(() => typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1);
const canvasPhysicalWidth = computed(() => Math.round(canvasWidth.value * dpr.value));
const canvasPhysicalHeight = computed(() => Math.round(canvasHeight.value * dpr.value));

const canvasStyle = computed(() => ({
  width: `${canvasWidth.value}px`,
  height: `${canvasHeight.value}px`,
}));

const wrapperStyle = computed(() => ({
  width: `${canvasWidth.value}px`,
  height: `${canvasHeight.value}px`,
  transform: `translate(${viewPanX.value}px, ${viewPanY.value}px) scale(${viewZoom.value})`,
  transformOrigin: 'center center',
}));

const polygonPoints = computed(() => {
  return `${corners.tl.x},${corners.tl.y} ${corners.tr.x},${corners.tr.y} ${corners.br.x},${corners.br.y} ${corners.bl.x},${corners.bl.y}`;
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// アンカー点の表示位置（初期位置を固定表示）
const anchorDisplayPosition = computed(() => getAnchorPosition());

// 8つのハンドル
const handles = computed(() => {
  const midTop = { x: (corners.tl.x + corners.tr.x) / 2, y: (corners.tl.y + corners.tr.y) / 2 };
  const midBottom = { x: (corners.bl.x + corners.br.x) / 2, y: (corners.bl.y + corners.br.y) / 2 };
  const midLeft = { x: (corners.tl.x + corners.bl.x) / 2, y: (corners.tl.y + corners.bl.y) / 2 };
  const midRight = { x: (corners.tr.x + corners.br.x) / 2, y: (corners.tr.y + corners.br.y) / 2 };
  
  return [
    { id: 'tl', x: corners.tl.x, y: corners.tl.y, cursor: 'nwse-resize' },
    { id: 'tr', x: corners.tr.x, y: corners.tr.y, cursor: 'nesw-resize' },
    { id: 'bl', x: corners.bl.x, y: corners.bl.y, cursor: 'nesw-resize' },
    { id: 'br', x: corners.br.x, y: corners.br.y, cursor: 'nwse-resize' },
    { id: 't', x: midTop.x, y: midTop.y, cursor: 'ns-resize' },
    { id: 'b', x: midBottom.x, y: midBottom.y, cursor: 'ns-resize' },
    { id: 'l', x: midLeft.x, y: midLeft.y, cursor: 'ew-resize' },
    { id: 'r', x: midRight.x, y: midRight.y, cursor: 'ew-resize' },
  ];
});

// 回転ハンドル位置（上辺の中央から上に突き出す）
const rotateHandlePosition = computed(() => {
  const midTop = { x: (corners.tl.x + corners.tr.x) / 2, y: (corners.tl.y + corners.tr.y) / 2 };
  const center = {
    x: (corners.tl.x + corners.tr.x + corners.bl.x + corners.br.x) / 4,
    y: (corners.tl.y + corners.tr.y + corners.bl.y + corners.br.y) / 4,
  };
  // 上辺の中央から中心への方向ベクトルの反対方向
  const dx = midTop.x - center.x;
  const dy = midTop.y - center.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len > 0 ? dx / len : 0;
  const ny = len > 0 ? dy / len : -1;
  const handleDist = 30;
  return {
    lineStart: midTop,
    handle: { x: midTop.x + nx * handleDist, y: midTop.y + ny * handleDist },
  };
});

// 回転角度の追跡
const currentRotation = ref(0);
const dragStartAngle = ref(0);

const loadImage = () => {
  if (!props.src) return;
  const img = new Image();
  img.onload = () => {
    sourceImage.value = img;
    updateDimensions();
    initCorners();
    previousDisplayWidth = displayWidth.value;
    previousDisplayHeight = displayHeight.value;
    previousPadding = dynamicPadding.value;
    isReady.value = true;
    nextTick(() => renderPreview());
  };
  img.src = props.src;
};

const updateDimensions = () => {
  if (!scrollContainerRef.value) return;
  const rect = scrollContainerRef.value.getBoundingClientRect();
  
  // スマホでは余白を減らす
  const isMobile = rect.width < 480;
  const effectivePadding = isMobile ? 40 : 80;
  const margin = isMobile ? 16 : 48;
  
  // paddingを更新
  dynamicPadding.value = effectivePadding;
  
  const availableW = Math.max(100, rect.width - margin - effectivePadding * 2);
  const availableH = Math.max(80, rect.height - margin - effectivePadding * 2);
  
  if (props.imageWidth <= 0 || props.imageHeight <= 0) return;
  
  // 画像のアスペクト比を計算
  const aspectRatio = props.imageWidth / props.imageHeight;
  
  // 利用可能なスペースに収まるようにスケール
  const scaleW = availableW / props.imageWidth;
  const scaleH = availableH / props.imageHeight;
  let scale = Math.min(scaleW, scaleH, 1.0);
  
  // 最小サイズを確保しつつアスペクト比を維持（スマホでは最小サイズを小さく）
  const minW = isMobile ? 100 : 200;
  const minH = isMobile ? 75 : 150;
  
  let w = props.imageWidth * scale;
  let h = props.imageHeight * scale;
  
  if (w < minW && availableW >= minW) {
    w = minW;
    h = w / aspectRatio;
  }
  if (h < minH && availableH >= minH) {
    h = minH;
    w = h * aspectRatio;
  }
  
  // 利用可能スペースを超えないように最終調整
  if (w > availableW) {
    w = availableW;
    h = w / aspectRatio;
  }
  if (h > availableH) {
    h = availableH;
    w = h * aspectRatio;
  }
  
  displayWidth.value = Math.round(Math.max(50, w));
  displayHeight.value = Math.round(Math.max(40, h));
};

// 4点変形プレビュー（バイリニア補間による軽量実装）
const renderPreview = () => {
  const canvas = previewCanvasRef.value;
  const img = sourceImage.value;
  if (!canvas || !img) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const currentDpr = dpr.value;
  
  // キャンバス全体をクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // DPRスケーリング適用
  ctx.save();
  ctx.scale(currentDpr, currentDpr);
  
  // 背景
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);
  
  // クリッピングパスを設定（四角形の内部のみ描画）
  ctx.beginPath();
  ctx.moveTo(corners.tl.x, corners.tl.y);
  ctx.lineTo(corners.tr.x, corners.tr.y);
  ctx.lineTo(corners.br.x, corners.br.y);
  ctx.lineTo(corners.bl.x, corners.bl.y);
  ctx.closePath();
  ctx.clip();
  
  // ソース画像をオフスクリーンCanvasに描画
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = img.width;
  srcCanvas.height = img.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) {
    ctx.restore();
    return;
  }
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, img.width, img.height);
  const src = srcData.data;
  
  // 出力領域を計算
  const minX = Math.floor(Math.min(corners.tl.x, corners.tr.x, corners.bl.x, corners.br.x));
  const maxX = Math.ceil(Math.max(corners.tl.x, corners.tr.x, corners.bl.x, corners.br.x));
  const minY = Math.floor(Math.min(corners.tl.y, corners.tr.y, corners.bl.y, corners.br.y));
  const maxY = Math.ceil(Math.max(corners.tl.y, corners.tr.y, corners.bl.y, corners.br.y));
  
  const outW = maxX - minX;
  const outH = maxY - minY;
  if (outW <= 0 || outH <= 0) {
    ctx.restore();
    return;
  }
  
  // 出力用ImageData
  const dstData = ctx.createImageData(outW, outH);
  const dst = dstData.data;
  
  // 4点の相対座標（出力領域内）
  const p0 = { x: corners.tl.x - minX, y: corners.tl.y - minY }; // top-left
  const p1 = { x: corners.tr.x - minX, y: corners.tr.y - minY }; // top-right
  const p2 = { x: corners.br.x - minX, y: corners.br.y - minY }; // bottom-right
  const p3 = { x: corners.bl.x - minX, y: corners.bl.y - minY }; // bottom-left
  
  // 逆変換行列を計算（射影変換）
  // 出力座標(x,y) → 入力座標(u,v)を求める
  const computeInverseProjection = () => {
    // 簡易的なバイリニア逆変換
    // (u, v) を (0,0)-(1,1) として、出力四角形内の点から逆算
    return (x: number, y: number): { u: number; v: number } | null => {
      // 四角形内かどうかの判定と、バイリニア逆変換
      // Newton-Raphson法で (u, v) を求める
      let u = 0.5, v = 0.5;
      
      for (let iter = 0; iter < 8; iter++) {
        // バイリニア補間: P = (1-u)(1-v)P0 + u(1-v)P1 + uv*P2 + (1-u)v*P3
        const px = (1 - u) * (1 - v) * p0.x + u * (1 - v) * p1.x + u * v * p2.x + (1 - u) * v * p3.x;
        const py = (1 - u) * (1 - v) * p0.y + u * (1 - v) * p1.y + u * v * p2.y + (1 - u) * v * p3.y;
        
        const dx = x - px;
        const dy = y - py;
        
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) break;
        
        // ヤコビアン
        const dxdu = -(1 - v) * p0.x + (1 - v) * p1.x + v * p2.x - v * p3.x;
        const dxdv = -(1 - u) * p0.x - u * p1.x + u * p2.x + (1 - u) * p3.x;
        const dydu = -(1 - v) * p0.y + (1 - v) * p1.y + v * p2.y - v * p3.y;
        const dydv = -(1 - u) * p0.y - u * p1.y + u * p2.y + (1 - u) * p3.y;
        
        const det = dxdu * dydv - dxdv * dydu;
        if (Math.abs(det) < 0.0001) break;
        
        u += (dydv * dx - dxdv * dy) / det;
        v += (-dydu * dx + dxdu * dy) / det;
      }
      
      if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) return null;
      return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
    };
  };
  
  const inverseProject = computeInverseProjection();
  const srcW = img.width;
  const srcH = img.height;
  
  // 各出力ピクセルに対して逆変換
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const uv = inverseProject(x, y);
      if (!uv) continue;
      
      // ソース座標
      const srcX = uv.u * (srcW - 1);
      const srcY = uv.v * (srcH - 1);
      const dstIdx = (y * outW + x) * 4;
      
      if (props.interpolation === 'nearest') {
        // ニアレストネイバー
        const nx = Math.round(srcX);
        const ny = Math.round(srcY);
        const idx = (ny * srcW + nx) * 4;
        for (let c = 0; c < 4; c++) {
          dst[dstIdx + c] = src[idx + c] ?? 0;
        }
      } else if (props.interpolation === 'average') {
        // 色の平均（周囲のピクセルを平均）
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, srcW - 1);
        const y1 = Math.min(y0 + 1, srcH - 1);
        const idx00 = (y0 * srcW + x0) * 4;
        const idx01 = (y0 * srcW + x1) * 4;
        const idx10 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;
        for (let c = 0; c < 4; c++) {
          const avg = ((src[idx00 + c] ?? 0) + (src[idx01 + c] ?? 0) + (src[idx10 + c] ?? 0) + (src[idx11 + c] ?? 0)) / 4;
          dst[dstIdx + c] = Math.round(avg);
        }
      } else {
        // バイリニア補間（デフォルト）
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, srcW - 1);
        const y1 = Math.min(y0 + 1, srcH - 1);
        const fx = srcX - x0;
        const fy = srcY - y0;
        
        const idx00 = (y0 * srcW + x0) * 4;
        const idx01 = (y0 * srcW + x1) * 4;
        const idx10 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;
        
        for (let c = 0; c < 4; c++) {
          const v00 = src[idx00 + c] ?? 0;
          const v01 = src[idx01 + c] ?? 0;
          const v10 = src[idx10 + c] ?? 0;
          const v11 = src[idx11 + c] ?? 0;
          
          const top = v00 * (1 - fx) + v01 * fx;
          const bottom = v10 * (1 - fx) + v11 * fx;
          dst[dstIdx + c] = Math.round(top * (1 - fy) + bottom * fy);
        }
      }
    }
  }
  
  // 一時キャンバスにImageDataを描画
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = outW;
  tmpCanvas.height = outH;
  const tmpCtx = tmpCanvas.getContext('2d');
  if (!tmpCtx) {
    ctx.restore();
    return;
  }
  tmpCtx.putImageData(dstData, 0, 0);
  
  // クリッピングパス内に一時キャンバスを描画
  ctx.drawImage(tmpCanvas, minX, minY);
  
  // クリッピングパスを解除
  ctx.restore();
};

const handleDragStart = (e: PointerEvent, handleId: string) => {
  e.preventDefault();
  e.stopPropagation();
  dragging.value = handleId;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  
  // 現在位置を保存
  dragStartCorners.tl = { ...corners.tl };
  dragStartCorners.tr = { ...corners.tr };
  dragStartCorners.bl = { ...corners.bl };
  dragStartCorners.br = { ...corners.br };
  
  window.addEventListener('pointermove', handleDragMove);
  window.addEventListener('pointerup', handleDragEnd, { once: true });
};

const handleDragMove = (e: PointerEvent) => {
  if (!dragging.value) return;
  
  const dx = e.clientX - dragStartX.value;
  const dy = e.clientY - dragStartY.value;
  const handle = dragging.value;
  
  // 回転ハンドルの処理
  if (handle === 'rotate') {
    handleRotate(e);
  } else if (props.mode === 'scale') {
    handleScaleMode(handle, dx, dy);
  } else if (props.mode === 'perspective') {
    handlePerspectiveMode(handle, dx, dy);
  } else if (props.mode === 'skew') {
    handleSkewMode(handle, dx, dy);
  } else if (props.mode === 'rotate') {
    // rotateモードでも回転ハンドル以外のハンドルは拡大縮小として動作
    handleScaleMode(handle, dx, dy);
  } else {
    // free モード（デフォルト）
    handleFreeMode(handle, dx, dy);
  }
  
  // ドラッグ中もフルプレビュー（リアルタイム変形表示）
  renderPreview();
};

// 回転処理（アンカー点を中心に回転）
const handleRotate = (e: PointerEvent) => {
  // アンカー点を回転の中心として使用
  const anchor = getAnchorPosition();
  const center = anchor;
  
  // コンテナのスクリーン座標を取得
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;
  
  // 現在のマウス位置をコンテナ座標系に変換
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  
  // 現在の角度を計算
  const currentAngle = Math.atan2(my - center.y, mx - center.x);
  
  // ドラッグ開始時の角度
  const startMx = dragStartX.value - rect.left;
  const startMy = dragStartY.value - rect.top;
  const startAngle = Math.atan2(startMy - center.y, startMx - center.x);
  
  // 回転角度の差分
  const deltaAngle = currentAngle - startAngle;
  
  // 各頂点を回転
  const rotatePoint = (p: Corner): Corner => {
    const rx = p.x - center.x;
    const ry = p.y - center.y;
    const cos = Math.cos(deltaAngle);
    const sin = Math.sin(deltaAngle);
    return {
      x: center.x + rx * cos - ry * sin,
      y: center.y + rx * sin + ry * cos,
    };
  };
  
  corners.tl = rotatePoint(dragStartCorners.tl);
  corners.tr = rotatePoint(dragStartCorners.tr);
  corners.bl = rotatePoint(dragStartCorners.bl);
  corners.br = rotatePoint(dragStartCorners.br);
};

// 自由変形モード：各頂点を個別に動かす（反転も可能）
const handleFreeMode = (handle: string, dx: number, dy: number) => {
  // 回転ハンドルは別処理
  if (handle === 'rotate') return;
  
  if (handle === 'tl') {
    corners.tl.x = dragStartCorners.tl.x + dx;
    corners.tl.y = dragStartCorners.tl.y + dy;
  } else if (handle === 'tr') {
    corners.tr.x = dragStartCorners.tr.x + dx;
    corners.tr.y = dragStartCorners.tr.y + dy;
  } else if (handle === 'bl') {
    corners.bl.x = dragStartCorners.bl.x + dx;
    corners.bl.y = dragStartCorners.bl.y + dy;
  } else if (handle === 'br') {
    corners.br.x = dragStartCorners.br.x + dx;
    corners.br.y = dragStartCorners.br.y + dy;
  } else if (handle === 't') {
    // 上辺を移動
    corners.tl.y = dragStartCorners.tl.y + dy;
    corners.tr.y = dragStartCorners.tr.y + dy;
  } else if (handle === 'b') {
    // 下辺を移動
    corners.bl.y = dragStartCorners.bl.y + dy;
    corners.br.y = dragStartCorners.br.y + dy;
  } else if (handle === 'l') {
    // 左辺を移動
    corners.tl.x = dragStartCorners.tl.x + dx;
    corners.bl.x = dragStartCorners.bl.x + dx;
  } else if (handle === 'r') {
    // 右辺を移動
    corners.tr.x = dragStartCorners.tr.x + dx;
    corners.br.x = dragStartCorners.br.x + dx;
  }
};

// 拡大・縮小モード：アンカー点基準でスケール（反転も可能）
const handleScaleMode = (handle: string, dx: number, dy: number) => {
  // アンカー点を固定点として使用（自由変形モード以外）
  const anchor = getAnchorPosition();
  const anchorX = anchor.x;
  const anchorY = anchor.y;
  
  // 初期の四角形サイズ
  const initTl = { x: padding.value, y: padding.value };
  const initBr = { x: padding.value + displayWidth.value, y: padding.value + displayHeight.value };
  const initW = displayWidth.value;
  const initH = displayHeight.value;
  
  // アンカー点から各辺までの距離（初期状態）
  const distToLeft = anchorX - initTl.x;
  const distToRight = initBr.x - anchorX;
  const distToTop = anchorY - initTl.y;
  const distToBottom = initBr.y - anchorY;
  
  let scaleX = 1, scaleY = 1;
  
  // ハンドル位置に応じてスケールを計算
  // ハンドルがアンカーの反対側にある場合のみスケール変更
  if (handle === 'tl') {
    if (distToLeft > 0) scaleX = (distToLeft - dx) / distToLeft;
    if (distToTop > 0) scaleY = (distToTop - dy) / distToTop;
  } else if (handle === 'tr') {
    if (distToRight > 0) scaleX = (distToRight + dx) / distToRight;
    if (distToTop > 0) scaleY = (distToTop - dy) / distToTop;
  } else if (handle === 'bl') {
    if (distToLeft > 0) scaleX = (distToLeft - dx) / distToLeft;
    if (distToBottom > 0) scaleY = (distToBottom + dy) / distToBottom;
  } else if (handle === 'br') {
    if (distToRight > 0) scaleX = (distToRight + dx) / distToRight;
    if (distToBottom > 0) scaleY = (distToBottom + dy) / distToBottom;
  } else if (handle === 't') {
    if (distToTop > 0) scaleY = (distToTop - dy) / distToTop;
  } else if (handle === 'b') {
    if (distToBottom > 0) scaleY = (distToBottom + dy) / distToBottom;
  } else if (handle === 'l') {
    if (distToLeft > 0) scaleX = (distToLeft - dx) / distToLeft;
  } else if (handle === 'r') {
    if (distToRight > 0) scaleX = (distToRight + dx) / distToRight;
  }
  
  // アンカー点基準でスケーリング
  corners.tl.x = anchorX - distToLeft * scaleX;
  corners.tl.y = anchorY - distToTop * scaleY;
  corners.tr.x = anchorX + distToRight * scaleX;
  corners.tr.y = anchorY - distToTop * scaleY;
  corners.bl.x = anchorX - distToLeft * scaleX;
  corners.bl.y = anchorY + distToBottom * scaleY;
  corners.br.x = anchorX + distToRight * scaleX;
  corners.br.y = anchorY + distToBottom * scaleY;
};

// 遠近ゆがみモード：アンカー点を固定し、他の頂点を動かす
// アンカー点の位置に応じて変形の基準が変わる
const handlePerspectiveMode = (handle: string, dx: number, dy: number) => {
  const anchor = props.anchor;
  
  // アンカーに含まれる頂点は動かさない
  const anchorCorners = getAnchorRelatedCorners(anchor);
  
  // 頂点ハンドルの処理
  if (handle === 'tl' || handle === 'tr' || handle === 'bl' || handle === 'br') {
    // ドラッグされた頂点
    const cornerKey = handle as 'tl' | 'tr' | 'bl' | 'br';
    
    // アンカーに関連する頂点は動かさない
    if (anchorCorners.includes(cornerKey)) return;
    
    // ドラッグした頂点を移動
    corners[cornerKey].x = dragStartCorners[cornerKey].x + dx;
    corners[cornerKey].y = dragStartCorners[cornerKey].y + dy;
    
    // 遠近効果：辺でつながった隣接頂点を逆方向に動かす（アンカーに関連しないもののみ）
    const adjacentX = getHorizontalAdjacent(cornerKey);
    const adjacentY = getVerticalAdjacent(cornerKey);
    
    if (!anchorCorners.includes(adjacentX)) {
      corners[adjacentX].x = dragStartCorners[adjacentX].x - dx;
    }
    if (!anchorCorners.includes(adjacentY)) {
      corners[adjacentY].y = dragStartCorners[adjacentY].y - dy;
    }
  } else if (handle === 't' || handle === 'b' || handle === 'l' || handle === 'r') {
    // 辺ハンドルの処理
    const edgeCorners = getEdgeCorners(handle);
    const oppositeEdgeCorners = getOppositeEdgeCorners(handle);
    
    if (handle === 't' || handle === 'b') {
      // 垂直方向の移動
      edgeCorners.forEach(c => {
        if (!anchorCorners.includes(c)) {
          corners[c].y = dragStartCorners[c].y + dy;
        }
      });
      oppositeEdgeCorners.forEach(c => {
        if (!anchorCorners.includes(c)) {
          corners[c].y = dragStartCorners[c].y - dy;
        }
      });
    } else {
      // 水平方向の移動
      edgeCorners.forEach(c => {
        if (!anchorCorners.includes(c)) {
          corners[c].x = dragStartCorners[c].x + dx;
        }
      });
      oppositeEdgeCorners.forEach(c => {
        if (!anchorCorners.includes(c)) {
          corners[c].x = dragStartCorners[c].x - dx;
        }
      });
    }
  }
};

// 平行ゆがみモード：アンカー点を固定し、他の頂点を動かす（シアー変形）
const handleSkewMode = (handle: string, dx: number, dy: number) => {
  const anchor = props.anchor;
  const anchorCorners = getAnchorRelatedCorners(anchor);
  
  if (handle === 't') {
    // 上辺を水平に移動
    if (!anchorCorners.includes('tl')) corners.tl.x = dragStartCorners.tl.x + dx;
    if (!anchorCorners.includes('tr')) corners.tr.x = dragStartCorners.tr.x + dx;
  } else if (handle === 'b') {
    if (!anchorCorners.includes('bl')) corners.bl.x = dragStartCorners.bl.x + dx;
    if (!anchorCorners.includes('br')) corners.br.x = dragStartCorners.br.x + dx;
  } else if (handle === 'l') {
    if (!anchorCorners.includes('tl')) corners.tl.y = dragStartCorners.tl.y + dy;
    if (!anchorCorners.includes('bl')) corners.bl.y = dragStartCorners.bl.y + dy;
  } else if (handle === 'r') {
    if (!anchorCorners.includes('tr')) corners.tr.y = dragStartCorners.tr.y + dy;
    if (!anchorCorners.includes('br')) corners.br.y = dragStartCorners.br.y + dy;
  } else if (handle === 'tl') {
    if (!anchorCorners.includes('tl')) corners.tl.x = dragStartCorners.tl.x + dx;
    if (!anchorCorners.includes('tr')) corners.tr.x = dragStartCorners.tr.x + dx;
    if (!anchorCorners.includes('tl')) corners.tl.y = dragStartCorners.tl.y + dy;
    if (!anchorCorners.includes('bl')) corners.bl.y = dragStartCorners.bl.y + dy;
  } else if (handle === 'tr') {
    if (!anchorCorners.includes('tl')) corners.tl.x = dragStartCorners.tl.x + dx;
    if (!anchorCorners.includes('tr')) corners.tr.x = dragStartCorners.tr.x + dx;
    if (!anchorCorners.includes('tr')) corners.tr.y = dragStartCorners.tr.y + dy;
    if (!anchorCorners.includes('br')) corners.br.y = dragStartCorners.br.y + dy;
  } else if (handle === 'bl') {
    if (!anchorCorners.includes('bl')) corners.bl.x = dragStartCorners.bl.x + dx;
    if (!anchorCorners.includes('br')) corners.br.x = dragStartCorners.br.x + dx;
    if (!anchorCorners.includes('tl')) corners.tl.y = dragStartCorners.tl.y + dy;
    if (!anchorCorners.includes('bl')) corners.bl.y = dragStartCorners.bl.y + dy;
  } else if (handle === 'br') {
    if (!anchorCorners.includes('bl')) corners.bl.x = dragStartCorners.bl.x + dx;
    if (!anchorCorners.includes('br')) corners.br.x = dragStartCorners.br.x + dx;
    if (!anchorCorners.includes('tr')) corners.tr.y = dragStartCorners.tr.y + dy;
    if (!anchorCorners.includes('br')) corners.br.y = dragStartCorners.br.y + dy;
  }
};

// ヘルパー関数：アンカーに関連する頂点を取得
const getAnchorRelatedCorners = (anchor: AnchorPosition): ('tl' | 'tr' | 'bl' | 'br')[] => {
  const map: Record<AnchorPosition, ('tl' | 'tr' | 'bl' | 'br')[]> = {
    tl: ['tl'],
    t: ['tl', 'tr'],
    tr: ['tr'],
    l: ['tl', 'bl'],
    c: [],  // 中央の場合はどの頂点も固定しない
    r: ['tr', 'br'],
    bl: ['bl'],
    b: ['bl', 'br'],
    br: ['br'],
  };
  return map[anchor];
};

// 水平方向の隣接頂点を取得
const getHorizontalAdjacent = (corner: 'tl' | 'tr' | 'bl' | 'br'): 'tl' | 'tr' | 'bl' | 'br' => {
  const map = { tl: 'tr', tr: 'tl', bl: 'br', br: 'bl' } as const;
  return map[corner];
};

// 垂直方向の隣接頂点を取得
const getVerticalAdjacent = (corner: 'tl' | 'tr' | 'bl' | 'br'): 'tl' | 'tr' | 'bl' | 'br' => {
  const map = { tl: 'bl', tr: 'br', bl: 'tl', br: 'tr' } as const;
  return map[corner];
};

// 辺に含まれる頂点を取得
const getEdgeCorners = (edge: string): ('tl' | 'tr' | 'bl' | 'br')[] => {
  const map: Record<string, ('tl' | 'tr' | 'bl' | 'br')[]> = {
    t: ['tl', 'tr'],
    b: ['bl', 'br'],
    l: ['tl', 'bl'],
    r: ['tr', 'br'],
  };
  return map[edge] || [];
};

// 反対側の辺に含まれる頂点を取得
const getOppositeEdgeCorners = (edge: string): ('tl' | 'tr' | 'bl' | 'br')[] => {
  const map: Record<string, ('tl' | 'tr' | 'bl' | 'br')[]> = {
    t: ['bl', 'br'],
    b: ['tl', 'tr'],
    l: ['tr', 'br'],
    r: ['tl', 'bl'],
  };
  return map[edge] || [];
};

const handleDragEnd = () => {
  dragging.value = null;
  window.removeEventListener('pointermove', handleDragMove);
  emitChange();
};

const emitChange = () => {
  // 表示座標系から正規化座標系（0-1）に変換して出力
  const baseX = padding.value;
  const baseY = padding.value;
  const w = displayWidth.value;
  const h = displayHeight.value;
  
  emit('change', {
    tl: { x: (corners.tl.x - baseX) / w, y: (corners.tl.y - baseY) / h },
    tr: { x: (corners.tr.x - baseX) / w, y: (corners.tr.y - baseY) / h },
    bl: { x: (corners.bl.x - baseX) / w, y: (corners.bl.y - baseY) / h },
    br: { x: (corners.br.x - baseX) / w, y: (corners.br.y - baseY) / h },
  });
};

const reset = () => {
  initCorners();
  renderPreview();
};

// 外部から変形を適用するメソッド
const applyTransform = (scaleX: number, scaleY: number, rotation: number, anchorX: number, anchorY: number) => {
  const cx = padding.value + displayWidth.value * anchorX;
  const cy = padding.value + displayHeight.value * anchorY;
  const hw = displayWidth.value / 2;
  const hh = displayHeight.value / 2;
  
  // 初期の4点（anchorを中心とした相対座標）
  const points = [
    { x: padding.value - cx, y: padding.value - cy },           // tl
    { x: padding.value + displayWidth.value - cx, y: padding.value - cy },  // tr
    { x: padding.value - cx, y: padding.value + displayHeight.value - cy }, // bl
    { x: padding.value + displayWidth.value - cx, y: padding.value + displayHeight.value - cy }, // br
  ];
  
  const rad = rotation * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  // スケールと回転を適用
  const transformed = points.map(p => ({
    x: cx + (p.x * scaleX * cos - p.y * scaleY * sin),
    y: cy + (p.x * scaleX * sin + p.y * scaleY * cos),
  }));
  
  corners.tl = transformed[0]!;
  corners.tr = transformed[1]!;
  corners.bl = transformed[2]!;
  corners.br = transformed[3]!;
  
  renderPreview();
  emitChange();
};

// 現在の変形情報を取得
const getTransformInfo = () => {
  const baseX = padding.value;
  const baseY = padding.value;
  const w = displayWidth.value;
  const h = displayHeight.value;
  
  // 中心点
  const cx = (corners.tl.x + corners.tr.x + corners.bl.x + corners.br.x) / 4;
  const cy = (corners.tl.y + corners.tr.y + corners.bl.y + corners.br.y) / 4;
  
  // スケール（上辺と左辺の長さから推定）
  const topLen = Math.sqrt(
    Math.pow(corners.tr.x - corners.tl.x, 2) + Math.pow(corners.tr.y - corners.tl.y, 2)
  );
  const leftLen = Math.sqrt(
    Math.pow(corners.bl.x - corners.tl.x, 2) + Math.pow(corners.bl.y - corners.tl.y, 2)
  );
  const scaleX = topLen / w;
  const scaleY = leftLen / h;
  
  // 回転角度（上辺の角度から推定）
  const angle = Math.atan2(corners.tr.y - corners.tl.y, corners.tr.x - corners.tl.x);
  const rotation = angle * 180 / Math.PI;
  
  return { scaleX, scaleY, rotation };
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
    // ズーム中心をマウス位置にする
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

defineExpose({ reset, applyTransform, getTransformInfo });

let resizeObserver: ResizeObserver | null = null;
let previousDisplayWidth = 0;
let previousDisplayHeight = 0;
let previousPadding = 80;

const rescaleCorners = (oldW: number, oldH: number, newW: number, newH: number, oldPad: number, newPad: number) => {
  // 以前のサイズがない場合は初期化
  if (oldW <= 0 || oldH <= 0) {
    initCorners();
    return;
  }
  
  // コーナー位置をスケーリング
  const scaleX = newW / oldW;
  const scaleY = newH / oldH;
  
  // 古いpaddingからの相対位置を計算して新しいpadding+スケーリング
  const rescalePoint = (p: Corner): Corner => {
    const relX = p.x - oldPad;
    const relY = p.y - oldPad;
    return {
      x: newPad + relX * scaleX,
      y: newPad + relY * scaleY,
    };
  };
  
  corners.tl = rescalePoint(corners.tl);
  corners.tr = rescalePoint(corners.tr);
  corners.bl = rescalePoint(corners.bl);
  corners.br = rescalePoint(corners.br);
};

onMounted(() => {
  if (scrollContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      const oldW = previousDisplayWidth;
      const oldH = previousDisplayHeight;
      const oldPad = previousPadding;
      updateDimensions();
      const newW = displayWidth.value;
      const newH = displayHeight.value;
      const newPad = dynamicPadding.value;
      
      if (oldW > 0 && oldH > 0 && (oldW !== newW || oldH !== newH || oldPad !== newPad)) {
        rescaleCorners(oldW, oldH, newW, newH, oldPad, newPad);
      } else if (oldW <= 0 || oldH <= 0) {
        initCorners();
      }
      
      previousDisplayWidth = newW;
      previousDisplayHeight = newH;
      previousPadding = newPad;
      renderPreview();
    });
    resizeObserver.observe(scrollContainerRef.value);
  }
  loadImage();
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handleDragMove);
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

watch(() => props.src, () => {
  isReady.value = false;
  loadImage();
});
</script>

