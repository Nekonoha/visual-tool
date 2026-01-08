<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';
import ModalPreview from '~/components/ui/ModalPreview.vue';

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', brightness: number, contrast: number): void;
  (e: 'apply', brightness: number, contrast: number): void;
  (e: 'cancel'): void;
}>();

const brightness = ref(100);
const contrast = ref(100);

watch(() => props.visible, (visible) => {
  if (visible) {
    brightness.value = 100;
    contrast.value = 100;
  }
});

const handleBrightnessChange = (val: number) => {
  brightness.value = val;
  emitPreview();
};

const handleContrastChange = (val: number) => {
  contrast.value = val;
  emitPreview();
};

const emitPreview = () => {
  emit('preview', brightness.value, contrast.value);
};

const handleApply = () => {
  emit('apply', brightness.value, contrast.value);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  brightness.value = 100;
  contrast.value = 100;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="明るさ・コントラスト"
    width="850px"
    min-width="700px"
    min-height="500px"
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
          <ModalPreview :src="previewSrc" />
        </div>
      </div>
      
      <div class="modal-controls-section">
        <div class="control-section">
          <h4 class="section-title">設定</h4>
          <div class="control-group">
            <label class="control-label">明るさ: {{ brightness }}</label>
            <Slider
              :model-value="brightness"
              :min="0"
              :max="200"
              :step="1"
              @update:model-value="handleBrightnessChange"
            />
          </div>
          <div class="control-group">
            <label class="control-label">コントラスト: {{ contrast }}</label>
            <Slider
              :model-value="contrast"
              :min="0"
              :max="200"
              :step="1"
              @update:model-value="handleContrastChange"
            />
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
