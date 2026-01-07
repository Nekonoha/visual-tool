<script setup lang="ts">
import OperationModal from '~/components/modals/OperationModal.vue';
import InteractiveCrop from '~/components/editor/InteractiveCrop.vue';

const props = defineProps<{
  visible: boolean;
  imageWidth: number;
  imageHeight: number;
  previewSrc: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'apply', crop: { x: number; y: number; width: number; height: number }): void;
  (e: 'cancel'): void;
}>();

const cropX = ref(0);
const cropY = ref(0);
const cropWidth = ref(props.imageWidth);
const cropHeight = ref(props.imageHeight);
const cropAspect = ref<'free' | '1:1' | '4:3' | '16:9'>('free');
const cropSizePercent = ref(100);

watch(() => props.visible, (visible) => {
  if (visible) {
    cropX.value = 0;
    cropY.value = 0;
    cropWidth.value = props.imageWidth;
    cropHeight.value = props.imageHeight;
    cropAspect.value = 'free';
    cropSizePercent.value = 100;
  }
});

watch([() => props.imageWidth, () => props.imageHeight], ([w, h]) => {
  if (props.visible) {
    cropWidth.value = w;
    cropHeight.value = h;
  }
});

const handleCropChange = (crop: { x: number; y: number; width: number; height: number }) => {
  cropX.value = crop.x;
  cropY.value = crop.y;
  cropWidth.value = crop.width;
  cropHeight.value = crop.height;
};

const applyCenteredCrop = (ratio: number | null, sizePercent: number) => {
  const baseW = props.imageWidth;
  const baseH = props.imageHeight;
  let w = baseW;
  let h = baseH;
  if (ratio) {
    if (baseW / baseH > ratio) {
      h = baseH;
      w = Math.round(h * ratio);
    } else {
      w = baseW;
      h = Math.round(w / ratio);
    }
  }
  const factor = Math.max(1, Math.min(100, sizePercent)) / 100;
  w = Math.max(1, Math.round(w * factor));
  h = Math.max(1, Math.round(h * factor));
  const x = Math.max(0, Math.round((baseW - w) / 2));
  const y = Math.max(0, Math.round((baseH - h) / 2));
  cropX.value = x;
  cropY.value = y;
  cropWidth.value = w;
  cropHeight.value = h;
};

const handleAspectChange = (aspect: 'free' | '1:1' | '4:3' | '16:9') => {
  cropAspect.value = aspect;
  const ratioMap = { free: null, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };
  applyCenteredCrop(ratioMap[aspect], cropSizePercent.value);
};

const handleApply = () => {
  emit('apply', {
    x: cropX.value,
    y: cropY.value,
    width: cropWidth.value,
    height: cropHeight.value,
  });
  emit('update:visible', false);
};

const handleCancel = () => {
  emit('cancel');
};

const handleReset = () => {
  cropX.value = 0;
  cropY.value = 0;
  cropWidth.value = props.imageWidth;
  cropHeight.value = props.imageHeight;
  cropAspect.value = 'free';
  cropSizePercent.value = 100;
};
</script>

<template>
  <OperationModal
    :visible="visible"
    title="クロップ"
    width="850px"
    min-width="650px"
    min-height="450px"
    resizable
    show-reset
    @update:visible="emit('update:visible', $event)"
    @apply="handleApply"
    @cancel="handleCancel"
    @reset="handleReset"
  >
    <div class="crop-modal-content">
      <div class="crop-preview-section">
        <InteractiveCrop
          v-if="previewSrc"
          :src="previewSrc"
          v-model:crop-x="cropX"
          v-model:crop-y="cropY"
          v-model:crop-width="cropWidth"
          v-model:crop-height="cropHeight"
          :image-width="imageWidth"
          :image-height="imageHeight"
          @crop-change="handleCropChange"
        />
        <div v-else class="modal-preview-placeholder">プレビュー</div>
      </div>
      
      <div class="modal-controls-section">
        <div class="control-group">
          <label class="control-label">アスペクト比</label>
          <div class="aspect-buttons">
            <button
              v-for="aspect in ['free', '1:1', '4:3', '16:9'] as const"
              :key="aspect"
              class="aspect-btn"
              :class="{ active: cropAspect === aspect }"
              @click="handleAspectChange(aspect)"
            >
              {{ aspect === 'free' ? '自由' : aspect }}
            </button>
          </div>
        </div>
        
        <div class="control-group">
          <label class="control-label">位置 X</label>
          <input
            type="number"
            v-model.number="cropX"
            min="0"
            :max="imageWidth - cropWidth"
            class="number-input"
          />
        </div>
        
        <div class="control-group">
          <label class="control-label">位置 Y</label>
          <input
            type="number"
            v-model.number="cropY"
            min="0"
            :max="imageHeight - cropHeight"
            class="number-input"
          />
        </div>
        
        <div class="control-group">
          <label class="control-label">幅</label>
          <input
            type="number"
            v-model.number="cropWidth"
            min="1"
            :max="imageWidth - cropX"
            class="number-input"
          />
        </div>
        
        <div class="control-group">
          <label class="control-label">高さ</label>
          <input
            type="number"
            v-model.number="cropHeight"
            min="1"
            :max="imageHeight - cropY"
            class="number-input"
          />
        </div>
        
        <div class="info-text">
          元のサイズ: {{ imageWidth }} × {{ imageHeight }} px<br />
          クロップ後: {{ cropWidth }} × {{ cropHeight }} px
        </div>
      </div>
    </div>
  </OperationModal>
</template>
