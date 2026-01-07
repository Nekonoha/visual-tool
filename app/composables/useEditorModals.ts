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
  
  // いずれかのモーダルが開いているか
  const isAnyModalOpen = computed(() => 
    showResizeModal.value ||
    showCropModal.value ||
    showTransformModal.value ||
    showBrightnessContrastModal.value ||
    showHueSaturationModal.value ||
    showToneCurveModal.value ||
    showWatermarkModal.value
  );
  
  // 全モーダルを閉じる
  const closeAllModals = () => {
    showResizeModal.value = false;
    showCropModal.value = false;
    showTransformModal.value = false;
    showBrightnessContrastModal.value = false;
    showHueSaturationModal.value = false;
    showToneCurveModal.value = false;
    showWatermarkModal.value = false;
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
        showTransformModal,
        showBrightnessContrastModal,
        showHueSaturationModal,
        showWatermarkModal,
        showToneCurveModal,
        showCropModal,
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
    showTransformModal,
    showBrightnessContrastModal,
    showHueSaturationModal,
    showToneCurveModal,
    showWatermarkModal,
    
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
