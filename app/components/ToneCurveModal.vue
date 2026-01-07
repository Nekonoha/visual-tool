<template>
  <div class="modal-backdrop" @click.self="close">
    <div
      class="modal"
      :style="{ transform: `translate(-50%, -50%) translate(${modalPos.x}px, ${modalPos.y}px)` }"
      @pointerdown.stop
    >
      <header class="modal__header" @pointerdown.prevent="onDragStart">
        <h3 class="modal__title">トーンカーブ</h3>
        <button class="modal__close" @click="close">✕</button>
      </header>
      <div class="modal__body">
        <div class="curve" ref="svgRef">
            <svg :width="width" :height="height" @pointerdown="onPointerDown">
              <rect :width="width" :height="height" class="curve__bg" />
              <path
                class="curve__line"
                :d="curvePath"
              />
              <circle
                v-for="(p, idx) in pointsPx"
                :key="idx"
                class="curve__handle"
                :cx="p.x"
                :cy="p.y"
                :data-idx="idx"
                r="8"
                @dblclick.stop.prevent="removePoint(idx)"
              />
            </svg>
        </div>
        <div class="curve__toolbar">
          <div class="curve__presets">
            <Button variant="outline" size="sm" @click="applyPreset('linear')">リニア</Button>
            <Button variant="outline" size="sm" @click="applyPreset('contrast')">コントラスト+</Button>
            <Button variant="outline" size="sm" @click="applyPreset('fade')">フェード</Button>
            <Button variant="outline" size="sm" @click="applyPreset('inverse')">反転</Button>
            <Button variant="outline" size="sm" @click="applyPreset('matte')">マット</Button>
          </div>
          <p class="curve__hint">グラフをクリックで点追加、ハンドルのダブルクリックで削除（端点は固定）</p>
        </div>
        <div class="modal__actions">
          <Button variant="outline" size="sm" @click="resetDefault">デフォルト</Button>
          <div class="modal__spacer"></div>
          <Button variant="outline" size="sm" @click="close">キャンセル</Button>
          <Button variant="primary" size="sm" @click="apply">適用</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from './Button.vue';

interface Point {
  x: number; // 0..1
  y: number; // 0..1
}

const props = defineProps<{ modelValue: Point[] }>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: Point[]): void;
  (e: 'preview', value: Point[]): void;
  (e: 'close'): void;
  (e: 'apply', value: Point[]): void;
}>();

const width = 320;
const height = 240;
const padding = 16;

const modalPos = ref({ x: 0, y: 0 });
const draggingModal = ref(false);
let dragStart = { x: 0, y: 0 };
let modalStart = { x: 0, y: 0 };

const points = ref<Point[]>([...props.modelValue]);
const dragging = ref<number | null>(null);

const toPx = (p: Point) => ({
  x: padding + p.x * (width - padding * 2),
  y: padding + (1 - p.y) * (height - padding * 2),
});

const toNorm = (xPx: number, yPx: number): Point => {
  const nx = Math.min(1, Math.max(0, (xPx - padding) / (width - padding * 2)));
  const ny = 1 - Math.min(1, Math.max(0, (yPx - padding) / (height - padding * 2)));
  return { x: nx, y: ny };
};

const sortedPoints = computed(() => [...points.value].sort((a, b) => a.x - b.x));
const pointsPx = computed(() => sortedPoints.value.map(toPx));

