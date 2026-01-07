<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';
import FileInput from '~/components/ui/FileInput.vue';

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', watermark: WatermarkParams): void;
  (e: 'apply', watermark: WatermarkParams): void;
  (e: 'cancel'): void;
}>();

interface WatermarkParams {
  type: 'none' | 'text' | 'image';
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  offsetX: number;
  offsetY: number;
  imageDataURL: string;
  scale: number;
  mode: 'single' | 'pattern';
  rotation: number;
  spacingX: number;
  spacingY: number;
}

const watermarkType = ref<'none' | 'text' | 'image'>('text');
const watermarkText = ref('Sample Watermark');
const watermarkFontSize = ref(32);
const watermarkColor = ref('#ffffff');
const watermarkOpacity = ref(50);
const watermarkPosition = ref<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'>('bottom-right');
const watermarkOffsetX = ref(24);
const watermarkOffsetY = ref(24);
const watermarkImageDataURL = ref('');
const watermarkImageName = ref('');
const watermarkScale = ref(30);
const watermarkMode = ref<'single' | 'pattern'>('single');
const watermarkRotation = ref(0);
const watermarkSpacingX = ref(100);
const watermarkSpacingY = ref(100);

watch(() => props.visible, (visible) => {
  if (visible) {
    resetToDefaults();
  }
});

const resetToDefaults = () => {
  watermarkType.value = 'text';
  watermarkText.value = 'Sample Watermark';
  watermarkFontSize.value = 32;
  watermarkColor.value = '#ffffff';
  watermarkOpacity.value = 50;
  watermarkPosition.value = 'bottom-right';
  watermarkOffsetX.value = 24;
  watermarkOffsetY.value = 24;
  watermarkImageDataURL.value = '';
  watermarkImageName.value = '';
  watermarkScale.value = 30;
  watermarkMode.value = 'single';
  watermarkRotation.value = 0;
  watermarkSpacingX.value = 100;
  watermarkSpacingY.value = 100;
};

const getWatermarkParams = (): WatermarkParams => ({
  type: watermarkType.value,
  text: watermarkText.value,
  fontSize: watermarkFontSize.value,
  color: watermarkColor.value,
  opacity: watermarkOpacity.value / 100,
  position: watermarkPosition.value,
  offsetX: watermarkOffsetX.value,
  offsetY: watermarkOffsetY.value,
  imageDataURL: watermarkImageDataURL.value,
  scale: watermarkScale.value / 100,
  mode: watermarkMode.value,
  rotation: watermarkRotation.value,
  spacingX: watermarkSpacingX.value,
  spacingY: watermarkSpacingY.value,
});

const emitPreview = () => {
  emit('preview', getWatermarkParams());
};

// watchers for live preview
watch([
  watermarkType, watermarkText, watermarkFontSize, watermarkColor,
  watermarkOpacity, watermarkPosition, watermarkOffsetX, watermarkOffsetY,
  watermarkImageDataURL, watermarkScale, watermarkMode, watermarkRotation,
  watermarkSpacingX, watermarkSpacingY
], () => {
  emitPreview();
});

const handleImageSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
  watermarkImageDataURL.value = dataURL;
  watermarkImageName.value = file.name;
  watermarkType.value = 'image';
};

const handleApply = () => {
  emit('apply', getWatermarkParams());
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  resetToDefaults();
  emitPreview();
};

