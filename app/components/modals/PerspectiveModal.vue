<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';
import ModalPreview from '~/components/ui/ModalPreview.vue';
import type { PerspectiveParams } from '~/types';

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', params: PerspectiveParams): void;
  (e: 'apply', params: PerspectiveParams): void;
  (e: 'cancel'): void;
}>();

const horizontal = ref(0);
const vertical = ref(0);

const getParams = (): PerspectiveParams => ({
  horizontal: horizontal.value / 100,
  vertical: vertical.value / 100,
});

watch(() => props.visible, (visible) => {
  if (visible) {
    horizontal.value = 0;
    vertical.value = 0;
  }
});

const emitPreview = () => {
  emit('preview', getParams());
};

const handleApply = () => {
  emit('apply', getParams());
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  horizontal.value = 0;
  vertical.value = 0;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="遠近ゆがみ"
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
          <h4 class="section-title">遠近法</h4>
          <div class="control-group">
            <label class="control-label">水平: {{ horizontal }}%</label>
            <Slider
              :model-value="horizontal"
              :min="-50"
              :max="50"
              :step="1"
              @update:model-value="(v) => { horizontal = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">垂直: {{ vertical }}%</label>
            <Slider
              :model-value="vertical"
              :min="-50"
              :max="50"
              :step="1"
              @update:model-value="(v) => { vertical = v; emitPreview(); }"
            />
          </div>
          <p class="control-hint">遠近感のある変形を適用します</p>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
