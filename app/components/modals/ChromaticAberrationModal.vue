<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

interface ChromaticAberrationParams {
  offsetX: number;
  offsetY: number;
}

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', params: ChromaticAberrationParams): void;
  (e: 'apply', params: ChromaticAberrationParams): void;
  (e: 'cancel'): void;
}>();

const offsetX = ref(3);
const offsetY = ref(0);

const getParams = (): ChromaticAberrationParams => ({
  offsetX: offsetX.value,
  offsetY: offsetY.value,
});

watch(() => props.visible, (visible) => {
  if (visible) {
    offsetX.value = 3;
    offsetY.value = 0;
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
  offsetX.value = 3;
  offsetY.value = 0;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="色収差"
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
          <h4 class="section-title">設定</h4>
          <div class="control-group">
            <label class="control-label">X方向オフセット: {{ offsetX }}px</label>
            <Slider
              :model-value="offsetX"
              :min="-30"
              :max="30"
              :step="1"
              @update:model-value="(v) => { offsetX = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">Y方向オフセット: {{ offsetY }}px</label>
            <Slider
              :model-value="offsetY"
              :min="-30"
              :max="30"
              :step="1"
              @update:model-value="(v) => { offsetY = v; emitPreview(); }"
            />
          </div>
          <p class="control-hint">RGBチャンネルをずらしてレトロな色収差効果を作成します</p>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
