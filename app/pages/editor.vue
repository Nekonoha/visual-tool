<template>
  <div class="page-editor">
    <div class="page-header">
      <h1 class="page-title">画像編集</h1>
      <p class="page-description">リサイズ、クロップ、回転、フィルターなど多彩な編集機能</p>
    </div>

    <div class="editor">
      <!-- メニューバー -->
      <EditorMenuBar
        :can-undo="imageStore.canUndo"
        :can-redo="imageStore.canRedo"
        :has-image="imageStore.hasImage"
        @undo="handleUndo"
        @redo="handleRedo"
        @reset="handleResetOps"
        @download="handleDownload"
        @open-resize="showResizeModal = true"
        @open-crop="showCropModal = true"
        @open-transform="showTransformModal = true"
        @open-brightness-contrast="showBrightnessContrastModal = true"
        @open-hue-saturation="showHueSaturationModal = true"
        @open-tone-curve="showToneCurveModal = true"
        @open-grayscale="handleGrayscale"
        @open-sepia="handleSepia"
        @open-watermark="showWatermarkModal = true"
      />

      <div class="editor__container">
        <!-- メインプレビューエリア -->
        <div class="editor__preview-section">
          <div class="editor__preview-header">
            <h2 class="editor__preview-title">プレビュー</h2>
            <div v-if="imageStore.hasImage" class="editor__preview-info">
              {{ imageStore.imageInfo?.width }} × {{ imageStore.imageInfo?.height }} px
            </div>
          </div>

          <div v-if="imageStore.hasImage" class="editor__preview-content">
            <ImagePreview
              :src="imageStore.processedDataURL"
              :image-size="imageStore.imageSize"
              title=""
            />
          </div>
          <div v-else class="editor__upload-hint">
            <FileInput @file-selected="handleFileSelected" />
            <p class="hint">画像をアップロードして編集を開始してください</p>
          </div>
        </div>
      </div>
    </div>

    <!-- リサイズモーダル -->
    <ResizeModal
      v-model:visible="showResizeModal"
      :current-width="imageStore.imageInfo?.width || 0"
      :current-height="imageStore.imageInfo?.height || 0"
      :preview-src="modalPreviewSrc"
      @preview="handleResizePreview"
      @apply="handleResizeApply"
      @cancel="handleModalCancel"
    />

    <!-- クロップモーダル -->
    <CropModal
      v-model:visible="showCropModal"
      :image-width="imageStore.imageInfo?.width || 0"
      :image-height="imageStore.imageInfo?.height || 0"
      :preview-src="imageStore.processedDataURL"
      @apply="handleCropApply"
      @cancel="handleModalCancel"
    />

    <!-- 回転・反転モーダル -->
    <TransformModal
      v-model:visible="showTransformModal"
      :preview-src="modalPreviewSrc"
      @preview="handleTransformPreview"
      @apply="handleTransformApply"
      @cancel="handleModalCancel"
    />

    <!-- 明るさ・コントラストモーダル -->
    <BrightnessContrastModal
      v-model:visible="showBrightnessContrastModal"
      :preview-src="modalPreviewSrc"
      @preview="handleBrightnessContrastPreview"
      @apply="handleBrightnessContrastApply"
      @cancel="handleModalCancel"
    />

    <!-- 色相・彩度モーダル -->
    <HueSaturationModal
      v-model:visible="showHueSaturationModal"
      :preview-src="modalPreviewSrc"
      @preview="handleHueSaturationPreview"
      @apply="handleHueSaturationApply"
      @cancel="handleModalCancel"
    />

    <!-- トーンカーブモーダル -->
    <ToneCurveModal
      v-model:visible="showToneCurveModal"
      v-model="toneCurvePoints"
      :preview-src="modalPreviewSrc"
      @preview="handleToneCurvePreview"
      @apply="handleToneCurveApply"
      @cancel="handleToneCurveCancel"
    />

    <!-- ウォーターマークモーダル -->
    <WatermarkModal
      v-model:visible="showWatermarkModal"
      :preview-src="modalPreviewSrc"
      @preview="handleWatermarkPreview"
      @apply="handleWatermarkApply"
      @cancel="handleModalCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import FileInput from '~/components/FileInput.vue';
