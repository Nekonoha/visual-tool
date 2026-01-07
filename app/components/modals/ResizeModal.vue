<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import Slider from '~/components/ui/Slider.vue';

const props = defineProps<{
  visible: boolean;
  currentWidth: number;
  currentHeight: number;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'preview', width: number, height: number): void;
  (e: 'apply', width: number, height: number): void;
  (e: 'cancel'): void;
}>();

const width = ref(props.currentWidth);
const height = ref(props.currentHeight);
const scalePercent = ref(100);
const lockAspect = ref(true);
const aspectRatio = computed(() => props.currentWidth / props.currentHeight);

watch(() => props.visible, (visible) => {
  if (visible) {
    width.value = props.currentWidth;
    height.value = props.currentHeight;
    scalePercent.value = 100;
  }
});

watch(() => props.currentWidth, (w) => {
  if (props.visible && scalePercent.value === 100) {
    width.value = w;
  }
});

watch(() => props.currentHeight, (h) => {
  if (props.visible && scalePercent.value === 100) {
    height.value = h;
  }
});

const handleWidthChange = (val: number) => {
  width.value = val;
  if (lockAspect.value) {
    height.value = Math.round(val / aspectRatio.value);
  }
  scalePercent.value = Math.round((val / props.currentWidth) * 100);
  emitPreview();
};

const handleHeightChange = (val: number) => {
  height.value = val;
  if (lockAspect.value) {
    width.value = Math.round(val * aspectRatio.value);
  }
  scalePercent.value = Math.round((height.value / props.currentHeight) * 100);
  emitPreview();
};

const handleScaleChange = (val: number) => {
  scalePercent.value = val;
  width.value = Math.max(1, Math.round(props.currentWidth * val / 100));
  height.value = Math.max(1, Math.round(props.currentHeight * val / 100));
  emitPreview();
};

const emitPreview = () => {
  emit('preview', width.value, height.value);
};

const handleApply = () => {
  emit('apply', width.value, height.value);
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  width.value = props.currentWidth;
  height.value = props.currentHeight;
  scalePercent.value = 100;
  emitPreview();
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="リサイズ"
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
          <h4 class="section-title">サイズ</h4>
          <div class="control-group">
            <label class="control-label">幅</label>
            <div class="input-with-unit">
              <input
                type="number"
                :value="width"
                min="1"
                max="10000"
                @input="handleWidthChange(Number(($event.target as HTMLInputElement).value))"
                class="number-input"
              />
              <span class="unit">px</span>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label">高さ</label>
            <div class="input-with-unit">
              <input
                type="number"
                :value="height"
                min="1"
                max="10000"
                @input="handleHeightChange(Number(($event.target as HTMLInputElement).value))"
                class="number-input"
              />
              <span class="unit">px</span>
            </div>
          </div>
          <div class="control-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="lockAspect" />
              縦横比を維持
            </label>
          </div>
        </div>
        
        <div class="control-section">
          <h4 class="section-title">スケール</h4>
          <div class="control-group">
            <label class="control-label">拡大縮小: {{ scalePercent }}%</label>
            <Slider
              :model-value="scalePercent"
              :min="1"
              :max="400"
              :step="1"
              @update:model-value="handleScaleChange"
            />
          </div>
          <div class="info-text">
            元のサイズ: {{ currentWidth }} × {{ currentHeight }} px<br />
            新しいサイズ: {{ width }} × {{ height }} px
          </div>
        </div>
      </div>
    </div>
  </OperationModal>
</template>
