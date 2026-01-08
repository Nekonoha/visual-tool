/**
 * ImageProcessorService - 画像処理のファサードクラス
 * 各プロセッサを統合し、既存のImageProcessorと同様のAPIを提供
 */
import { ColorProcessor } from './processors/ColorProcessor';
import { FilterProcessor } from './processors/FilterProcessor';
import { TransformProcessor } from './processors/TransformProcessor';
import { EffectProcessor } from './processors/EffectProcessor';
import type {
  LevelsParams,
  ColorBalanceParams,
  SharpenParams,
  SketchParams,
  ChromaticAberrationParams,
  WatermarkParams,
  FreeTransformParams,
  SkewParams,
  PerspectiveParams,
  InterpolationMethod,
  Corners,
} from '~/types';

export interface ImageOperations {
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  resizeWidth?: number | null;
  resizeHeight?: number | null;
  crop?: { x: number; y: number; width: number; height: number } | null;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  hue?: number;
  gamma?: number;
  toneCurvePoints?: Array<{ x: number; y: number }>;
  grayscale?: boolean;
  sepia?: boolean;
  posterize?: { levels: number } | null;
  levels?: LevelsParams | null;
  colorBalance?: ColorBalanceParams | null;
  threshold?: { threshold: number } | null;
  sharpen?: SharpenParams | null;
  sketch?: SketchParams | null;
  chromaticAberration?: ChromaticAberrationParams | null;
  freeTransform?: Corners | null;
  interpolation?: InterpolationMethod;
  skew?: SkewParams | null;
  perspective?: PerspectiveParams | null;
  watermark?: WatermarkParams;
}

