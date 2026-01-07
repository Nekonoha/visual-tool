<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

const props = defineProps<{
  visible: boolean;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', levels: number): void;
  (e: 'apply', levels: number): void;
  (e: 'cancel'): void;
}>();

const levels = ref(8);

watch(() => props.visible, (visible) => {
  if (visible) {
    levels.value = 8;
  }
});

const handleLevelsChange = (val: number) => {
  levels.value = val;
  emit('preview', levels.value);
};

const handleApply = () => {
  emit('apply', levels.value);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  levels.value = 8;
  emit('preview', levels.value);
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="諧調化（ポスタライズ）"
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
            <label class="control-label">階調数: {{ levels }}</label>
            <Slider
              :model-value="levels"
              :min="2"
              :max="32"
              :step="1"
              @update:model-value="handleLevelsChange"
            />
          </div>
          <p class="control-hint">値を小さくするとポスター調になります</p>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
