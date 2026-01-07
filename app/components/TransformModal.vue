<script setup lang="ts">
import OperationModal from './OperationModal.vue';
import Slider from './Slider.vue';

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', rotation: number, flipH: boolean, flipV: boolean): void;
  (e: 'apply', rotation: number, flipH: boolean, flipV: boolean): void;
  (e: 'cancel'): void;
}>();

const rotation = ref(0);
const flipH = ref(false);
const flipV = ref(false);

watch(() => props.visible, (visible) => {
  if (visible) {
    rotation.value = 0;
    flipH.value = false;
    flipV.value = false;
  }
});

const handleRotationChange = (val: number) => {
  rotation.value = val;
  emitPreview();
};

const handleFlipH = () => {
  flipH.value = !flipH.value;
  emitPreview();
};

const handleFlipV = () => {
  flipV.value = !flipV.value;
  emitPreview();
};

const handleRotate90 = (direction: 1 | -1) => {
  rotation.value = ((rotation.value + direction * 90) % 360 + 360) % 360;
  emitPreview();
};

const emitPreview = () => {
  emit('preview', rotation.value, flipH.value, flipV.value);
};

const handleApply = () => {
  emit('apply', rotation.value, flipH.value, flipV.value);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  rotation.value = 0;
  flipH.value = false;
  flipV.value = false;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="回転・反転"
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
    <div class="transform-modal-content">
      <div class="preview-section">
        <div class="preview-container">
          <img v-if="previewSrc" :src="previewSrc" class="preview-image" />
          <div v-else class="preview-placeholder">プレビュー</div>
        </div>
      </div>
      
      <div class="controls-section">
        <div class="control-group">
          <label class="control-label">回転 ({{ rotation }}°)</label>
          <Slider
            :model-value="rotation"
            :min="-180"
            :max="180"
            :step="1"
            @update:model-value="handleRotationChange"
          />
        </div>
        
        <div class="control-group">
          <label class="control-label">90°回転</label>
          <div class="button-row">
            <button class="action-btn" @click="handleRotate90(-1)">
              ↺ 左90°
            </button>
            <button class="action-btn" @click="handleRotate90(1)">
              ↻ 右90°
            </button>
          </div>
        </div>
        
        <div class="control-group">
          <label class="control-label">反転</label>
          <div class="button-row">
            <button
              class="action-btn"
              :class="{ active: flipH }"
              @click="handleFlipH"
            >
              ↔ 水平反転
            </button>
            <button
              class="action-btn"
              :class="{ active: flipV }"
              @click="handleFlipV"
            >
              ↕ 垂直反転
            </button>
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>

<style scoped>
.transform-modal-content {
  display: flex;
  gap: 24px;
}

.preview-section {
  flex: 1;
  min-width: 250px;
}

.preview-container {
  background: var(--checkerboard-bg);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 350px;
  object-fit: contain;
}

.preview-placeholder {
  color: var(--color-text-muted);
  font-size: 14px;
}

.controls-section {
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.button-row {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: var(--color-surface-hover);
}

.action-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}
</style>