type Pt = { x: number; y: number };
const toPathD = (pts: Pt[]) => {
  if (pts.length < 2) return '';
  const path: string[] = [];
  const firstPt = pts[0];
  if (!firstPt) return '';
  path.push(`M ${firstPt.x} ${firstPt.y}`);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) continue;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`);
  }
  return path.join(' ');
};

const curvePath = computed(() => toPathD(pointsPx.value));

const onPointerDown = (e: PointerEvent) => {
  const target = e.target as HTMLElement;
  const idxAttr = target.getAttribute('data-idx');
  const svgRect = (svgRef.value as SVGElement).getBoundingClientRect();
  const x = e.clientX - svgRect.left;
  const y = e.clientY - svgRect.top;

  if (idxAttr !== null) {
    const idx = Number(idxAttr);
    dragging.value = idx;
  } else {
    const newPt = toNorm(x, y);
    const pts = clampMidPoints([...points.value, newPt]);
    points.value = pts;
    emit('preview', [...points.value]);
    emit('update:modelValue', [...points.value]);
    const newIdx = points.value.findIndex((p) => Math.abs(p.x - newPt.x) < 0.005 && Math.abs(p.y - newPt.y) < 0.005);
    dragging.value = newIdx >= 0 ? newIdx : null;
  }

  (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
};

const onPointerMove = (e: PointerEvent) => {
  if (dragging.value === null) return;
  const svgRect = (svgRef.value as SVGElement).getBoundingClientRect();
  const x = e.clientX - svgRect.left;
  const y = e.clientY - svgRect.top;
  const p = toNorm(x, y);
  const idx = dragging.value;
  const pts = clampMidPoints(updatePoint(points.value, idx, p));
  points.value = pts;
  emit('preview', [...pts]);
  emit('update:modelValue', [...pts]);
};

const onPointerUp = (e: PointerEvent) => {
  const svg = svgRef.value as SVGElement;
  svg.releasePointerCapture(e.pointerId);
  window.removeEventListener('pointermove', onPointerMove);
  dragging.value = null;
};

const resetDefault = () => {
  points.value = [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.2 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.8 },
    { x: 1, y: 1 },
  ];
  emit('preview', [...points.value]);
  emit('update:modelValue', [...points.value]);
};

const applyPreset = (preset: 'linear' | 'contrast' | 'fade' | 'inverse' | 'matte') => {
  const presets: Record<typeof preset, Point[]> = {
    linear: [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 0.75, y: 0.75 },
      { x: 1, y: 1 },
    ],
    contrast: [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.15 },
      { x: 0.5, y: 0.5 },
      { x: 0.75, y: 0.85 },
      { x: 1, y: 1 },
    ],
    fade: [
      { x: 0, y: 0.08 },
      { x: 0.3, y: 0.35 },
      { x: 0.6, y: 0.7 },
      { x: 1, y: 0.95 },
    ],
    inverse: [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ],
    matte: [
      { x: 0, y: 0.12 },
      { x: 0.35, y: 0.45 },
      { x: 0.65, y: 0.72 },
      { x: 1, y: 0.92 },
    ],
  };
  points.value = clampMidPoints(presets[preset] ?? presets.linear);
  emit('preview', [...points.value]);
  emit('update:modelValue', [...points.value]);
};

const apply = () => {
  const sorted = [...points.value].sort((a, b) => a.x - b.x);
  emit('update:modelValue', sorted);
  emit('apply', sorted);
};

const clampMidPoints = (pts: Point[]) => {
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  return sorted.map((p, idx, arr) => {
    const isFirst = idx === 0;
    const isLast = idx === arr.length - 1;
    const prev = arr[idx - 1]?.x ?? 0;
    const next = arr[idx + 1]?.x ?? 1;
    return {
      x: isFirst ? 0 : isLast ? 1 : Math.min(next - 0.01, Math.max(prev + 0.01, p.x)),
      y: Math.min(1, Math.max(0, p.y)),
    };
  });
};

const updatePoint = (pts: Point[], idx: number, p: Point) => {
  const cloned = [...pts];
  cloned[idx] = p;
  return cloned;
};

const removePoint = (idx: number) => {
  if (idx === 0 || idx === points.value.length - 1) return; // keep endpoints
  const updated = points.value.filter((_, i) => i !== idx);
  points.value = clampMidPoints(updated);
  emit('preview', [...points.value]);
  emit('update:modelValue', [...points.value]);
};

const onDragStart = (e: PointerEvent) => {
  draggingModal.value = true;
  dragStart = { x: e.clientX, y: e.clientY };
  modalStart = { ...modalPos.value };
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd, { once: true });
};

const onDragMove = (e: PointerEvent) => {
  if (!draggingModal.value) return;
  modalPos.value = {
    x: modalStart.x + (e.clientX - dragStart.x),
    y: modalStart.y + (e.clientY - dragStart.y),
  };
};

const onDragEnd = () => {
  draggingModal.value = false;
  window.removeEventListener('pointermove', onDragMove);
};

const close = () => emit('close');

const svgRef = ref<SVGElement | null>(null);
</script>

