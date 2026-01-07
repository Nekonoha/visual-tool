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

export const useImageStore = defineStore('image', () => {
  // State
  const originalFile = ref<File | null>(null);
  const originalDataURL = ref<string | null>(null);
  const processedDataURL = ref<string | null>(null);
  const imageInfo = ref<ImageState['imageInfo']>(null);
  const isProcessing = ref(false);
  const error = ref<string | null>(null);
  const processor = ref<ImageProcessor | null>(null);
  // 操作状態（合成描画用）
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
      { x: 0.33, y: 0.33 },
      { x: 0.66, y: 0.66 },
      { x: 1, y: 1 },
    ] as Array<{ x: number; y: number }>,
    grayscale: false,
    sepia: false,
  });

  const ops = ref(defaultOps());
  let pendingSnapshot: ReturnType<typeof defaultOps> | null = null;

  // 履歴スタック（Undo/Redo）: opsのスナップショットを保持
  const historyPast = ref<Array<ReturnType<typeof defaultOps>>>([]);
  const historyFuture = ref<Array<ReturnType<typeof defaultOps>>>([]);

  const snapshotOps = () => {
    historyPast.value.push({ ...ops.value });
    historyFuture.value = [];
  };

  const pushHistoryIfChanged = () => {
    const last = historyPast.value[historyPast.value.length - 1];
    const current = ops.value;
    if (!last || JSON.stringify(last) !== JSON.stringify(current)) {
      snapshotOps();
    }
  };

  let renderTimer: number | null = null;
  const scheduleRender = () => {
    if (!processor.value) return;
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
    renderTimer = window.setTimeout(renderNow, 16); // ~60fps デバウンス
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

  // Computed
  const hasImage = computed(() => !!originalFile.value);
  const imageSize = computed(() => {
    if (!imageInfo.value) return '0 × 0';
    return `${imageInfo.value.width} × ${imageInfo.value.height}`;
  });
  const canUndo = computed(() => historyPast.value.length > 0);
  const canRedo = computed(() => historyFuture.value.length > 0);

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
      historyPast.value = [];
      historyFuture.value = [];
      
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
    pushHistoryIfChanged();
    ops.value.resizeWidth = width;
    ops.value.resizeHeight = height;
    scheduleRender();
  };

  const resizeKeepAspect = async (maxWidth: number, maxHeight: number) => {
    if (!processor.value || !imageInfo.value) {
      error.value = 'No image loaded';
      return;
    }
    pushHistoryIfChanged();
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
    pushHistoryIfChanged();
    ops.value.crop = { x: nx, y: ny, width: w, height: h };
    scheduleRender();
  };

  const clearCrop = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    pushHistoryIfChanged();
    ops.value.crop = null;
    scheduleRender();
  };

  const rotate = async (degrees: number) => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    if (!pendingSnapshot) pendingSnapshot = { ...ops.value };
    ops.value.rotation = degrees;
    scheduleRender();
  };

  const flipHorizontal = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    pushHistoryIfChanged();
    ops.value.flipH = !ops.value.flipH;
    scheduleRender();
  };

  const flipVertical = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    pushHistoryIfChanged();
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
    pushHistoryIfChanged();
    ops.value.grayscale = true;
    ops.value.sepia = false;
    scheduleRender();
  };

  const sepia = async () => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    pushHistoryIfChanged();
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
  }) => {
    if (!processor.value) {
      error.value = 'No image loaded';
      return;
    }
    // 連続ドラッグ中は最初の変化前の状態を保持しておき、リリース時に履歴へ積む
    if (!pendingSnapshot) pendingSnapshot = { ...ops.value };
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
    scheduleRender();
  };

  const commitOpsHistory = () => {
    if (pendingSnapshot) {
      const changed = JSON.stringify(pendingSnapshot) !== JSON.stringify(ops.value);
      if (changed) {
        historyPast.value.push({ ...pendingSnapshot });
        historyFuture.value = [];
      }
      pendingSnapshot = null;
      return;
    }
    pushHistoryIfChanged();
  };

  const undo = async () => {
    try {
      if (!canUndo.value) return;
      if (!processor.value) throw new Error('Processor not initialized');
      const prevOps = historyPast.value.pop() as ReturnType<typeof defaultOps>;
      historyFuture.value.push({ ...ops.value });
      ops.value = { ...prevOps };
      await renderNow();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Undo failed';
    }
  };

  const redo = async () => {
    try {
      if (!canRedo.value) return;
      if (!processor.value) throw new Error('Processor not initialized');
      const nextOps = historyFuture.value.pop() as ReturnType<typeof defaultOps>;
      historyPast.value.push({ ...ops.value });
      ops.value = { ...nextOps };
      await renderNow();
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
    historyPast.value = [];
    historyFuture.value = [];
    pendingSnapshot = null;
    if (processor.value) {
      processor.value.reset();
    }
    ops.value = defaultOps();
  };

  const resetOperations = async () => {
    if (!processor.value || !originalDataURL.value) return;
    historyPast.value = [];
    historyFuture.value = [];
    ops.value = defaultOps();
    pendingSnapshot = null;
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
    historyPast,
    historyFuture,
    ops,

    // Computed
    hasImage,
    imageSize,
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
    download,
    undo,
    redo,
    reset,
    commitOpsHistory,
    resetOperations,
    scheduleRender,
  };
});
