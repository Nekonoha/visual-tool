<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', threshold: number): void;
  (e: 'apply', threshold: number): void;
  (e: 'cancel'): void;
}>();

const threshold = ref(128);

watch(() => props.visible, (visible) => {
  if (visible) {
    threshold.value = 128;
  }
});

const handleThresholdChange = (val: number) => {
  threshold.value = val;
  emit('preview', threshold.value);
};

const handleApply = () => {
  emit('apply', threshold.value);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  threshold.value = 128;
  emit('preview', threshold.value);
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="2値化"
    width="620px"
    min-width="580px"
    min-height="360px"
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
          <h4 class="section-title">設定</h4>
          <div class="control-group">
            <label class="control-label">しきい値: {{ threshold }}</label>
            <Slider
              :model-value="threshold"
              :min="0"
              :max="255"
              :step="1"
              @update:model-value="handleThresholdChange"
            />
          </div>
          <p class="control-hint">しきい値より暗いピクセルは黒、明るいピクセルは白になります</p>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
