<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';
import ModalPreview from '~/components/ui/ModalPreview.vue';
import type { SharpenParams } from '~/types';

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', params: SharpenParams): void;
  (e: 'apply', params: SharpenParams): void;
  (e: 'cancel'): void;
}>();

const amount = ref(100);
const radius = ref(1);

const getParams = (): SharpenParams => ({
  amount: amount.value,
  radius: radius.value,
});

watch(() => props.visible, (visible) => {
  if (visible) {
    amount.value = 100;
    radius.value = 1;
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
  amount.value = 100;
  radius.value = 1;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="シャープ"
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
            <label class="control-label">量: {{ amount }}%</label>
            <Slider
              :model-value="amount"
              :min="0"
              :max="500"
              :step="10"
              @update:model-value="(v) => { amount = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">半径: {{ radius.toFixed(1) }}px</label>
            <Slider
              :model-value="radius"
              :min="0.5"
              :max="10"
              :step="0.5"
              @update:model-value="(v) => { radius = v; emitPreview(); }"
            />
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
