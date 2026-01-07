<script setup lang="ts">
import OperationModal from './OperationModal.vue';
import Slider from './Slider.vue';

const props = defineProps<{
  visible: boolean;
  currentWidth: number;
  currentHeight: number;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', width: number, height: number): void;
  (e: 'apply', width: number, height: number): void;
  (e: 'cancel'): void;
}>();

const width = ref(props.currentWidth);
const height = ref(props.currentHeight);
const scalePercent = ref(100);
const lockAspect = ref(true);
const aspectRatio = computed(() => props.currentWidth / props.currentHeight);

watch(() => props.visible, (visible) => {
  if (visible) {
    width.value = props.currentWidth;
    height.value = props.currentHeight;
    scalePercent.value = 100;
  }
});

watch(() => props.currentWidth, (w) => {
  if (props.visible && scalePercent.value === 100) {
    width.value = w;
  }
});

watch(() => props.currentHeight, (h) => {
  if (props.visible && scalePercent.value === 100) {
    height.value = h;
  }
});

const handleWidthChange = (val: number) => {
  width.value = val;
  if (lockAspect.value) {
    height.value = Math.round(val / aspectRatio.value);
  }
  scalePercent.value = Math.round((val / props.currentWidth) * 100);
  emitPreview();
};

const handleHeightChange = (val: number) => {
  height.value = val;
  if (lockAspect.value) {
    width.value = Math.round(val * aspectRatio.value);
  }
  scalePercent.value = Math.round((height.value / props.currentHeight) * 100);
  emitPreview();
};

const handleScaleChange = (val: number) => {
  scalePercent.value = val;
  width.value = Math.max(1, Math.round(props.currentWidth * val / 100));
  height.value = Math.max(1, Math.round(props.currentHeight * val / 100));
  emitPreview();
};

const emitPreview = () => {
  emit('preview', width.value, height.value);
};

const handleApply = () => {
  emit('apply', width.value, height.value);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  width.value = props.currentWidth;
  height.value = props.currentHeight;
  scalePercent.value = 100;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="リサイズ"
    width="650px"
    min-width="500px"
    min-height="350px"
    resizable
    show-reset
    @update:visible="emit('update:visible', $event)"
    @apply="handleApply"
    @cancel="handleCancel"
    @reset="handleReset"
  >
    <div class="resize-modal-content">
      <div class="preview-section">
        <div class="preview-container">
          <img v-if="previewSrc" :src="previewSrc" class="preview-image" />
          <div v-else class="preview-placeholder">プレビュー</div>
        </div>
      </div>
      
      <div class="controls-section">
        <div class="control-group">
          <label class="control-label">幅</label>
          <div class="input-with-unit">
            <input
              type="number"
              :value="width"
              min="1"
              max="10000"
              @input="handleWidthChange(Number(($event.target as HTMLInputElement).value))"
              class="number-input"
            />
            <span class="unit">px</span>
          </div>
        </div>
        
        <div class="control-group">
          <label class="control-label">高さ</label>
          <div class="input-with-unit">
            <input
              type="number"
              :value="height"
              min="1"
              max="10000"
              @input="handleHeightChange(Number(($event.target as HTMLInputElement).value))"
              class="number-input"
            />
            <span class="unit">px</span>
          </div>
        </div>
        
        <div class="control-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="lockAspect" />
            縦横比を維持
          </label>
        </div>
        
        <div class="control-group">
          <label class="control-label">拡大縮小 (%)</label>
          <Slider
            :model-value="scalePercent"
            :min="1"
            :max="400"
            :step="1"
            @update:model-value="handleScaleChange"
          />
        </div>
        
        <div class="info-text">
          元のサイズ: {{ currentWidth }} × {{ currentHeight }} px<br />
          新しいサイズ: {{ width }} × {{ height }} px
        </div>
      </div>
    </div>
  </OperationModal>
</template>

<style scoped>
.resize-modal-content {
  display: flex;
  gap: 24px;
}

.preview-section {
  flex: 1;
  min-width: 200px;
}

.preview-container {
  background: var(--checkerboard-bg);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.preview-placeholder {
  color: var(--color-text-muted);
  font-size: 14px;
}

.controls-section {
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.input-with-unit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
}

.number-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.unit {
  font-size: 13px;
  color: var(--color-text-muted);
}

.checkbox-group {
  flex-direction: row;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
}

.info-text {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.6;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}
</style>