import ImagePreview from '~/components/ImagePreview.vue';
import EditorMenuBar from '~/components/EditorMenuBar.vue';
import ResizeModal from '~/components/ResizeModal.vue';
import CropModal from '~/components/CropModal.vue';
import TransformModal from '~/components/TransformModal.vue';
import BrightnessContrastModal from '~/components/BrightnessContrastModal.vue';
import HueSaturationModal from '~/components/HueSaturationModal.vue';
import ToneCurveModal from '~/components/ToneCurveModal.vue';
import WatermarkModal from '~/components/WatermarkModal.vue';
import { useImageStore } from '~/stores/image';

interface ToneCurvePoint {
  x: number;
  y: number;
}

definePageMeta({
  layout: 'default',
});

const isServer = typeof window === 'undefined';
const imageStore = isServer
  ? ({ hasImage: false, imageInfo: null } as unknown as ReturnType<typeof useImageStore>)
  : useImageStore();

// モーダル表示状態
const showResizeModal = ref(false);
const showCropModal = ref(false);
const showTransformModal = ref(false);
const showBrightnessContrastModal = ref(false);
const showHueSaturationModal = ref(false);
const showToneCurveModal = ref(false);
const showWatermarkModal = ref(false);

// モーダルプレビュー用
const modalPreviewSrc = ref<string | null>(null);

// モーダル開始時のDataURLを保存（キャンセル時に復元用）
const savedDataURLBeforeModal = ref<string | null>(null);

// トーンカーブ用
const toneCurvePoints = ref<ToneCurvePoint[]>([
  { x: 0, y: 0 },
  { x: 0.25, y: 0.25 },
  { x: 0.5, y: 0.5 },
  { x: 0.75, y: 0.75 },
  { x: 1, y: 1 },
]);

// モーダルが開いたときにプレビューソースを初期化＆元の状態を保存
watch([showResizeModal, showTransformModal, showBrightnessContrastModal, showHueSaturationModal, showWatermarkModal, showToneCurveModal], (newVals) => {
  const anyOpen = newVals.some(v => v);
  if (anyOpen) {
    savedDataURLBeforeModal.value = imageStore.processedDataURL;
    modalPreviewSrc.value = imageStore.processedDataURL;
  }
});

// ファイル選択
const handleFileSelected = async (file: File) => {
  await imageStore.loadImage(file);
};