export class ImageProcessorService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalImage: HTMLImageElement | null = null;
  private lastRenderInfo: { width: number; height: number; aspectRatio: number } | null = null;

  // プロセッサインスタンス
  private colorProcessor: ColorProcessor;
  private filterProcessor: FilterProcessor;
  private transformProcessor: TransformProcessor;
  private effectProcessor: EffectProcessor;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;

    this.colorProcessor = new ColorProcessor();
    this.filterProcessor = new FilterProcessor();
    this.transformProcessor = new TransformProcessor();
    this.effectProcessor = new EffectProcessor();
  }

  /**
   * 画像ファイルを読み込む
   */
  async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.originalImage = img;
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          this.ctx.drawImage(img, 0, 0);
          resolve(img);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * DataURLから画像を読み込む
   */
  async loadImageFromDataURL(dataURL: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load image from dataURL'));
      img.src = dataURL;
    });
  }

  /**
   * すべての操作を適用
   */
  async applyOperations(ops: ImageOperations): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    const rot = ops.rotation ?? 0;
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Step 1: クロップ適用
    const sourceCanvas = document.createElement('canvas');
    const sctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sctx) throw new Error('Canvas context not available');

    const crop = ops.crop;
    const srcW = crop ? crop.width : this.originalImage.width;
    const srcH = crop ? crop.height : this.originalImage.height;
    sourceCanvas.width = Math.round(srcW);
    sourceCanvas.height = Math.round(srcH);
    sctx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);

    if (crop) {
      sctx.drawImage(
        this.originalImage,
        crop.x, crop.y, crop.width, crop.height,
        0, 0, sourceCanvas.width, sourceCanvas.height
      );
    } else {
      sctx.drawImage(this.originalImage, 0, 0);
    }

    // Step 2: 回転+反転
    const rotW = Math.abs(sourceCanvas.width * cos) + Math.abs(sourceCanvas.height * sin);
    const rotH = Math.abs(sourceCanvas.width * sin) + Math.abs(sourceCanvas.height * cos);

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = Math.round(rotW);
    tmpCanvas.height = Math.round(rotH);
    const tctx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    if (!tctx) throw new Error('Canvas context not available');

    tctx.translate(tmpCanvas.width / 2, tmpCanvas.height / 2);
    tctx.rotate(rad);
    const sx = ops.flipH ? -1 : 1;
    const sy = ops.flipV ? -1 : 1;
    tctx.scale(sx, sy);
    tctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    tctx.resetTransform();

    // Step 3: リサイズ
    const finalW = ops.resizeWidth && ops.resizeWidth > 0 ? Math.round(ops.resizeWidth) : tmpCanvas.width;
    const finalH = ops.resizeHeight && ops.resizeHeight > 0 ? Math.round(ops.resizeHeight) : tmpCanvas.height;

    this.canvas.width = finalW;
    this.canvas.height = finalH;
    this.ctx.clearRect(0, 0, finalW, finalH);

    // Step 4: CSSフィルター適用
    const filters: string[] = [];
    const b = ops.brightness ?? 100;
    const c = ops.contrast ?? 100;
    const s = ops.saturation ?? 100;
    const blurVal = ops.blur ?? 0;
    const hue = ops.hue ?? 0;

    filters.push(`brightness(${b}%)`);
    filters.push(`contrast(${c}%)`);
    filters.push(`saturate(${s}%)`);
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
    if (blurVal > 0) filters.push(`blur(${blurVal}px)`);
    if (ops.grayscale) filters.push('grayscale(100%)');
    if (ops.sepia) filters.push('sepia(100%)');

    this.ctx.filter = filters.join(' ');
    this.ctx.drawImage(tmpCanvas, 0, 0, finalW, finalH);
    this.ctx.filter = 'none';

    // Step 5: ピクセル操作（ガンマ、トーンカーブ、高度なフィルター）
    const gamma = ops.gamma ?? 1;
    if (gamma !== 1) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.colorProcessor.adjustGamma(imgData.data, gamma);
      this.ctx.putImageData(imgData, 0, 0);
    }

    if (ops.toneCurvePoints && ops.toneCurvePoints.length >= 2) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.colorProcessor.applyToneCurve(imgData.data, ops.toneCurvePoints);
      this.ctx.putImageData(imgData, 0, 0);
    }

    if (ops.levels) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.colorProcessor.applyLevels(imgData.data, ops.levels);
      this.ctx.putImageData(imgData, 0, 0);
    }

    if (ops.colorBalance) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.colorProcessor.applyColorBalance(
        imgData.data,
        ops.colorBalance.shadows,
        ops.colorBalance.midtones,
        ops.colorBalance.highlights
      );
      this.ctx.putImageData(imgData, 0, 0);
    }

    if (ops.posterize && ops.posterize.levels > 1) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.colorProcessor.posterize(imgData.data, ops.posterize.levels);
      this.ctx.putImageData(imgData, 0, 0);
    }

    if (ops.threshold) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.colorProcessor.threshold(imgData.data, ops.threshold.threshold);
      this.ctx.putImageData(imgData, 0, 0);
    }

    // Step 6: フィルター効果
    if (ops.sharpen && ops.sharpen.amount > 0) {
      this.filterProcessor.applySharpen(this.ctx, finalW, finalH, ops.sharpen.amount, ops.sharpen.radius);
    }

    if (ops.sketch) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.filterProcessor.applySketch(imgData.data, finalW, finalH, ops.sketch.intensity, ops.sketch.invert);
      this.ctx.putImageData(imgData, 0, 0);
    }

    if (ops.chromaticAberration && (ops.chromaticAberration.offsetX !== 0 || ops.chromaticAberration.offsetY !== 0)) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.filterProcessor.applyChromaticAberration(
        imgData.data, finalW, finalH,
        ops.chromaticAberration.offsetX, ops.chromaticAberration.offsetY
      );
      this.ctx.putImageData(imgData, 0, 0);
    }

    // Step 7: 変形処理
    if (ops.skew && (ops.skew.horizontal !== 0 || ops.skew.vertical !== 0)) {
      // TransformProcessorに現在のキャンバス内容を渡す
      const transformCanvas = this.transformProcessor.getCanvas();
      transformCanvas.width = finalW;
      transformCanvas.height = finalH;
      const transformCtx = this.transformProcessor.getContext();
      transformCtx.drawImage(this.canvas, 0, 0);
      this.transformProcessor.applySkew(finalW, finalH, ops.skew.horizontal, ops.skew.vertical);
      this.ctx.drawImage(transformCanvas, 0, 0);
    }

    if (ops.perspective && (ops.perspective.horizontal !== 0 || ops.perspective.vertical !== 0)) {
      const transformCanvas = this.transformProcessor.getCanvas();
      transformCanvas.width = finalW;
      transformCanvas.height = finalH;
      const transformCtx = this.transformProcessor.getContext();
      transformCtx.drawImage(this.canvas, 0, 0);
      this.transformProcessor.applyPerspective(finalW, finalH, ops.perspective.horizontal, ops.perspective.vertical);
      this.ctx.drawImage(transformCanvas, 0, 0);
    }

    if (ops.freeTransform) {
      const transformCanvas = this.transformProcessor.getCanvas();
      transformCanvas.width = finalW;
      transformCanvas.height = finalH;
      const transformCtx = this.transformProcessor.getContext();
      transformCtx.drawImage(this.canvas, 0, 0);
      this.transformProcessor.applyFreeTransform(finalW, finalH, ops.freeTransform, ops.interpolation ?? 'bilinear');
      
      // 変形後のサイズに合わせてメインキャンバスを更新
      this.canvas.width = transformCanvas.width;
      this.canvas.height = transformCanvas.height;
      this.ctx.drawImage(transformCanvas, 0, 0);
    }

    // Step 8: ウォーターマーク
    if (ops.watermark) {
      await this.effectProcessor.applyWatermark(this.ctx, this.canvas.width, this.canvas.height, ops.watermark);
    }

    // Step 9: 透明部分のトリミング
    this.trimTransparentEdges();

    this.lastRenderInfo = {
      width: this.canvas.width,
      height: this.canvas.height,
      aspectRatio: this.canvas.width / this.canvas.height,
    };

    return await this.canvasToBlob();
  }

  /**
   * 透明な縁をトリミング
   */
  private trimTransparentEdges(): void {
    const { width, height } = this.canvas;
    if (width === 0 || height === 0) return;

    const imgData = this.ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    if (!data || data.length === 0) return;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4 + 3;
        const alpha = data[idx] ?? 0;
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return;

    const trimW = maxX - minX + 1;
    const trimH = maxY - minY + 1;
    if (trimW === width && trimH === height) return;

    const trimmed = this.ctx.getImageData(minX, minY, trimW, trimH);
    this.canvas.width = trimW;
    this.canvas.height = trimH;
    this.ctx.putImageData(trimmed, 0, 0);
  }

  /**
   * キャンバスをBlobに変換
   */
  private canvasToBlob(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  }

  /**
   * DataURLを取得
   */
  getDataURL(type: string = 'image/png'): string {
    return this.canvas.toDataURL(type);
  }

  /**
   * 画像を別のフォーマットで取得
   */
  async getAsFormat(format: 'jpeg' | 'png' | 'webp', quality: number = 0.9): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      const mimeType = `image/${format}`;
      this.canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(`Failed to convert to ${format}`));
          return;
        }
        resolve(blob);
      }, mimeType, quality);
    });
  }

  /**
   * ダウンロード
   */
  download(filename: string = 'image.jpg'): void {
    const link = document.createElement('a');
    const isPng = filename.toLowerCase().endsWith('.png');
    const mime = isPng ? 'image/png' : 'image/jpeg';
    link.href = this.canvas.toDataURL(mime);
    link.download = filename;
    link.click();
  }

  /**
   * 画像情報を取得
   */
  getImageInfo() {
    if (this.lastRenderInfo) return this.lastRenderInfo;
    if (!this.originalImage) return null;
    return {
      width: this.originalImage.width,
      height: this.originalImage.height,
      aspectRatio: this.originalImage.width / this.originalImage.height,
    };
  }

  /**
   * オリジナル画像の情報を取得
   */
  getOriginalImageInfo() {
    if (!this.originalImage) return null;
    return {
      width: this.originalImage.width,
      height: this.originalImage.height,
      aspectRatio: this.originalImage.width / this.originalImage.height,
    };
  }

  /**
   * リセット
   */
  reset(): void {
    this.originalImage = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }

  /**
   * キャンバスを取得
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * コンテキストを取得
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * CanvasのDataURLを取得
   */
  getCanvasDataURL(type: string = 'image/jpeg'): string {
    return this.canvas.toDataURL(type);
  }
}
