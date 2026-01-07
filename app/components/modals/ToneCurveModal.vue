<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Button from '~/components/ui/Button.vue';

interface Point {
  x: number; // 0..1
  y: number; // 0..1
}

const props = defineProps<{
  visible: boolean;
  modelValue: Point[];
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:modelValue', value: Point[]): void;
  (e: 'preview', value: Point[]): void;
  (e: 'apply', value: Point[]): void;
  (e: 'cancel'): void;
}>();

const width = 220;
const height = 160;
const padding = 12;

// pointsは常にx座標でソート済みで保持（モーダル内ローカル状態）
const points = ref<Point[]>([...props.modelValue].sort((a, b) => a.x - b.x));
const dragging = ref<number | null>(null);
const svgRef = ref<SVGElement | null>(null);

// モーダルが開いたときにリセット
watch(() => props.visible, (visible) => {
  if (visible) {
    points.value = [...props.modelValue].sort((a, b) => a.x - b.x);
  }
});

// カーブ変更時にプレビューをリクエスト
const requestPreview = () => {
  emit('preview', [...points.value]);
};

const toPx = (p: Point) => ({
  x: padding + p.x * (width - padding * 2),
  y: padding + (1 - p.y) * (height - padding * 2),
});

const toNorm = (xPx: number, yPx: number): Point => {
  const nx = Math.min(1, Math.max(0, (xPx - padding) / (width - padding * 2)));
  const ny = 1 - Math.min(1, Math.max(0, (yPx - padding) / (height - padding * 2)));
  return { x: nx, y: ny };
};

const pointsPx = computed(() => points.value.map(toPx));

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

// ハンドルを右クリックした時（削除）
const onHandleRightClick = (idx: number) => {
  if (idx === 0 || idx === points.value.length - 1) return;
  const updated = points.value.filter((_, i) => i !== idx);
  points.value = clampMidPoints(updated);
  requestPreview();
};

// ハンドルをクリックした時（ドラッグ開始）
const onHandlePointerDown = (e: PointerEvent, idx: number) => {
  e.preventDefault();
  dragging.value = idx;
  const svg = svgRef.value as SVGElement;
  if (svg) {
    svg.setPointerCapture(e.pointerId);
  }
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', (ev) => onPointerUp(ev), { once: true });
};

// SVG背景をクリックした時（新しい点を追加）
const onSvgPointerDown = (e: PointerEvent) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('curve__handle')) return;

  const svg = svgRef.value as SVGElement;
  if (!svg) return;
  const svgRect = svg.getBoundingClientRect();
  const x = e.clientX - svgRect.left;
  const y = e.clientY - svgRect.top;

  const newPt = toNorm(x, y);
  const pts = clampMidPoints([...points.value, newPt]);
  points.value = pts;
  requestPreview();
  const newIdx = points.value.findIndex((p) => Math.abs(p.x - newPt.x) < 0.005 && Math.abs(p.y - newPt.y) < 0.005);
  dragging.value = newIdx >= 0 ? newIdx : null;
  
  if (svg) {
    svg.setPointerCapture(e.pointerId);
  }
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', (ev) => onPointerUp(ev), { once: true });
};

const onPointerMove = (e: PointerEvent) => {
  if (dragging.value === null) return;
  const svg = svgRef.value as SVGElement;
  if (!svg) return;
  const svgRect = svg.getBoundingClientRect();
  const x = e.clientX - svgRect.left;
  const y = e.clientY - svgRect.top;
  const p = toNorm(x, y);
  const idx = dragging.value;
  const pts = clampMidPoints(updatePoint(points.value, idx, p));
  points.value = pts;
  requestPreview();
};

const onPointerUp = (e: PointerEvent) => {
  window.removeEventListener('pointermove', onPointerMove);
  const svg = svgRef.value as SVGElement;
  if (svg && e.pointerId !== undefined) {
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }
  dragging.value = null;
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

const handleReset = () => {
  points.value = [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.75 },
    { x: 1, y: 1 },
  ];
  requestPreview();
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
  requestPreview();
};

// 適用ボタン
const handleApply = () => {
  const sorted = [...points.value].sort((a, b) => a.x - b.x);
  emit('update:modelValue', sorted);
  emit('apply', sorted);
  emit('update:visible', false);
};

// キャンセルボタン
const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="トーンカーブ"
    width="620px"
    min-width="580px"
    min-height="380px"
    resizable
    show-reset
    @update:visible="emit('update:visible', $event)"
    @apply="handleApply"
    @cancel="handleCancel"
    @reset="handleReset"
  >
    <div class="modal-content">
      <!-- プレビューエリア -->
      <div class="modal-preview-section">
        <div class="modal-preview-container">
          <img v-if="previewSrc" :src="previewSrc" class="modal-preview-image" />
          <div v-else class="modal-preview-placeholder">プレビュー</div>
        </div>
      </div>
      
      <!-- カーブエディタ -->
      <div class="modal-controls-section tonecurve-controls">
        <div class="control-section">
          <div class="section-title">カーブ編集</div>
          <div class="curve" ref="svgRef">
            <svg :width="width" :height="height" @pointerdown="onSvgPointerDown">
              <rect :width="width" :height="height" class="curve__bg" />
              <path class="curve__line" :d="curvePath" />
              <circle
                v-for="(p, idx) in pointsPx"
                :key="idx"
                class="curve__handle"
                :cx="p.x"
                :cy="p.y"
                :data-idx="idx"
                r="8"
                @pointerdown.stop="onHandlePointerDown($event, idx)"
                @contextmenu.stop.prevent="onHandleRightClick(idx)"
              />
            </svg>
          </div>
          <p class="control-hint">クリックで点追加、右クリックで削除</p>
        </div>
        
        <div class="control-section">
          <div class="section-title">プリセット</div>
          <div class="curve__presets">
            <Button variant="outline" size="sm" @click="applyPreset('linear')">リニア</Button>
            <Button variant="outline" size="sm" @click="applyPreset('contrast')">コントラスト+</Button>
            <Button variant="outline" size="sm" @click="applyPreset('fade')">フェード</Button>
            <Button variant="outline" size="sm" @click="applyPreset('inverse')">反転</Button>
            <Button variant="outline" size="sm" @click="applyPreset('matte')">マット</Button>
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
