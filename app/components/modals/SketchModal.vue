<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

interface SketchParams {
  intensity: number;
  invert: boolean;
}

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', params: SketchParams): void;
  (e: 'apply', params: SketchParams): void;
  (e: 'cancel'): void;
}>();

const intensity = ref(50);
const invert = ref(true);

const getParams = (): SketchParams => ({
  intensity: intensity.value,
  invert: invert.value,
});

watch(() => props.visible, (visible) => {
  if (visible) {
    intensity.value = 50;
    invert.value = true;
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
  intensity.value = 50;
  invert.value = true;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="えんぴつ調"
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
            <label class="control-label">濃さ: {{ intensity }}%</label>
            <Slider
              :model-value="intensity"
              :min="10"
              :max="100"
              :step="5"
              @update:model-value="(v) => { intensity = v; emitPreview(); }"
            />
          </div>
          <div class="control-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="invert"
                @change="emitPreview"
              />
              <span>白背景（チェックを外すと黒背景）</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