// モーダルキャンセル時の共通処理
const handleModalCancel = async () => {
  // 履歴から再レンダリングして元の状態に戻す
  await imageStore.renderFromHistory();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

// リサイズハンドラ
const handleResizePreview = async (width: number, height: number) => {
  await imageStore.applyFiltersRealtime({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hue: 0,
    gamma: 1,
    toneCurvePoints: undefined,
    crop: null,
    resizeWidth: width,
    resizeHeight: height,
    watermark: { type: 'none', text: '', fontSize: 32, color: '#ffffff', opacity: 0.5, position: 'bottom-right', offsetX: 24, offsetY: 24, imageDataURL: '', scale: 0.3, mode: 'single', rotation: 0, spacingX: 100, spacingY: 100, anchorX: null, anchorY: null },
  });
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleResizeApply = async (width: number, height: number) => {
  await imageStore.applyOperation({
    type: 'resize',
    params: { width, height },
  });
  showResizeModal.value = false;
};

// クロップハンドラ
const handleCropApply = async (crop: { x: number; y: number; width: number; height: number }) => {
  await imageStore.applyOperation({
    type: 'crop',
    params: { crop },
  });
  showCropModal.value = false;
};

// 変形ハンドラ
const handleTransformPreview = async (rotation: number, flipH: boolean, flipV: boolean) => {
  imageStore.ops.rotation = rotation;
  imageStore.ops.flipH = flipH;
  imageStore.ops.flipV = flipV;
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleTransformApply = async (rotation: number, flipH: boolean, flipV: boolean) => {
  await imageStore.applyOperation({
    type: 'transform',
    params: { rotation, flipH, flipV },
  });
  showTransformModal.value = false;
};

// 明るさ・コントラストハンドラ
const handleBrightnessContrastPreview = async (brightness: number, contrast: number) => {
  await imageStore.applyFiltersRealtime({
    brightness,
    contrast,
    saturation: 100,
    blur: 0,
    hue: 0,
    gamma: 1,
    toneCurvePoints: undefined,
    crop: null,
    resizeWidth: null,
    resizeHeight: null,
    watermark: { type: 'none', text: '', fontSize: 32, color: '#ffffff', opacity: 0.5, position: 'bottom-right', offsetX: 24, offsetY: 24, imageDataURL: '', scale: 0.3, mode: 'single', rotation: 0, spacingX: 100, spacingY: 100, anchorX: null, anchorY: null },
  });
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleBrightnessContrastApply = async (brightness: number, contrast: number) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: {
      brightness,
      contrast,
      saturation: 100,
      blur: 0,
      hue: 0,
      gamma: 1,
      toneCurvePoints: undefined,
    },
  });
  showBrightnessContrastModal.value = false;
};

// 色相・彩度ハンドラ
const handleHueSaturationPreview = async (hue: number, saturation: number, gamma: number) => {
  await imageStore.applyFiltersRealtime({
    brightness: 100,
    contrast: 100,
    saturation,
    blur: 0,
    hue,
    gamma: gamma / 100,
    toneCurvePoints: undefined,
    crop: null,
    resizeWidth: null,
    resizeHeight: null,
    watermark: { type: 'none', text: '', fontSize: 32, color: '#ffffff', opacity: 0.5, position: 'bottom-right', offsetX: 24, offsetY: 24, imageDataURL: '', scale: 0.3, mode: 'single', rotation: 0, spacingX: 100, spacingY: 100, anchorX: null, anchorY: null },
  });
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleHueSaturationApply = async (hue: number, saturation: number, gamma: number) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: {
      brightness: 100,
      contrast: 100,
      saturation,
      blur: 0,
      hue,
      gamma: gamma / 100,
      toneCurvePoints: undefined,
    },
  });
  showHueSaturationModal.value = false;
};

// トーンカーブハンドラ
const handleToneCurvePreview = async (points: ToneCurvePoint[]) => {
  await imageStore.applyFiltersRealtime({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hue: 0,
    gamma: 1,
    toneCurvePoints: points,
    crop: null,
    resizeWidth: null,
    resizeHeight: null,
    watermark: { type: 'none', text: '', fontSize: 32, color: '#ffffff', opacity: 0.5, position: 'bottom-right', offsetX: 24, offsetY: 24, imageDataURL: '', scale: 0.3, mode: 'single', rotation: 0, spacingX: 100, spacingY: 100, anchorX: null, anchorY: null },
  });
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleToneCurveApply = async (points: ToneCurvePoint[]) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      hue: 0,
      gamma: 1,
      toneCurvePoints: points,
    },
  });
  showToneCurveModal.value = false;
  toneCurvePoints.value = [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.75 },
    { x: 1, y: 1 },
  ];
};

const handleToneCurveCancel = async () => {
  showToneCurveModal.value = false;
  // ポイントをデフォルトにリセット
  toneCurvePoints.value = [
    { x: 0, y: 0 },
    { x: 0.25, y: 0.25 },
    { x: 0.5, y: 0.5 },
    { x: 0.75, y: 0.75 },
    { x: 1, y: 1 },
  ];
  // 履歴から再レンダリングして元の状態に戻す
  await imageStore.renderFromHistory();
};

// ウォーターマークハンドラ
interface WatermarkParams {
  type: 'none' | 'text' | 'image';
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  offsetX: number;
  offsetY: number;
  imageDataURL: string;
  scale: number;
  mode: 'single' | 'pattern';
  rotation: number;
  spacingX: number;
  spacingY: number;
}

