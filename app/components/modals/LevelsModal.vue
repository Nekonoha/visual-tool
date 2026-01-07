<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

interface LevelsParams {
  inputBlack: number;
  inputWhite: number;
  outputBlack: number;
  outputWhite: number;
  gamma: number;
}

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', params: LevelsParams): void;
  (e: 'apply', params: LevelsParams): void;
  (e: 'cancel'): void;
}>();

const inputBlack = ref(0);
const inputWhite = ref(255);
const outputBlack = ref(0);
const outputWhite = ref(255);
const gamma = ref(1);

const getParams = (): LevelsParams => ({
  inputBlack: inputBlack.value,
  inputWhite: inputWhite.value,
  outputBlack: outputBlack.value,
  outputWhite: outputWhite.value,
  gamma: gamma.value,
});

watch(() => props.visible, (visible) => {
  if (visible) {
    inputBlack.value = 0;
    inputWhite.value = 255;
    outputBlack.value = 0;
    outputWhite.value = 255;
    gamma.value = 1;
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
  inputBlack.value = 0;
  inputWhite.value = 255;
  outputBlack.value = 0;
  outputWhite.value = 255;
  gamma.value = 1;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="レベル補正"
    width="620px"
    min-width="580px"
    min-height="420px"
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
          <h4 class="section-title">入力レベル</h4>
          <div class="control-group">
            <label class="control-label">黒点: {{ inputBlack }}</label>
            <Slider
              :model-value="inputBlack"
              :min="0"
              :max="254"
              :step="1"
              @update:model-value="(v) => { inputBlack = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">白点: {{ inputWhite }}</label>
            <Slider
              :model-value="inputWhite"
              :min="1"
              :max="255"
              :step="1"
              @update:model-value="(v) => { inputWhite = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">ガンマ: {{ gamma.toFixed(2) }}</label>
            <Slider
              :model-value="gamma"
              :min="0.1"
              :max="3"
              :step="0.05"
              @update:model-value="(v) => { gamma = v; emitPreview(); }"
            />
          </div>
        </div>
        
        <div class="control-section">
          <h4 class="section-title">出力レベル</h4>
          <div class="control-group">
            <label class="control-label">黒: {{ outputBlack }}</label>
            <Slider
              :model-value="outputBlack"
              :min="0"
              :max="254"
              :step="1"
              @update:model-value="(v) => { outputBlack = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">白: {{ outputWhite }}</label>
            <Slider
              :model-value="outputWhite"
              :min="1"
              :max="255"
              :step="1"
              @update:model-value="(v) => { outputWhite = v; emitPreview(); }"
            />
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
