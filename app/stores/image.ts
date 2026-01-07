// Pinia ストア - 画像処理の状態管理
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ImageProcessor } from '~/utils/imageProcessor';

export interface ImageState {
  originalFile: File | null;
  originalDataURL: string | null;
  processedDataURL: string | null;
  imageInfo: {
    width: number;
    height: number;
    aspectRatio: number;
  } | null;
  isProcessing: boolean;
  error: string | null;
}

// 適用済み操作の型定義
export interface AppliedOperation {
  type: 'resize' | 'crop' | 'transform' | 'filters' | 'watermark' | 'grayscale' | 'sepia';
  params: any;
}

export const useImageStore = defineStore('image', () => {
  // State
  const originalFile = ref<File | null>(null);
  const originalDataURL = ref<string | null>(null);  // 最初にロードした画像（不変）
  const processedDataURL = ref<string | null>(null);
  const imageInfo = ref<ImageState['imageInfo']>(null);
  const isProcessing = ref(false);
  const error = ref<string | null>(null);
  const processor = ref<ImageProcessor | null>(null);
  
  // 適用済み操作のキュー（履歴）
  const appliedOps = ref<AppliedOperation[]>([]);
  const historyIndex = ref(-1);  // 現在の履歴位置（-1 = 何も適用されていない）
  
  // 現在編集中の操作パラメータ（プレビュー用、まだ適用されていない）
  const defaultOps = () => ({
    rotation: 0,
    flipH: false,
    flipV: false,
    resizeWidth: 0 as number | null,
    resizeHeight: 0 as number | null,
    crop: null as { x: number; y: number; width: number; height: number } | null,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hue: 0,
    gamma: 1,
    toneCurvePoints: [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.25 },
      { x: 0.5, y: 0.5 },
      { x: 0.75, y: 0.75 },
      { x: 1, y: 1 },
    ] as Array<{ x: number; y: number }>,
    grayscale: false,
    sepia: false,
    watermark: {
      type: 'none' as 'none' | 'text' | 'image',
      text: 'Sample Watermark',
      fontSize: 32,
      color: '#ffffff',
      opacity: 0.5,
      position: 'bottom-right' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom',
      offsetX: 24,
      offsetY: 24,
      imageDataURL: '',
      scale: 0.3,
      anchorX: null as number | null,
      anchorY: null as number | null,
      mode: 'single' as 'single' | 'pattern',
      rotation: 0,
      spacingX: 100,
      spacingY: 100,
    },
  });

  const ops = ref(defaultOps());

  let renderTimer: number | null = null;
  let renderPromiseResolve: (() => void) | null = null;
  
  const scheduleRender = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!processor.value) {
        resolve();
        return;
      }
      if (renderTimer) {
        clearTimeout(renderTimer);
        renderTimer = null;
      }
      // 前の待機中のresolveがあれば解決
      if (renderPromiseResolve) {
        renderPromiseResolve();
      }
      renderPromiseResolve = resolve;
      renderTimer = window.setTimeout(async () => {
        await renderNow();
        if (renderPromiseResolve) {
          renderPromiseResolve();
          renderPromiseResolve = null;
        }
      }, 16); // ~60fps デバウンス
    });
  };

  // 適用済み操作を順番に適用してopsを構築
  const buildOpsFromHistory = (upToIndex: number): ReturnType<typeof defaultOps> => {
    const result = defaultOps();
    for (let i = 0; i <= upToIndex && i < appliedOps.value.length; i++) {
      const op = appliedOps.value[i];
      if (!op) continue;
      switch (op.type) {
        case 'resize':
          result.resizeWidth = op.params.width;
          result.resizeHeight = op.params.height;
          break;
        case 'crop':
          result.crop = op.params.crop;
          break;
        case 'transform':
          result.rotation = op.params.rotation;
          result.flipH = op.params.flipH;
          result.flipV = op.params.flipV;
          break;
        case 'filters':
          result.brightness = op.params.brightness ?? 100;
          result.contrast = op.params.contrast ?? 100;
          result.saturation = op.params.saturation ?? 100;
          result.blur = op.params.blur ?? 0;
          result.hue = op.params.hue ?? 0;
          result.gamma = op.params.gamma ?? 1;
          result.toneCurvePoints = op.params.toneCurvePoints ?? result.toneCurvePoints;
          break;
        case 'watermark':
          result.watermark = op.params.watermark;
          break;
        case 'grayscale':
          result.grayscale = true;
          result.sepia = false;
          break;
        case 'sepia':
          result.sepia = true;
          result.grayscale = false;
          break;
      }
    }
    return result;
  };

  const renderNow = async () => {
    if (!processor.value) return;
    try {
      isProcessing.value = true;
      const blob = await processor.value.applyOperations(ops.value);
      processedDataURL.value = URL.createObjectURL(blob);
      imageInfo.value = processor.value.getImageInfo();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Render failed';
    } finally {
      isProcessing.value = false;
    }
  };

  // 履歴からレンダリング（undo/redo時に使用）
  const renderFromHistory = async () => {
    if (!processor.value || !originalDataURL.value) return;
    try {
      isProcessing.value = true;
      // 元画像を再読み込み
      await processor.value.loadImageFromDataURL(originalDataURL.value);
      // 適用済み操作を構築
      const historyOps = buildOpsFromHistory(historyIndex.value);
      // opsも履歴から復元（キャンセル時などに必要）
      ops.value = historyOps;
      const blob = await processor.value.applyOperations(historyOps);
      processedDataURL.value = URL.createObjectURL(blob);
      imageInfo.value = processor.value.getImageInfo();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Render failed';
    } finally {
      isProcessing.value = false;
    }
  };

  // Computed
  const hasImage = computed(() => !!originalFile.value);
  const imageSize = computed(() => {
    if (!imageInfo.value) return '0 × 0';
    return `${imageInfo.value.width} × ${imageInfo.value.height}`;
  });
  const originalImageInfo = computed(() => {
    if (!processor.value) return null;
    return processor.value.getOriginalImageInfo();
  });
  const canUndo = computed(() => historyIndex.value >= 0);
  const canRedo = computed(() => historyIndex.value < appliedOps.value.length - 1);

  // Actions
  const initProcessor = () => {
    try {
      processor.value = new ImageProcessor();
    } catch (err) {
      error.value = 'Failed to initialize image processor';
    }
  };

  const loadImage = async (file: File) => {
    try {
      isProcessing.value = true;
      error.value = null;

      if (!processor.value) {
        initProcessor();
      }

      if (!processor.value) throw new Error('Processor not initialized');

      originalFile.value = file;
      const img = await processor.value.loadImage(file);

      // Store original data URL (await確実に)
      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      originalDataURL.value = dataURL;
      processedDataURL.value = dataURL;
      
      // 新規ロード時は履歴をクリア
      appliedOps.value = [];
      historyIndex.value = -1;
      
      // 操作状態をリセット
      ops.value = defaultOps();
      
      // Get image info
      imageInfo.value = processor.value.getImageInfo();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load image';
    } finally {
      isProcessing.value = false;
    }
  };

  const resize = async (width: number, height: number) => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.resizeWidth = width;
    ops.value.resizeHeight = height;
    scheduleRender();
  };

  const resizeKeepAspect = async (maxWidth: number, maxHeight: number) => {
    if (!processor.value || !imageInfo.value) {
      error.value = 'No image loaded';
      return;
    }
    const ratio = Math.min(maxWidth / imageInfo.value.width, maxHeight / imageInfo.value.height);
    ops.value.resizeWidth = Math.round(imageInfo.value.width * ratio);
    ops.value.resizeHeight = Math.round(imageInfo.value.height * ratio);
    scheduleRender();
  };

  const crop = async (x: number, y: number, width: number, height: number) => {
    if (!processor.value || !imageInfo.value) {
      error.value = 'No image loaded';
      return;
    }
    const w = Math.max(1, Math.min(width, imageInfo.value.width));
    const h = Math.max(1, Math.min(height, imageInfo.value.height));
    const nx = Math.max(0, Math.min(x, imageInfo.value.width - w));
    const ny = Math.max(0, Math.min(y, imageInfo.value.height - h));
    ops.value.crop = { x: nx, y: ny, width: w, height: h };
    scheduleRender();
  };

  const clearCrop = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.crop = null;
    scheduleRender();
  };

  const rotate = async (degrees: number) => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.rotation = degrees;
    scheduleRender();
  };

  const flipHorizontal = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.flipH = !ops.value.flipH;
    scheduleRender();
  };

  const flipVertical = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.flipV = !ops.value.flipV;
    scheduleRender();
  };

  const brightness = async (value: number) => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.brightness = value;
    scheduleRender();
  };

  const contrast = async (value: number) => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.contrast = value;
    scheduleRender();
  };

  const saturation = async (value: number) => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.saturation = value;
    scheduleRender();
  };

  const grayscale = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.grayscale = true;
    ops.value.sepia = false;
    scheduleRender();
  };

  const sepia = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.sepia = true;
    ops.value.grayscale = false;
    scheduleRender();
  };

  const blur = async (pixelValue: number) => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    ops.value.blur = pixelValue;
    scheduleRender();
  };

  const applyFiltersRealtime = async (opts: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
    hue?: number;
    gamma?: number;
    grayscale?: boolean;
    sepia?: boolean;
    toneCurvePoints?: Array<{ x: number; y: number }>;
    crop?: { x: number; y: number; width: number; height: number } | null;
    resizeWidth?: number | null;
    resizeHeight?: number | null;
    watermark?: typeof ops.value.watermark;
  }): Promise<void> => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    // リアルタイムプレビュー用
    if (typeof opts.brightness === 'number') ops.value.brightness = opts.brightness;
    if (typeof opts.contrast === 'number') ops.value.contrast = opts.contrast;
    if (typeof opts.saturation === 'number') ops.value.saturation = opts.saturation;
    if (typeof opts.blur === 'number') ops.value.blur = opts.blur;
    if (typeof opts.hue === 'number') ops.value.hue = opts.hue;
    if (typeof opts.gamma === 'number') ops.value.gamma = opts.gamma;
    if (Array.isArray(opts.toneCurvePoints)) ops.value.toneCurvePoints = opts.toneCurvePoints;
    if (typeof opts.grayscale === 'boolean') ops.value.grayscale = opts.grayscale;
    if (typeof opts.sepia === 'boolean') ops.value.sepia = opts.sepia;
    if (opts.crop !== undefined) ops.value.crop = opts.crop;
    if (opts.resizeWidth !== undefined) ops.value.resizeWidth = opts.resizeWidth;
    if (opts.resizeHeight !== undefined) ops.value.resizeHeight = opts.resizeHeight;
    if (opts.watermark !== undefined) ops.value.watermark = opts.watermark;
    await scheduleRender();
  };

  /**
   * 操作を適用（履歴に追加）
   */
  const applyOperation = async (operation: AppliedOperation) => {
    if (!processor.value || !originalDataURL.value) return;
    
    // 現在位置より先の履歴を削除（新しい操作を追加するため）
    if (historyIndex.value < appliedOps.value.length - 1) {
      appliedOps.value = appliedOps.value.slice(0, historyIndex.value + 1);
    }
    
    // 新しい操作を追加
    appliedOps.value.push(operation);
    historyIndex.value = appliedOps.value.length - 1;
    
    // 履歴からレンダリング
    await renderFromHistory();
  };

  const undo = async () => {
    try {
      if (!canUndo.value) return;
      if (!processor.value) throw new Error('Processor not initialized');
      
      historyIndex.value--;
      
      // UIのopsをリセット
      ops.value = defaultOps();
      
      // 履歴からレンダリング
      await renderFromHistory();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Undo failed';
    }
  };

  const redo = async () => {
    try {
      if (!canRedo.value) return;
      if (!processor.value) throw new Error('Processor not initialized');
      
      historyIndex.value++;
      
      // UIのopsをリセット
      ops.value = defaultOps();
      
      // 履歴からレンダリング
      await renderFromHistory();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Redo failed';
    }
  };

  const download = (filename: string = 'image.jpg') => {
    if (!processor.value) throw new Error('No image loaded');
    processor.value.download(filename);
  };

  const reset = () => {
    originalFile.value = null;
    originalDataURL.value = null;
    processedDataURL.value = null;
    imageInfo.value = null;
    error.value = null;
    appliedOps.value = [];
    historyIndex.value = -1;
    if (processor.value) {
      processor.value.reset();
    }
    ops.value = defaultOps();
  };

  const resetOperations = async () => {
    if (!processor.value || !originalDataURL.value) return;
    appliedOps.value = [];
    historyIndex.value = -1;
    ops.value = defaultOps();
    // 元画像に戻す
    await processor.value.loadImageFromDataURL(originalDataURL.value);
    processedDataURL.value = originalDataURL.value;
    imageInfo.value = processor.value.getImageInfo();
  };

  return {
    // State
    originalFile,
    originalDataURL,
    processedDataURL,
    imageInfo,
    isProcessing,
    error,
    appliedOps,
    historyIndex,
    ops,

    // Computed
    hasImage,
    imageSize,
    originalImageInfo,
    canUndo,
    canRedo,

    // Actions
    initProcessor,
    loadImage,
    resize,
    resizeKeepAspect,
    crop,
    clearCrop,
    rotate,
    flipHorizontal,
    flipVertical,
    brightness,
    contrast,
    saturation,
    grayscale,
    sepia,
    blur,
    applyFiltersRealtime,
    applyOperation,
    download,
    undo,
    redo,
    reset,
    resetOperations,
    scheduleRender,
    defaultOps,
    renderFromHistory,
  };
});
