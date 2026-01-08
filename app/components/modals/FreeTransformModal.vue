<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import InteractiveTransform from '~/components/editor/InteractiveTransform.vue';
import Slider from '~/components/ui/Slider.vue';
import type { 
  Corner, 
  Corners, 
  TransformMode, 
  InterpolationMethod, 
  AnchorPosition 
} from '~/types';

const props = defineProps<{
  visible: boolean;
  originalSrc: string | null;
  imageWidth: number;
  imageHeight: number;
  mode?: TransformMode;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', params: Corners, interpolation: InterpolationMethod): void;
  (e: 'apply', params: Corners, interpolation: InterpolationMethod): void;
  (e: 'cancel'): void;
}>();

const transformRef = ref<InstanceType<typeof InteractiveTransform> | null>(null);

const defaultCorners: Corners = {
  tl: { x: 0, y: 0 },
  tr: { x: 1, y: 0 },
  bl: { x: 0, y: 1 },
  br: { x: 1, y: 1 },
};

const currentParams = ref<Corners>({ ...defaultCorners });

// コントロール値
const scaleX = ref(100);
const scaleY = ref(100);
const rotation = ref(0);
const anchor = ref<AnchorPosition>('c');
const interpolation = ref<InterpolationMethod>('bilinear');

const modeInfo: Record<TransformMode, { label: string; hint: string }> = {
  free: { label: '自由変形', hint: '頂点をドラッグして自由に変形。回転ハンドルで回転。反転も可能' },
  scale: { label: '拡大・縮小', hint: '中心基準でスケール。反転も可能' },
  perspective: { label: '遠近ゆがみ', hint: 'ドラッグした辺の反対側が逆方向に移動' },
  skew: { label: '平行ゆがみ', hint: '辺を平行に動かす（シアー変形）' },
  rotate: { label: '回転', hint: '回転ハンドルをドラッグして回転' },
};

const interpolationOptions = [
  { value: 'nearest', label: 'ニアレストネイバー' },
  { value: 'bilinear', label: 'バイリニア' },
  { value: 'average', label: '色の平均' },
];

const anchorPositions: { value: AnchorPosition; label: string }[] = [
  { value: 'tl', label: '左上' },
  { value: 't', label: '上' },
  { value: 'tr', label: '右上' },
  { value: 'l', label: '左' },
  { value: 'c', label: '中央' },
  { value: 'r', label: '右' },
  { value: 'bl', label: '左下' },
  { value: 'b', label: '下' },
  { value: 'br', label: '右下' },
];

const getAnchorCoords = (pos: AnchorPosition): { x: number; y: number } => {
  const map: Record<AnchorPosition, { x: number; y: number }> = {
    tl: { x: 0, y: 0 },
    t: { x: 0.5, y: 0 },
    tr: { x: 1, y: 0 },
    l: { x: 0, y: 0.5 },
    c: { x: 0.5, y: 0.5 },
    r: { x: 1, y: 0.5 },
    bl: { x: 0, y: 1 },
    b: { x: 0.5, y: 1 },
    br: { x: 1, y: 1 },
  };
  return map[pos];
};

const currentMode = computed(() => props.mode ?? 'free');
const modalTitle = computed(() => modeInfo[currentMode.value]?.label ?? '変形');
const hintText = computed(() => modeInfo[currentMode.value]?.hint ?? '');

const handleChange = (params: Corners) => {
  currentParams.value = params;
  // ハンドル操作時にコントロール値を更新
  updateControlsFromCorners();
  emit('preview', params, interpolation.value);
};

const updateControlsFromCorners = () => {
  const info = transformRef.value?.getTransformInfo();
  if (info) {
    scaleX.value = Math.round(info.scaleX * 100);
    scaleY.value = Math.round(info.scaleY * 100);
    rotation.value = Math.round(info.rotation);
  }
};

const applyControlValues = () => {
  const anchorCoords = getAnchorCoords(anchor.value);
  transformRef.value?.applyTransform(
    scaleX.value / 100,
    scaleY.value / 100,
    rotation.value,
    anchorCoords.x,
    anchorCoords.y
  );
};

// スライダー/入力値の変更時
const handleScaleXChange = (val: number) => {
  scaleX.value = val;
  applyControlValues();
};

