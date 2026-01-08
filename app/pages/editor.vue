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
        @open-brightness-contrast="showBrightnessContrastModal = true"
        @open-hue-saturation="showHueSaturationModal = true"
        @open-tone-curve="showToneCurveModal = true"
        @open-grayscale="handleGrayscale"
        @open-sepia="handleSepia"
        @open-watermark="showWatermarkModal = true"
        @open-posterize="showPosterizeModal = true"
        @open-levels="showLevelsModal = true"
        @open-color-balance="showColorBalanceModal = true"
        @open-threshold="showThresholdModal = true"
        @open-sharpen="showSharpenModal = true"
        @open-sketch="showSketchModal = true"
        @open-chromatic-aberration="showChromaticAberrationModal = true"
        @open-free-transform="openTransformWithMode('free')"
        @open-scale-transform="openTransformWithMode('scale')"
        @open-perspective-transform="openTransformWithMode('perspective')"
        @open-skew-transform="openTransformWithMode('skew')"
        @open-rotate-transform="openTransformWithMode('rotate')"
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

    <!-- 諧調化モーダル -->
    <PosterizeModal
      v-model:visible="showPosterizeModal"
      :preview-src="modalPreviewSrc"
      @preview="handlePosterizePreview"
      @apply="handlePosterizeApply"
      @cancel="handleModalCancel"
    />

    <!-- レベル補正モーダル -->
    <LevelsModal
      v-model:visible="showLevelsModal"
      :preview-src="modalPreviewSrc"
      @preview="handleLevelsPreview"
      @apply="handleLevelsApply"
      @cancel="handleModalCancel"
    />

    <!-- カラーバランスモーダル -->
    <ColorBalanceModal
      v-model:visible="showColorBalanceModal"
      :preview-src="modalPreviewSrc"
      @preview="handleColorBalancePreview"
      @apply="handleColorBalanceApply"
      @cancel="handleModalCancel"
    />

    <!-- 2値化モーダル -->
    <ThresholdModal
      v-model:visible="showThresholdModal"
      :preview-src="modalPreviewSrc"
      @preview="handleThresholdPreview"
      @apply="handleThresholdApply"
      @cancel="handleModalCancel"
    />

    <!-- シャープモーダル -->
    <SharpenModal
      v-model:visible="showSharpenModal"
      :preview-src="modalPreviewSrc"
      @preview="handleSharpenPreview"
      @apply="handleSharpenApply"
      @cancel="handleModalCancel"
    />

    <!-- えんぴつ調モーダル -->
    <SketchModal
      v-model:visible="showSketchModal"
      :preview-src="modalPreviewSrc"
      @preview="handleSketchPreview"
      @apply="handleSketchApply"
      @cancel="handleModalCancel"
    />

    <!-- 色収差モーダル -->
    <ChromaticAberrationModal
      v-model:visible="showChromaticAberrationModal"
      :preview-src="modalPreviewSrc"
      @preview="handleChromaticAberrationPreview"
      @apply="handleChromaticAberrationApply"
      @cancel="handleModalCancel"
    />

    <!-- 自由変形モーダル -->
    <FreeTransformModal
      v-model:visible="showFreeTransformModal"
      :original-src="imageStore.originalDataURL"
      :image-width="imageStore.imageInfo?.width || 0"
      :image-height="imageStore.imageInfo?.height || 0"
      :mode="currentTransformMode"
      @preview="handleFreeTransformPreview"
      @apply="handleFreeTransformApply"
      @cancel="handleModalCancel"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import FileInput from '~/components/ui/FileInput.vue';
import ImagePreview from '~/components/editor/ImagePreview.vue';
import EditorMenuBar from '~/components/editor/EditorMenuBar.vue';
import ResizeModal from '~/components/modals/ResizeModal.vue';
import CropModal from '~/components/modals/CropModal.vue';
import BrightnessContrastModal from '~/components/modals/BrightnessContrastModal.vue';
import HueSaturationModal from '~/components/modals/HueSaturationModal.vue';
import ToneCurveModal from '~/components/modals/ToneCurveModal.vue';
import WatermarkModal from '~/components/modals/WatermarkModal.vue';
import PosterizeModal from '~/components/modals/PosterizeModal.vue';
import LevelsModal from '~/components/modals/LevelsModal.vue';
import ColorBalanceModal from '~/components/modals/ColorBalanceModal.vue';
import ThresholdModal from '~/components/modals/ThresholdModal.vue';
import SharpenModal from '~/components/modals/SharpenModal.vue';
import SketchModal from '~/components/modals/SketchModal.vue';
import ChromaticAberrationModal from '~/components/modals/ChromaticAberrationModal.vue';
import FreeTransformModal from '~/components/modals/FreeTransformModal.vue';
import { useImageStore } from '~/stores/image';
import { useEditorModals } from '~/composables/useEditorModals';
import { useKeyboardShortcuts } from '~/composables/useKeyboardShortcuts';
import type { 
  ToneCurvePoint, 
  Corners, 
  TransformMode, 
  InterpolationMethod,
  LevelsParams,
  ColorBalanceParams,
  SharpenParams,
  SketchParams,
  ChromaticAberrationParams,
  WatermarkParams,
} from '~/types';