const handleWatermarkPreview = async (params: WatermarkParams) => {
  await imageStore.applyFiltersRealtime({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hue: 0,
    gamma: 1,
    toneCurvePoints: undefined,
    crop: null,
    resizeWidth: null,
    resizeHeight: null,
    watermark: {
      ...params,
      anchorX: null,
      anchorY: null,
    },
  });
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleWatermarkApply = async (params: WatermarkParams) => {
  await imageStore.applyOperation({
    type: 'watermark',
    params: {
      watermark: {
        ...params,
        anchorX: null,
        anchorY: null,
      },
    },
  });
  showWatermarkModal.value = false;
};

// グレースケール・セピア
const handleGrayscale = async () => {
  await imageStore.applyOperation({
    type: 'grayscale',
    params: {},
  });
};

const handleSepia = async () => {
  await imageStore.applyOperation({
    type: 'sepia',
    params: {},
  });
};

// Undo/Redo
const handleUndo = async () => {
  await imageStore.undo();
};

const handleRedo = async () => {
  await imageStore.redo();
};

// キーボードショートカット
const handleKeydown = (e: KeyboardEvent) => {
  // モーダルが開いている場合はスキップ
  const anyModalOpen = showResizeModal.value || showTransformModal.value || 
    showBrightnessContrastModal.value || showHueSaturationModal.value || 
    showWatermarkModal.value || showToneCurveModal.value || showCropModal.value;
  
  if (anyModalOpen) return;
  
  // Ctrl+Z: Undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    if (imageStore.canUndo) {
      handleUndo();
    }
  }
  
  // Ctrl+Y or Ctrl+Shift+Z: Redo
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' || (e.key === 'z' && e.shiftKey)))) {
    e.preventDefault();
    if (imageStore.canRedo) {
      handleRedo();
    }
  }
  
  // Ctrl+S: 名前を付けて保存
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (imageStore.hasImage) {
      handleSaveAs();
    }
  }
};

// リセット
const handleResetOps = async () => {
  await imageStore.resetOperations();
};

// ダウンロード（デフォルト名）
const handleDownload = () => {
  imageStore.download('edited-image.jpg');
};

// 名前を付けて保存
const handleSaveAs = async () => {
  if (!imageStore.hasImage || !imageStore.processedDataURL) return;
  
  // File System Access API が利用可能かチェック
  if ('showSaveFilePicker' in window) {
    try {
      const blob = await fetch(imageStore.processedDataURL).then(r => r.blob());
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'edited-image.jpg',
        types: [
          {
            description: 'JPEG Image',
            accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
          },
          {
            description: 'PNG Image',
            accept: { 'image/png': ['.png'] },
          },
          {
            description: 'WebP Image',
            accept: { 'image/webp': ['.webp'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (err: any) {
      // ユーザーがキャンセルした場合は何もしない
      if (err.name !== 'AbortError') {
        console.error('Save failed:', err);
      }
    }
  } else {
    // フォールバック: プロンプトでファイル名を入力
    const filename = prompt('ファイル名を入力してください', 'edited-image.jpg');
    if (filename) {
      imageStore.download(filename);
    }
  }
};

onMounted(() => {
  imageStore.initProcessor();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.page-editor {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-16);
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-8) 0;
}

.page-description {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.editor__container {
  display: flex;
  gap: var(--space-24);
}

.editor__preview-section {
  flex: 1;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

.editor__preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-16);
  flex-shrink: 0;
}

.editor__preview-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.editor__preview-info {
  font-size: 14px;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
}

.editor__preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor__preview-content :deep(.image-preview) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor__preview-content :deep(.image-preview__container) {
  flex: 1;
}

.editor__upload-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-16);
  height: 100%;
  flex: 1;
}

.hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
  .editor__container {
    flex-direction: column;
  }
  
  .editor__preview-section {
    min-height: 400px;
  }
}
</style>
