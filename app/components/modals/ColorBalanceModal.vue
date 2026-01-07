<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

interface ColorBalanceParams {
  shadows: { cyan: number; magenta: number; yellow: number };
  midtones: { cyan: number; magenta: number; yellow: number };
  highlights: { cyan: number; magenta: number; yellow: number };
}

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', params: ColorBalanceParams): void;
  (e: 'apply', params: ColorBalanceParams): void;
  (e: 'cancel'): void;
}>();

const shadows = ref({ cyan: 0, magenta: 0, yellow: 0 });
const midtones = ref({ cyan: 0, magenta: 0, yellow: 0 });
const highlights = ref({ cyan: 0, magenta: 0, yellow: 0 });

const getParams = (): ColorBalanceParams => ({
  shadows: { ...shadows.value },
  midtones: { ...midtones.value },
  highlights: { ...highlights.value },
});

watch(() => props.visible, (visible) => {
  if (visible) {
    shadows.value = { cyan: 0, magenta: 0, yellow: 0 };
    midtones.value = { cyan: 0, magenta: 0, yellow: 0 };
    highlights.value = { cyan: 0, magenta: 0, yellow: 0 };
  }
});

const handleApply = () => {
  emit('apply', getParams());
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  shadows.value = { cyan: 0, magenta: 0, yellow: 0 };
  midtones.value = { cyan: 0, magenta: 0, yellow: 0 };
  highlights.value = { cyan: 0, magenta: 0, yellow: 0 };
  emit('preview', getParams());
};

const emitPreview = () => {
  emit('preview', getParams());
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="カラーバランス"
    width="620px"
    min-width="580px"
    min-height="450px"
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
          <h4 class="section-title">シャドウ</h4>
          <div class="control-group">
            <label class="control-label">シアン ↔ レッド: {{ shadows.cyan }}</label>
            <Slider
              :model-value="shadows.cyan"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { shadows.cyan = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">マゼンタ ↔ グリーン: {{ shadows.magenta }}</label>
            <Slider
              :model-value="shadows.magenta"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { shadows.magenta = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">イエロー ↔ ブルー: {{ shadows.yellow }}</label>
            <Slider
              :model-value="shadows.yellow"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { shadows.yellow = v; emitPreview(); }"
            />
          </div>
        </div>
        
        <div class="control-section">
          <h4 class="section-title">中間調</h4>
          <div class="control-group">
            <label class="control-label">シアン ↔ レッド: {{ midtones.cyan }}</label>
            <Slider
              :model-value="midtones.cyan"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { midtones.cyan = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">マゼンタ ↔ グリーン: {{ midtones.magenta }}</label>
            <Slider
              :model-value="midtones.magenta"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { midtones.magenta = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">イエロー ↔ ブルー: {{ midtones.yellow }}</label>
            <Slider
              :model-value="midtones.yellow"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { midtones.yellow = v; emitPreview(); }"
            />
          </div>
        </div>
        
        <div class="control-section">
          <h4 class="section-title">ハイライト</h4>
          <div class="control-group">
            <label class="control-label">シアン ↔ レッド: {{ highlights.cyan }}</label>
            <Slider
              :model-value="highlights.cyan"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { highlights.cyan = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">マゼンタ ↔ グリーン: {{ highlights.magenta }}</label>
            <Slider
              :model-value="highlights.magenta"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { highlights.magenta = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="control-label">イエロー ↔ ブルー: {{ highlights.yellow }}</label>
            <Slider
              :model-value="highlights.yellow"
              :min="-100"
              :max="100"
              :step="1"
              @update:model-value="(v) => { highlights.yellow = v; emitPreview(); }"
            />
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