const positions = [
  { value: 'top-left', label: '左上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
  { value: 'center', label: '中央' },
] as const;
</script>

<template>
  <OperationModal
    :visible="visible"
    title="ウォーターマーク"
    width="620px"
    min-width="580px"
    min-height="480px"
    resizable
    show-reset
    @update:visible="emit('update:visible', $event)"
    @apply="handleApply"
    @cancel="handleCancel"
    @reset="handleReset"
  >
    <div class="modal-content">
      <div class="modal-preview-section">
        <div class="modal-preview-container">
          <img v-if="previewSrc" :src="previewSrc" class="modal-preview-image" />
          <div v-else class="modal-preview-placeholder">プレビュー</div>
        </div>
      </div>
      
      <div class="modal-controls-section">
        <div class="control-section">
          <h4 class="section-title">種類</h4>
          <div class="control-group">
            <div class="type-buttons">
              <button
                class="type-btn"
                :class="{ active: watermarkType === 'text' }"
                @click="watermarkType = 'text'"
              >
                テキスト
              </button>
              <button
                class="type-btn"
                :class="{ active: watermarkType === 'image' }"
                @click="watermarkType = 'image'"
              >
                画像
              </button>
            </div>
          </div>
        </div>
        
        <!-- テキスト設定 -->
        <template v-if="watermarkType === 'text'">
          <div class="control-section">
            <h4 class="section-title">テキスト設定</h4>
            <div class="control-group">
              <label class="control-label">テキスト</label>
              <input
                type="text"
                v-model="watermarkText"
                class="text-input"
              />
            </div>
            <div class="control-group">
              <label class="control-label">フォントサイズ: {{ watermarkFontSize }}px</label>
              <Slider
                v-model="watermarkFontSize"
                :min="8"
                :max="200"
                :step="1"
              />
            </div>
            <div class="control-group">
              <label class="control-label">色</label>
              <input type="color" v-model="watermarkColor" class="color-input" />
            </div>
          </div>
        </template>
        
        <!-- 画像設定 -->
        <template v-if="watermarkType === 'image'">
          <div class="control-section">
            <h4 class="section-title">画像設定</h4>
            <div class="control-group">
              <label class="control-label">画像ファイル</label>
              <div class="file-input-wrapper">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleImageSelect"
                  class="file-input"
                />
                <span v-if="watermarkImageName" class="file-name">{{ watermarkImageName }}</span>
              </div>
            </div>
            <div class="control-group">
              <label class="control-label">サイズ: {{ watermarkScale }}%</label>
              <Slider
                v-model="watermarkScale"
                :min="1"
                :max="100"
                :step="1"
              />
            </div>
          </div>
        </template>
        
        <!-- 共通設定 -->
        <div class="control-section">
          <h4 class="section-title">表示設定</h4>
          <div class="control-group">
            <label class="control-label">透明度: {{ watermarkOpacity }}%</label>
            <Slider
              v-model="watermarkOpacity"
              :min="1"
              :max="100"
              :step="1"
            />
          </div>
          <div class="control-group">
            <label class="control-label">モード</label>
            <div class="type-buttons">
              <button
                class="type-btn"
                :class="{ active: watermarkMode === 'single' }"
                @click="watermarkMode = 'single'"
              >
                単一
              </button>
              <button
                class="type-btn"
                :class="{ active: watermarkMode === 'pattern' }"
                @click="watermarkMode = 'pattern'"
              >
                パターン
              </button>
            </div>
          </div>
        </div>
        
        <template v-if="watermarkMode === 'single'">
          <div class="control-section">
            <h4 class="section-title">位置</h4>
            <div class="control-group">
              <select v-model="watermarkPosition" class="select-input">
                <option v-for="pos in positions" :key="pos.value" :value="pos.value">
                  {{ pos.label }}
                </option>
              </select>
            </div>
          </div>
        </template>
        
        <template v-if="watermarkMode === 'pattern'">
          <div class="control-section">
            <h4 class="section-title">パターン設定</h4>
            <div class="control-group">
              <label class="control-label">回転: {{ watermarkRotation }}°</label>
              <Slider
                v-model="watermarkRotation"
                :min="-90"
                :max="90"
                :step="1"
              />
            </div>
            <div class="control-group">
              <label class="control-label">間隔 X: {{ watermarkSpacingX }}px</label>
              <Slider
                v-model="watermarkSpacingX"
                :min="50"
                :max="500"
                :step="10"
              />
            </div>
            <div class="control-group">
              <label class="control-label">間隔 Y: {{ watermarkSpacingY }}px</label>
              <Slider
                v-model="watermarkSpacingY"
                :min="50"
                :max="500"
                :step="10"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </OperationModal>
</template>