const handleScaleYChange = (val: number) => {
  scaleY.value = val;
  applyControlValues();
};

const handleRotationChange = (val: number) => {
  rotation.value = val;
  applyControlValues();
};

const handleAnchorChange = (val: AnchorPosition) => {
  anchor.value = val;
};

const handleApply = () => {
  emit('apply', currentParams.value, interpolation.value);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  scaleX.value = 100;
  scaleY.value = 100;
  rotation.value = 0;
  anchor.value = 'c';
  transformRef.value?.reset();
  currentParams.value = { ...defaultCorners };
  emit('preview', currentParams.value, interpolation.value);
};

// 変形情報の表示用
const transformInfo = computed(() => {
  const c = currentParams.value;
  const width = Math.round((c.tr.x - c.tl.x + c.br.x - c.bl.x) / 2 * 100);
  const height = Math.round((c.bl.y - c.tl.y + c.br.y - c.tr.y) / 2 * 100);
  return { width, height };
});

watch(() => props.visible, (visible) => {
  if (visible) {
    nextTick(() => {
      handleReset();
    });
  }
});
</script>

<template>
  <OperationModal
    :visible="visible"
    :title="modalTitle"
    width="950px"
    height="700px"
    min-width="800px"
    min-height="600px"
    resizable
    show-reset
    @update:visible="emit('update:visible', $event)"
    @apply="handleApply"
    @cancel="handleCancel"
    @reset="handleReset"
  >
    <div class="transform-modal-content">
      <div class="transform-main-area">
        <div class="transform-preview-wrapper">
          <InteractiveTransform
            ref="transformRef"
            :src="originalSrc"
            :image-width="imageWidth"
            :image-height="imageHeight"
            :mode="currentMode"
            :interpolation="interpolation"
            :anchor="anchor"
            @change="handleChange"
          />
        </div>
        
        <div class="transform-controls">
          <!-- 基準点（自由変形以外で表示） -->
          <div v-if="currentMode !== 'free'" class="control-section">
            <label class="control-label">基準点</label>
            <div class="anchor-grid">
              <button
                v-for="pos in anchorPositions"
                :key="pos.value"
                :class="['anchor-btn', { active: anchor === pos.value }]"
                :title="pos.label"
                @click="handleAnchorChange(pos.value)"
              >
                <span class="anchor-dot" />
              </button>
            </div>
          </div>
          
          <div v-if="currentMode === 'free'" class="control-section">
            <div class="control-hint">自由変形モードでは基準点は影響しません</div>
          </div>
          
          <!-- 拡大率 -->
          <div class="control-section">
            <label class="control-label">幅 (%)</label>
            <div class="control-row">
              <Slider
                :model-value="scaleX"
                :min="-200"
                :max="200"
                :step="1"
                class="control-slider"
                @update:model-value="handleScaleXChange"
              />
              <input
                type="number"
                :value="scaleX"
                class="control-input"
                @input="handleScaleXChange(Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>
          
          <div class="control-section">
            <label class="control-label">高さ (%)</label>
            <div class="control-row">
              <Slider
                :model-value="scaleY"
                :min="-200"
                :max="200"
                :step="1"
                class="control-slider"
                @update:model-value="handleScaleYChange"
              />
              <input
                type="number"
                :value="scaleY"
                class="control-input"
                @input="handleScaleYChange(Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>
          
          <!-- 回転 -->
          <div class="control-section">
            <label class="control-label">回転 (°)</label>
            <div class="control-row">
              <Slider
                :model-value="rotation"
                :min="-180"
                :max="180"
                :step="1"
                class="control-slider"
                @update:model-value="handleRotationChange"
              />
              <input
                type="number"
                :value="rotation"
                class="control-input"
                @input="handleRotationChange(Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>
          
          <!-- 補間方法 -->
          <div class="control-section">
            <label class="control-label">補間方法</label>
            <select v-model="interpolation" class="control-select">
              <option v-for="opt in interpolationOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="transform-footer">
        <div class="transform-info">
          <span>幅: {{ transformInfo.width }}%</span>
          <span>高さ: {{ transformInfo.height }}%</span>
          <span>回転: {{ rotation }}°</span>
        </div>
        <div class="transform-hint">
          <p>💡 {{ hintText }}</p>
        </div>
      </div>
    </div>
  </OperationModal>
</template>

