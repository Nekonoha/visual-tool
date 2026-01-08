/**
 * useEditorModals
 * エディターのモーダル状態を管理するComposable
 */

import { ref, computed, watch } from 'vue';
import type { ToneCurvePoint } from '~/types';

export function useEditorModals() {
  // モーダル表示状態
  const showResizeModal = ref(false);
  const showCropModal = ref(false);
  const showBrightnessContrastModal = ref(false);
  const showHueSaturationModal = ref(false);
  const showToneCurveModal = ref(false);
  const showWatermarkModal = ref(false);
  // Advanced filters
  const showPosterizeModal = ref(false);
  const showLevelsModal = ref(false);
  const showColorBalanceModal = ref(false);
  const showThresholdModal = ref(false);
  const showSharpenModal = ref(false);
  const showSketchModal = ref(false);
  const showChromaticAberrationModal = ref(false);
  // Advanced transforms
  const showFreeTransformModal = ref(false);
  const currentTransformMode = ref<'free' | 'scale' | 'perspective' | 'skew' | 'rotate'>('free');
  
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
  
  // いずれかのモーダルが開いているか
  const isAnyModalOpen = computed(() => 
    showResizeModal.value ||
    showCropModal.value ||
    showBrightnessContrastModal.value ||
    showHueSaturationModal.value ||
    showToneCurveModal.value ||
    showWatermarkModal.value ||
    showPosterizeModal.value ||
    showLevelsModal.value ||
    showColorBalanceModal.value ||
    showThresholdModal.value ||
    showSharpenModal.value ||
    showSketchModal.value ||
    showChromaticAberrationModal.value ||
    showFreeTransformModal.value
  );
  
  // 全モーダルを閉じる
  const closeAllModals = () => {
    showResizeModal.value = false;
    showCropModal.value = false;
    showBrightnessContrastModal.value = false;
    showHueSaturationModal.value = false;
    showToneCurveModal.value = false;
    showWatermarkModal.value = false;
    showPosterizeModal.value = false;
    showLevelsModal.value = false;
    showColorBalanceModal.value = false;
    showThresholdModal.value = false;
    showSharpenModal.value = false;
    showSketchModal.value = false;
    showChromaticAberrationModal.value = false;
    showFreeTransformModal.value = false;
  };
  
  // モーダル開く際の初期化
  const initModalPreview = (currentDataURL: string | null) => {
    savedDataURLBeforeModal.value = currentDataURL;
    modalPreviewSrc.value = currentDataURL;
  };
  
  // モーダル状態変更のwatch設定を返す
  const setupModalWatchers = (getCurrentDataURL: () => string | null) => {
    watch(
      [
        showResizeModal,
        showBrightnessContrastModal,
        showHueSaturationModal,
        showWatermarkModal,
        showToneCurveModal,
        showCropModal,
        showPosterizeModal,
        showLevelsModal,
        showColorBalanceModal,
        showThresholdModal,
        showSharpenModal,
        showSketchModal,
        showChromaticAberrationModal,
        showFreeTransformModal,
      ],
      (newVals) => {
        const anyOpen = newVals.some(v => v);
        if (anyOpen) {
          initModalPreview(getCurrentDataURL());
        }
      }
    );
  };
  
  return {
    // モーダル状態
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
    
    // プレビュー
    modalPreviewSrc,
    savedDataURLBeforeModal,
    
    // トーンカーブ
    toneCurvePoints,
    
    // Computed
    isAnyModalOpen,
    
    // Methods
    closeAllModals,
    initModalPreview,
    setupModalWatchers,
  };
}
