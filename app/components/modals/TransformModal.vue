<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import ModalPreview from '~/components/ui/ModalPreview.vue';
import Slider from '~/components/ui/Slider.vue';

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
    width="850px"
    min-width="700px"
    min-height="520px"
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
          <ModalPreview v-if="previewSrc" :src="previewSrc" />
          <div v-else class="modal-preview-placeholder">プレビュー</div>
        </div>
      </div>
      
      <div class="modal-controls-section">
        <div class="control-section">
          <h4 class="section-title">回転</h4>
          <div class="control-group">
            <label class="control-label">角度: {{ rotation }}°</label>
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
        </div>
        
        <div class="control-section">
          <h4 class="section-title">反転</h4>
          <div class="control-group">
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
    </div>
  </OperationModal>
</template>
