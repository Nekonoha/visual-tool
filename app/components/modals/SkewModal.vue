<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

interface SkewParams {
  horizontal: number;
  vertical: number;
}

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', params: SkewParams): void;
  (e: 'apply', params: SkewParams): void;
  (e: 'cancel'): void;
}>();

const horizontal = ref(0);
const vertical = ref(0);

const getParams = (): SkewParams => ({
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
    title="平行ゆがみ"
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
      <div class="modal-preview-section">
        <div class="modal-preview-container">
          <img v-if="previewSrc" :src="previewSrc" class="modal-preview-image" />
          <div v-else class="modal-preview-placeholder">プレビュー</div>
        </div>
      </div>
      
      <div class="modal-controls-section">
        <div class="control-section">
          <h4 class="section-title">せん断</h4>
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
          <p class="control-hint">画像を斜めにずらします</p>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