definePageMeta({
  layout: 'default',
});

const isServer = typeof window === 'undefined';
const imageStore = isServer
  ? ({ hasImage: false, imageInfo: null } as unknown as ReturnType<typeof useImageStore>)
  : useImageStore();

// モーダル管理
const {
  showResizeModal,
  showCropModal,
  showBrightnessContrastModal,
  showHueSaturationModal,
  showToneCurveModal,
  showWatermarkModal,
  showPosterizeModal,
  showLevelsModal,
  showColorBalanceModal,
  showThresholdModal,
  showSharpenModal,
  showSketchModal,
  showChromaticAberrationModal,
  showFreeTransformModal,
  currentTransformMode,
  modalPreviewSrc,
  toneCurvePoints,
  isAnyModalOpen,
  setupModalWatchers,
} = useEditorModals();

// 変形モーダルを指定モードで開く
const openTransformWithMode = (mode: TransformMode) => {
  currentTransformMode.value = mode;
  showFreeTransformModal.value = true;
};

// モーダル状態変更時のwatch設定
setupModalWatchers(() => imageStore.processedDataURL);

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

// === 高度なフィルターハンドラー ===

// 諧調化
const handlePosterizePreview = async (levels: number) => {
  imageStore.ops.posterize = { levels };
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handlePosterizeApply = async (levels: number) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: { posterize: { levels } },
  });
  imageStore.ops.posterize = null;
  showPosterizeModal.value = false;
};

// レベル補正
const handleLevelsPreview = async (params: LevelsParams) => {
  imageStore.ops.levels = params;
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleLevelsApply = async (params: LevelsParams) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: { levels: params },
  });
  imageStore.ops.levels = null;
  showLevelsModal.value = false;
};

// カラーバランス
const handleColorBalancePreview = async (params: ColorBalanceParams) => {
  imageStore.ops.colorBalance = params;
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleColorBalanceApply = async (params: ColorBalanceParams) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: { colorBalance: params },
  });
  imageStore.ops.colorBalance = null;
  showColorBalanceModal.value = false;
};

// 2値化
const handleThresholdPreview = async (threshold: number) => {
  imageStore.ops.threshold = { threshold };
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleThresholdApply = async (threshold: number) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: { threshold: { threshold } },
  });
  imageStore.ops.threshold = null;
  showThresholdModal.value = false;
};

// シャープ
const handleSharpenPreview = async (params: SharpenParams) => {
  imageStore.ops.sharpen = params;
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleSharpenApply = async (params: SharpenParams) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: { sharpen: params },
  });
  imageStore.ops.sharpen = null;
  showSharpenModal.value = false;
};

// えんぴつ調
const handleSketchPreview = async (params: SketchParams) => {
  imageStore.ops.sketch = params;
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleSketchApply = async (params: SketchParams) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: { sketch: params },
  });
  imageStore.ops.sketch = null;
  showSketchModal.value = false;
};

// 色収差
const handleChromaticAberrationPreview = async (params: ChromaticAberrationParams) => {
  imageStore.ops.chromaticAberration = params;
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleChromaticAberrationApply = async (params: ChromaticAberrationParams) => {
  await imageStore.applyOperation({
    type: 'filters',
    params: { chromaticAberration: params },
  });
  imageStore.ops.chromaticAberration = null;
  showChromaticAberrationModal.value = false;
};

// 自由変形
const handleFreeTransformPreview = async (params: Corners, interpolation?: InterpolationMethod) => {
  imageStore.ops.freeTransform = params;
  imageStore.ops.interpolation = interpolation ?? 'bilinear';
  await imageStore.scheduleRender();
  modalPreviewSrc.value = imageStore.processedDataURL;
};

const handleFreeTransformApply = async (params: Corners, interpolation?: InterpolationMethod) => {
  await imageStore.applyOperation({
    type: 'advancedTransform',
    params: { freeTransform: params, interpolation: interpolation ?? 'bilinear' },
  });
  imageStore.ops.freeTransform = null;
  imageStore.ops.interpolation = 'bilinear';
  showFreeTransformModal.value = false;
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

// キーボードショートカットの設定
useKeyboardShortcuts({
  canUndo: computed(() => imageStore.canUndo),
  canRedo: computed(() => imageStore.canRedo),
  hasImage: computed(() => imageStore.hasImage),
  isModalOpen: isAnyModalOpen,
  onUndo: handleUndo,
  onRedo: handleRedo,
  onSave: handleSaveAs,
});

onMounted(() => {
  imageStore.initProcessor();
});
</script>
