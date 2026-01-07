<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', hue: number, saturation: number, gamma: number): void;
  (e: 'apply', hue: number, saturation: number, gamma: number): void;
  (e: 'cancel'): void;
}>();

const hue = ref(0);
const saturation = ref(100);
const gamma = ref(100);

watch(() => props.visible, (visible) => {
  if (visible) {
    hue.value = 0;
    saturation.value = 100;
    gamma.value = 100;
  }
});

const handleHueChange = (val: number) => {
  hue.value = val;
  emitPreview();
};

const handleSaturationChange = (val: number) => {
  saturation.value = val;
  emitPreview();
};

const handleGammaChange = (val: number) => {
  gamma.value = val;
  emitPreview();
};

const emitPreview = () => {
  emit('preview', hue.value, saturation.value, gamma.value);
};

const handleApply = () => {
  emit('apply', hue.value, saturation.value, gamma.value);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  hue.value = 0;
  saturation.value = 100;
  gamma.value = 100;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="色相・彩度・明度"
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
            <label class="control-label">色相: {{ hue }}°</label>
            <Slider
              :model-value="hue"
              :min="-180"
              :max="180"
              :step="1"
              @update:model-value="handleHueChange"
            />
          </div>
          <div class="control-group">
            <label class="control-label">彩度: {{ saturation }}</label>
            <Slider
              :model-value="saturation"
              :min="0"
              :max="200"
              :step="1"
              @update:model-value="handleSaturationChange"
            />
          </div>
          <div class="control-group">
            <label class="control-label">明度 / ガンマ: {{ gamma }}</label>
            <Slider
              :model-value="gamma"
              :min="10"
              :max="300"
              :step="1"
              @update:model-value="handleGammaChange"
            />
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
