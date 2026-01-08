// 画像処理ユーティリティ関数
// Canvas APIを使用してクライアント側で処理

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalImage: HTMLImageElement | null = null;
  private currentImage: ImageData | null = null;
  private lastRenderInfo: { width: number; height: number; aspectRatio: number } | null = null;
  private watermarkCache: { src: string; image: HTMLImageElement } | null = null;

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
        const idx = (y * width + x) * 4 + 3; // alpha channel
        const alpha = data[idx] ?? 0;
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return; // nothing non-transparent

    const trimW = maxX - minX + 1;
    const trimH = maxY - minY + 1;
    if (trimW === width && trimH === height) return; // already tight

    const trimmed = this.ctx.getImageData(minX, minY, trimW, trimH);
    this.canvas.width = trimW;
    this.canvas.height = trimH;
    this.ctx.putImageData(trimmed, 0, 0);
  }

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;
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
          this.currentImage = this.ctx.getImageData(0, 0, img.width, img.height);
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
   * DataURLから画像を読み込む（Undo用・コミット用）
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
        this.currentImage = this.ctx.getImageData(0, 0, img.width, img.height);
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load image from dataURL'));
      img.src = dataURL;
    });
  }

  // 旧コミットは使用しない（常にoriginalImageから再描画）

  /**
   * 現在のCanvasのDataURL取得
   */
  getDataURL(type: string = 'image/png'): string {
    return this.canvas.toDataURL(type);
  }

  /**
   * 画像をリサイズ
   */
  async resize(width: number, height: number): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.originalImage, 0, 0, width, height);
    this.lastRenderInfo = { width, height, aspectRatio: width / height };
    return await this.canvasToBlob();
  }

  /**
   * アスペクト比を保持したリサイズ
   */
  async resizeKeepAspect(maxWidth: number, maxHeight: number): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    const ratio = Math.min(maxWidth / this.originalImage.width, maxHeight / this.originalImage.height);
    const newWidth = this.originalImage.width * ratio;
    const newHeight = this.originalImage.height * ratio;

    return this.resize(Math.round(newWidth), Math.round(newHeight));
  }

  /**
   * 画像をクロップ
   */
  async crop(x: number, y: number, width: number, height: number): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.originalImage, x, y, width, height, 0, 0, width, height);
    this.lastRenderInfo = { width, height, aspectRatio: width / height };
    return await this.canvasToBlob();
  }

  /**
   * 画像を回転
   */
  async rotate(degrees: number): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const newWidth = Math.abs(this.originalImage.width * cos) + Math.abs(this.originalImage.height * sin);
    const newHeight = Math.abs(this.originalImage.width * sin) + Math.abs(this.originalImage.height * cos);

    this.canvas.width = Math.round(newWidth);
    this.canvas.height = Math.round(newHeight);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate(rad);
    this.ctx.drawImage(
      this.originalImage,
      -this.originalImage.width / 2,
      -this.originalImage.height / 2
    );
    this.ctx.resetTransform();
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * 水平反転
   */
  async flipHorizontal(): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(this.originalImage, -this.originalImage.width, 0);
    this.ctx.resetTransform();
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * 垂直反転
   */
  async flipVertical(): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.scale(1, -1);
    this.ctx.drawImage(this.originalImage, 0, -this.originalImage.height);
    this.ctx.resetTransform();
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * 明度調整
   */
  async brightness(value: number): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = `brightness(${value}%)`;
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * コントラスト調整
   */
  async contrast(value: number): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = `contrast(${value}%)`;
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * 彩度調整
   */
  async saturation(value: number): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = `saturate(${value}%)`;
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * グレースケール
   */
  async grayscale(): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = 'grayscale(100%)';
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * セピア効果
   */
  async sepia(): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = 'sepia(100%)';
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * ぼかし
   */
  async blur(pixelValue: number): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = `blur(${pixelValue}px)`;
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * 複合フィルター適用（リアルタイム用）
   */
  async applyFilters(options: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
    grayscale?: boolean;
    sepia?: boolean;
  }): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');
    const filters: string[] = [];
    const b = options.brightness ?? 100;
    const c = options.contrast ?? 100;
    const s = options.saturation ?? 100;
    const blurVal = options.blur ?? 0;
    filters.push(`brightness(${b}%)`);
    filters.push(`contrast(${c}%)`);
    filters.push(`saturate(${s}%)`);
    if (blurVal > 0) filters.push(`blur(${blurVal}px)`);
    if (options.grayscale) filters.push('grayscale(100%)');
    if (options.sepia) filters.push('sepia(100%)');

    this.canvas.width = this.originalImage.width;
    this.canvas.height = this.originalImage.height;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = filters.join(' ');
    this.ctx.drawImage(this.originalImage, 0, 0);
    this.ctx.filter = 'none';
    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  private async loadWatermarkImage(src: string): Promise<HTMLImageElement> {
    if (this.watermarkCache && this.watermarkCache.src === src) {
      return this.watermarkCache.image;
    }
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load watermark image'));
      img.src = src;
    });
    this.watermarkCache = { src, image };
    return image;
  }

  // ========================================
  // Advanced Filters - Pixel Manipulation
  // ========================================

  /**
   * ポスタライズ（諧調化）- 色の階調数を減らす
   */
  private applyPosterize(data: Uint8ClampedArray, levels: number): void {
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.round((data[i] ?? 0) / step) * step);
      data[i + 1] = Math.round(Math.round((data[i + 1] ?? 0) / step) * step);
      data[i + 2] = Math.round(Math.round((data[i + 2] ?? 0) / step) * step);
    }
  }

  /**
   * レベル補正
   */
  private applyLevels(
    data: Uint8ClampedArray,
    inputBlack: number,
    inputWhite: number,
    outputBlack: number,
    outputWhite: number,
    gamma: number
  ): void {
    const lut = new Array(256);
    const inputRange = Math.max(1, inputWhite - inputBlack);
    const outputRange = outputWhite - outputBlack;
    const inverseGamma = 1 / gamma;

    for (let i = 0; i < 256; i++) {
      // 入力範囲にクランプ
      let val = (i - inputBlack) / inputRange;
      val = Math.max(0, Math.min(1, val));
      // ガンマ補正
      val = Math.pow(val, inverseGamma);
      // 出力範囲にマップ
      lut[i] = Math.round(outputBlack + val * outputRange);
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i] ?? 0] ?? 0;
      data[i + 1] = lut[data[i + 1] ?? 0] ?? 0;
      data[i + 2] = lut[data[i + 2] ?? 0] ?? 0;
    }
  }

  /**
   * カラーバランス（最適化版）
   * ルックアップテーブルを使用して高速化
   */
  private applyColorBalance(
    data: Uint8ClampedArray,
    shadows: { cyan: number; magenta: number; yellow: number },
    midtones: { cyan: number; magenta: number; yellow: number },
    highlights: { cyan: number; magenta: number; yellow: number }
  ): void {
    // 事前計算: -2.55を掛けた値
    const sCyan = shadows.cyan * -2.55;
    const sMagenta = shadows.magenta * -2.55;
    const sYellow = shadows.yellow * -2.55;
    const mCyan = midtones.cyan * -2.55;
    const mMagenta = midtones.magenta * -2.55;
    const mYellow = midtones.yellow * -2.55;
    const hCyan = highlights.cyan * -2.55;
    const hMagenta = highlights.magenta * -2.55;
    const hYellow = highlights.yellow * -2.55;

    // 輝度ごとの重みルックアップテーブル（0-765の範囲、r+g+bの合計値）
    // 各輝度値に対して[shadowWeight, midtoneWeight, highlightWeight]を事前計算
    const shadowLUT = new Float32Array(766);
    const midtoneLUT = new Float32Array(766);
    const highlightLUT = new Float32Array(766);
    
    for (let sum = 0; sum <= 765; sum++) {
      const luminance = sum / 765; // 0-1に正規化
      // シャドウ: 暗い部分（luminance < 0.5）で強い
      shadowLUT[sum] = luminance < 0.5 ? 1 - luminance * 2 : 0;
      // ハイライト: 明るい部分（luminance > 0.5）で強い
      highlightLUT[sum] = luminance > 0.5 ? (luminance - 0.5) * 2 : 0;
      // ミッドトーン: 中間部分で強い
      midtoneLUT[sum] = 1 - (luminance < 0.5 ? (0.5 - luminance) * 2 : (luminance - 0.5) * 2);
    }

    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const sum = r + g + b;

      const sw = shadowLUT[sum];
      const mw = midtoneLUT[sum];
      const hw = highlightLUT[sum];

      // 各チャンネルの調整値を計算
      const adjustR = sCyan * sw + mCyan * mw + hCyan * hw;
      const adjustG = sMagenta * sw + mMagenta * mw + hMagenta * hw;
      const adjustB = sYellow * sw + mYellow * mw + hYellow * hw;

      // クランプ処理（Uint8ClampedArrayが自動的に0-255にクランプするが、明示的に行う）
      const newR = r + adjustR;
      const newG = g + adjustG;
      const newB = b + adjustB;
      
      data[i] = newR < 0 ? 0 : newR > 255 ? 255 : newR;
      data[i + 1] = newG < 0 ? 0 : newG > 255 ? 255 : newG;
      data[i + 2] = newB < 0 ? 0 : newB > 255 ? 255 : newB;
    }
  }

  /**
   * 2値化（しきい値）
   */
  private applyThreshold(data: Uint8ClampedArray, threshold: number): void {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0);
      const val = gray >= threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  }

  /**
   * シャープ（アンシャープマスク）
   */
  private applySharpen(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    amount: number,
    radius: number
  ): void {
    // 元の画像を保存
    const originalData = ctx.getImageData(0, 0, width, height);
    const original = new Uint8ClampedArray(originalData.data);

    // ぼかした画像を作成
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';
    const blurredData = ctx.getImageData(0, 0, width, height);
    const blurred = blurredData.data;

    // アンシャープマスク: original + amount * (original - blurred)
    const factor = amount / 100;
    for (let i = 0; i < original.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const origVal = original[i + c] ?? 0;
        const blurVal = blurred[i + c] ?? 0;
        const diff = origVal - blurVal;
        const newVal = origVal + diff * factor;
        blurred[i + c] = Math.max(0, Math.min(255, Math.round(newVal)));
      }
      blurred[i + 3] = original[i + 3] ?? 255; // アルファを保持
    }

    ctx.putImageData(blurredData, 0, 0);
  }

  /**
   * えんぴつ調（エッジ検出＋グレースケール）
   */
  private applySketch(data: Uint8ClampedArray, width: number, height: number, intensity: number, invert: boolean): void {
    const gray = new Uint8Array(width * height);
    
    // グレースケール化
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = Math.round(0.299 * (data[i] ?? 0) + 0.587 * (data[i + 1] ?? 0) + 0.114 * (data[i + 2] ?? 0));
    }

    // Sobelエッジ検出
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            gx += (gray[idx] ?? 0) * (sobelX[kernelIdx] ?? 0);
            gy += (gray[idx] ?? 0) * (sobelY[kernelIdx] ?? 0);
          }
        }
        let edge = Math.sqrt(gx * gx + gy * gy);
        edge = Math.min(255, edge * (intensity / 50));
        
        const pixelIdx = (y * width + x) * 4;
        const val = invert ? 255 - edge : edge;
        data[pixelIdx] = val;
        data[pixelIdx + 1] = val;
        data[pixelIdx + 2] = val;
      }
    }
  }

  /**
   * 色収差（RGBチャンネルをずらす）
   */
  private applyChromaticAberration(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number
  ): void {
    const original = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Rチャンネル: オフセット方向にずらす
        const rxSrc = Math.max(0, Math.min(width - 1, x - offsetX));
        const rySrc = Math.max(0, Math.min(height - 1, y - offsetY));
        const rIdx = (rySrc * width + rxSrc) * 4;
        data[idx] = original[rIdx] ?? 0;

        // Gチャンネル: そのまま
        data[idx + 1] = original[idx + 1] ?? 0;

        // Bチャンネル: 逆方向にずらす
        const bxSrc = Math.max(0, Math.min(width - 1, x + offsetX));
        const bySrc = Math.max(0, Math.min(height - 1, y + offsetY));
        const bIdx = (bySrc * width + bxSrc) * 4;
        data[idx + 2] = original[bIdx + 2] ?? 0;
      }
    }
  }

  /**
   * すべての操作をoriginalから適用（合成）
   */
  async applyOperations(ops: {
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
    // Advanced filters
    posterize?: { levels: number } | null;
    levels?: { inputBlack: number; inputWhite: number; outputBlack: number; outputWhite: number; gamma: number } | null;
    colorBalance?: {
      shadows: { cyan: number; magenta: number; yellow: number };
      midtones: { cyan: number; magenta: number; yellow: number };
      highlights: { cyan: number; magenta: number; yellow: number };
    } | null;
    threshold?: { threshold: number } | null;
    sharpen?: { amount: number; radius: number } | null;
    sketch?: { intensity: number; invert: boolean } | null;
    chromaticAberration?: { offsetX: number; offsetY: number } | null;
    // Advanced transforms
    freeTransform?: {
      tl: { x: number; y: number };
      tr: { x: number; y: number };
      bl: { x: number; y: number };
      br: { x: number; y: number };
    } | null;
    interpolation?: 'nearest' | 'bilinear' | 'average';
    skew?: { horizontal: number; vertical: number } | null;
    perspective?: { horizontal: number; vertical: number } | null;
    watermark?: {
      type?: 'none' | 'text' | 'image';
      text?: string;
      fontSize?: number;
      color?: string;
      opacity?: number; // 0-1
      position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
      offsetX?: number;
      offsetY?: number;
      imageDataURL?: string;
      scale?: number; // 0-1
      anchorX?: number | null;
      anchorY?: number | null;
      // 新しいオプション
      mode?: 'single' | 'pattern'; // 単一 or パターン
      rotation?: number; // 回転角度（度）
      spacingX?: number; // パターン時のX方向間隔
      spacingY?: number; // パターン時のY方向間隔
    };
  }): Promise<Blob> {
    if (!this.originalImage) throw new Error('No image loaded');
    const rot = ops.rotation ?? 0;
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // クロップ適用（ベースキャンバス）
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
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height
      );
    } else {
      sctx.drawImage(this.originalImage, 0, 0);
    }

    const rotW = Math.abs(sourceCanvas.width * cos) + Math.abs(sourceCanvas.height * sin);
    const rotH = Math.abs(sourceCanvas.width * sin) + Math.abs(sourceCanvas.height * cos);

    // 中間キャンバスで回転＋反転
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

    // 最終サイズ（リサイズ指定があれば適用）
    const finalW = ops.resizeWidth && ops.resizeWidth > 0 ? Math.round(ops.resizeWidth) : tmpCanvas.width;
    const finalH = ops.resizeHeight && ops.resizeHeight > 0 ? Math.round(ops.resizeHeight) : tmpCanvas.height;

    this.canvas.width = finalW;
    this.canvas.height = finalH;
    this.ctx.clearRect(0, 0, finalW, finalH);

    const filters: string[] = [];
    const b = ops.brightness ?? 100;
    const c = ops.contrast ?? 100;
    const s = ops.saturation ?? 100;
    const blurVal = ops.blur ?? 0;
    const hue = ops.hue ?? 0;
    const gamma = ops.gamma ?? 1;
    filters.push(`brightness(${b}%)`);
    filters.push(`contrast(${c}%)`);
    filters.push(`saturate(${s}%)`);
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);
    if (blurVal > 0) filters.push(`blur(${blurVal}px)`);
    if (ops.grayscale) filters.push('grayscale(100%)');
    if (ops.sepia) filters.push('sepia(100%)');
    this.ctx.filter = filters.join(' ');

    // 中間キャンバスから最終へスケール描画
    this.ctx.drawImage(tmpCanvas, 0, 0, finalW, finalH);
    this.ctx.filter = 'none';

    // ガンマ補正（逆ガンマで直感的に：大きいほど明るく）
    if (gamma !== 1) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      const data: Uint8ClampedArray = imgData.data;
      const lut: number[] = new Array(256);
      const inverseGamma = 1 / gamma;
      for (let i = 0; i < 256; i++) {
        lut[i] = Math.min(255, Math.max(0, Math.round(255 * Math.pow(i / 255, inverseGamma))));
      }
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        data[i] = lut[r] ?? r;     // R
        data[i + 1] = lut[g] ?? g; // G
        data[i + 2] = lut[b] ?? b; // B
        // Aは維持
      }
      this.ctx.putImageData(imgData, 0, 0);
    }

    // トーンカーブ（piecewise linear LUT）
    if (ops.toneCurvePoints && ops.toneCurvePoints.length >= 2) {
      const sorted = [...ops.toneCurvePoints].sort((a, b) => a.x - b.x);
      if (sorted.length >= 2) {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        if (first && last) {
          const lut: number[] = new Array(256);
          for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let p1 = first;
            let p2 = last;
            for (let j = 0; j < sorted.length - 1; j++) {
              const cur = sorted[j];
              const nxt = sorted[j + 1];
              if (!cur || !nxt) continue;
              if (t >= cur.x && t <= nxt.x) {
                p1 = cur;
                p2 = nxt;
                break;
              }
            }
            const span = Math.max(1e-4, (p2?.x ?? 0) - (p1?.x ?? 0));
            const localT = (t - (p1?.x ?? 0)) / span;
            const y = (p1?.y ?? 0) + ((p2?.y ?? 0) - (p1?.y ?? 0)) * localT;
            lut[i] = Math.min(255, Math.max(0, Math.round(y * 255)));
          }
          const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
          const data: Uint8ClampedArray = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i] ?? 0;
            const g = data[i + 1] ?? 0;
            const b = data[i + 2] ?? 0;
            data[i] = lut[r] ?? r;
            data[i + 1] = lut[g] ?? g;
            data[i + 2] = lut[b] ?? b;
          }
          this.ctx.putImageData(imgData, 0, 0);
        }
      }
    }

    // === Advanced Filters ===

    // レベル補正
    if (ops.levels) {
      const { inputBlack, inputWhite, outputBlack, outputWhite, gamma } = ops.levels;
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.applyLevels(imgData.data, inputBlack, inputWhite, outputBlack, outputWhite, gamma);
      this.ctx.putImageData(imgData, 0, 0);
    }

    // カラーバランス
    if (ops.colorBalance) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.applyColorBalance(imgData.data, ops.colorBalance.shadows, ops.colorBalance.midtones, ops.colorBalance.highlights);
      this.ctx.putImageData(imgData, 0, 0);
    }

    // ポスタライズ（諧調化）
    if (ops.posterize && ops.posterize.levels > 1) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.applyPosterize(imgData.data, ops.posterize.levels);
      this.ctx.putImageData(imgData, 0, 0);
    }

    // 2値化
    if (ops.threshold) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.applyThreshold(imgData.data, ops.threshold.threshold);
      this.ctx.putImageData(imgData, 0, 0);
    }

    // シャープ
    if (ops.sharpen && ops.sharpen.amount > 0) {
      this.applySharpen(this.ctx, finalW, finalH, ops.sharpen.amount, ops.sharpen.radius);
    }

    // えんぴつ調
    if (ops.sketch) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.applySketch(imgData.data, finalW, finalH, ops.sketch.intensity, ops.sketch.invert);
      this.ctx.putImageData(imgData, 0, 0);
    }

    // 色収差
    if (ops.chromaticAberration && (ops.chromaticAberration.offsetX !== 0 || ops.chromaticAberration.offsetY !== 0)) {
      const imgData = this.ctx.getImageData(0, 0, finalW, finalH);
      this.applyChromaticAberration(imgData.data, finalW, finalH, ops.chromaticAberration.offsetX, ops.chromaticAberration.offsetY);
      this.ctx.putImageData(imgData, 0, 0);
    }

    // 高度な変形処理
    // せん断変形 (Skew)
    if (ops.skew && (ops.skew.horizontal !== 0 || ops.skew.vertical !== 0)) {
      await this.applySkewTransform(finalW, finalH, ops.skew.horizontal, ops.skew.vertical);
    }

    // 遠近変形 (Perspective)
    if (ops.perspective && (ops.perspective.horizontal !== 0 || ops.perspective.vertical !== 0)) {
      await this.applyPerspectiveTransform(finalW, finalH, ops.perspective.horizontal, ops.perspective.vertical);
    }

    // 自由変形 (Free Transform)
    if (ops.freeTransform) {
      await this.applyFreeTransform(finalW, finalH, ops.freeTransform, ops.interpolation ?? 'bilinear');
    }

    const watermark = ops.watermark;
    if (watermark && watermark.type && watermark.type !== 'none') {
      const opacity = Math.min(1, Math.max(0, watermark.opacity ?? 0.5));
      if (opacity > 0) {
        const position = watermark.position ?? 'bottom-right';
        const offsetX = watermark.offsetX ?? 24;
        const offsetY = watermark.offsetY ?? 24;
        const mode = watermark.mode ?? 'single';
        const rotation = watermark.rotation ?? 0;
        const spacingX = watermark.spacingX ?? 100;
        const spacingY = watermark.spacingY ?? 100;
        const rotRad = (rotation * Math.PI) / 180;

        const computePosition = (w: number, h: number, anchor?: { x: number | null; y: number | null }) => {
          const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
          if (position === 'custom' && anchor?.x != null && anchor?.y != null) {
            return {
              x: clamp(anchor.x, 0, Math.max(0, finalW - w)),
              y: clamp(anchor.y, 0, Math.max(0, finalH - h)),
            };
          }
          switch (position) {
            case 'top-left':
              return { x: offsetX, y: offsetY };
            case 'top-right':
              return { x: finalW - w - offsetX, y: offsetY };
            case 'bottom-left':
              return { x: offsetX, y: finalH - h - offsetY };
            case 'center':
              return { x: (finalW - w) / 2, y: (finalH - h) / 2 };
            case 'custom':
              return { x: offsetX, y: offsetY };
            case 'bottom-right':
            default:
              return { x: finalW - w - offsetX, y: finalH - h - offsetY };
          }
        };

        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        // ウォーターマーク描画関数（テキスト用）
        const drawTextWatermark = (cx: number, cy: number, w: number, h: number) => {
          this.ctx.save();
          this.ctx.translate(cx + w / 2, cy + h / 2);
          this.ctx.rotate(rotRad);
          this.ctx.translate(-(w / 2), -(h / 2));
          this.ctx.fillText(watermark.text!, 0, 0);
          this.ctx.restore();
        };

        // ウォーターマーク描画関数（画像用）
        const drawImageWatermark = (cx: number, cy: number, img: HTMLImageElement, w: number, h: number) => {
          this.ctx.save();
          this.ctx.translate(cx + w / 2, cy + h / 2);
          this.ctx.rotate(rotRad);
          this.ctx.drawImage(img, -w / 2, -h / 2, w, h);
          this.ctx.restore();
        };

        if (watermark.type === 'text' && watermark.text) {
          const fontSize = Math.max(8, watermark.fontSize ?? 32);
          this.ctx.font = `${fontSize}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
          this.ctx.fillStyle = watermark.color || 'rgba(255,255,255,0.8)';
          this.ctx.shadowColor = 'rgba(0,0,0,0.35)';
          this.ctx.shadowBlur = 6;
          this.ctx.shadowOffsetX = 1;
          this.ctx.shadowOffsetY = 1;
          this.ctx.textBaseline = 'top';
          const metrics = this.ctx.measureText(watermark.text);
          const textWidth = metrics.width;
          const textHeight = (metrics.actualBoundingBoxAscent ?? fontSize) + (metrics.actualBoundingBoxDescent ?? 0);

          if (mode === 'pattern') {
            // パターンモード: 画面全体にタイル状に配置
            const stepX = textWidth + spacingX;
            const stepY = textHeight + spacingY;
            // 回転時は範囲を広げてカバー
            const diagonal = Math.sqrt(finalW * finalW + finalH * finalH);
            const startX = -diagonal / 2;
            const startY = -diagonal / 2;
            const endX = finalW + diagonal / 2;
            const endY = finalH + diagonal / 2;

            for (let y = startY; y < endY; y += stepY) {
              for (let x = startX; x < endX; x += stepX) {
                drawTextWatermark(x, y, textWidth, textHeight);
              }
            }
          } else {
            // 単一モード
            const { x, y } = computePosition(textWidth, textHeight, {
              x: watermark.anchorX ?? null,
              y: watermark.anchorY ?? null,
            });
            drawTextWatermark(x, y, textWidth, textHeight);
          }
        } else if (watermark.type === 'image' && watermark.imageDataURL) {
          try {
            const img = await this.loadWatermarkImage(watermark.imageDataURL);
            const scale = Math.min(2, Math.max(0.05, watermark.scale ?? 0.3));
            const drawW = img.width * scale;
            const drawH = img.height * scale;

            // 画像用のシャドウ設定
            this.ctx.shadowColor = 'rgba(0,0,0,0.25)';
            this.ctx.shadowBlur = 4;
            this.ctx.shadowOffsetX = 1;
            this.ctx.shadowOffsetY = 1;

            if (mode === 'pattern') {
              // パターンモード
              const stepX = drawW + spacingX;
              const stepY = drawH + spacingY;
              const diagonal = Math.sqrt(finalW * finalW + finalH * finalH);
              const startX = -diagonal / 2;
              const startY = -diagonal / 2;
              const endX = finalW + diagonal / 2;
              const endY = finalH + diagonal / 2;

              for (let y = startY; y < endY; y += stepY) {
                for (let x = startX; x < endX; x += stepX) {
                  drawImageWatermark(x, y, img, drawW, drawH);
                }
              }
            } else {
              // 単一モード
              const { x, y } = computePosition(drawW, drawH, {
                x: watermark.anchorX ?? null,
                y: watermark.anchorY ?? null,
              });
              drawImageWatermark(x, y, img, drawW, drawH);
            }
          } catch (err) {
            console.error(err);
          }
        }

        this.ctx.restore();
      }
    }

    // Remove any transparent padding introduced by rotations or other ops
    this.trimTransparentEdges();

    this.lastRenderInfo = { width: this.canvas.width, height: this.canvas.height, aspectRatio: this.canvas.width / this.canvas.height };
    return await this.canvasToBlob();
  }

  /**
   * 圧縮用にファイルをBlobに変換
   */
  private canvasToBlob(): Promise<Blob> {
    return new Promise<Blob>((resolve) => {
      this.canvas.toBlob((blob) => {
        if (!blob) throw new Error('Failed to convert canvas to blob');
        resolve(blob);
      }, 'image/png'); // PNGで透過を保持
    });
  }

  /**
   * 画像を別のフォーマットで取得
   */
  async getAsFormat(format: 'jpeg' | 'png' | 'webp', quality: number = 0.9): Promise<Blob> {
    return new Promise<Blob>((resolve) => {
      const mimeType = `image/${format}`;
      this.canvas.toBlob((blob) => {
        if (!blob) throw new Error(`Failed to convert to ${format}`);
        resolve(blob);
      }, mimeType, quality);
    });
  }

  /**
   * 現在のCanvasをダウンロード
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
   * Canvasをデータセットとして取得
   */
  getCanvasDataURL(type: string = 'image/jpeg'): string {
    return this.canvas.toDataURL(type);
  }

  /**
   * 画像情報を取得（処理後のサイズ）
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
    this.currentImage = null;
    this.canvas.width = 0;
    this.canvas.height = 0;
  }

  // ============================================================
  // Advanced Transform Methods
  // ============================================================

  /**
   * せん断変形 (Skew)
   * horizontal/vertical: -1 ~ 1 の範囲（-1=最大左/上、1=最大右/下）
   */
  private async applySkewTransform(width: number, height: number, horizontal: number, vertical: number): Promise<void> {
    const imgData = this.ctx.getImageData(0, 0, width, height);
    const srcData = new Uint8ClampedArray(imgData.data);
    const data = imgData.data;

    // せん断量（ピクセル単位に変換）
    const shearX = horizontal * 0.5; // 最大で幅の50%
    const shearY = vertical * 0.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 中心基準で変形
        const cx = x - width / 2;
        const cy = y - height / 2;
        
        // 逆変換：出力座標から入力座標を求める
        const srcCx = cx - cy * shearX;
        const srcCy = cy - cx * shearY;
        
        const srcX = srcCx + width / 2;
        const srcY = srcCy + height / 2;
        
        const idx = (y * width + x) * 4;
        
        if (srcX >= 0 && srcX < width - 1 && srcY >= 0 && srcY < height - 1) {
          // バイリニア補間
          this.bilinearSample(srcData, width, height, srcX, srcY, data, idx);
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }
    
    this.ctx.putImageData(imgData, 0, 0);
  }

  /**
   * 遠近変形 (Perspective)
   * horizontal/vertical: -1 ~ 1 の範囲
   */
  private async applyPerspectiveTransform(width: number, height: number, horizontal: number, vertical: number): Promise<void> {
    const imgData = this.ctx.getImageData(0, 0, width, height);
    const srcData = new Uint8ClampedArray(imgData.data);
    const data = imgData.data;

    // 遠近法パラメータ
    const perspX = horizontal * 0.002;
    const perspY = vertical * 0.002;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // 中心基準で変形
        const cx = x - width / 2;
        const cy = y - height / 2;
        
        // 遠近変換の逆変換
        const denom = 1 + perspX * cx + perspY * cy;
        if (Math.abs(denom) < 0.001) continue;
        
        const srcCx = cx / denom;
        const srcCy = cy / denom;
        
        const srcX = srcCx + width / 2;
        const srcY = srcCy + height / 2;
        
        const idx = (y * width + x) * 4;
        
        if (srcX >= 0 && srcX < width - 1 && srcY >= 0 && srcY < height - 1) {
          this.bilinearSample(srcData, width, height, srcX, srcY, data, idx);
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }
    
    this.ctx.putImageData(imgData, 0, 0);
  }

  /**
   * 自由変形 (Free Transform) - 4隅座標による四角形変形
   * バイリニア逆変換による高品質な実装
   */
  private async applyFreeTransform(
    width: number,
    height: number,
    params: {
      tl: { x: number; y: number };
      tr: { x: number; y: number };
      bl: { x: number; y: number };
      br: { x: number; y: number };
    },
    interpolation: 'nearest' | 'bilinear' | 'average' = 'bilinear'
  ): Promise<void> {
    const { tl, tr, bl, br } = params;
    
    // 正規化座標(0-1)からピクセル座標に変換
    const p0 = { x: tl.x * width, y: tl.y * height }; // top-left
    const p1 = { x: tr.x * width, y: tr.y * height }; // top-right
    const p2 = { x: br.x * width, y: br.y * height }; // bottom-right
    const p3 = { x: bl.x * width, y: bl.y * height }; // bottom-left
    
    // 出力サイズを計算（変形後のバウンディングボックス）
    const minX = Math.floor(Math.min(p0.x, p1.x, p2.x, p3.x));
    const maxX = Math.ceil(Math.max(p0.x, p1.x, p2.x, p3.x));
    const minY = Math.floor(Math.min(p0.y, p1.y, p2.y, p3.y));
    const maxY = Math.ceil(Math.max(p0.y, p1.y, p2.y, p3.y));
    
    const outWidth = Math.max(1, maxX - minX);
    const outHeight = Math.max(1, maxY - minY);
    
    // 4点の相対座標（出力領域内）
    const q0 = { x: p0.x - minX, y: p0.y - minY };
    const q1 = { x: p1.x - minX, y: p1.y - minY };
    const q2 = { x: p2.x - minX, y: p2.y - minY };
    const q3 = { x: p3.x - minX, y: p3.y - minY };
    
    // 元画像データを取得
    const srcData = this.ctx.getImageData(0, 0, width, height);
    const src = srcData.data;
    
    // 出力キャンバス
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = outWidth;
    tmpCanvas.height = outHeight;
    const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
    if (!tmpCtx) return;
    
    const dstData = tmpCtx.createImageData(outWidth, outHeight);
    const dst = dstData.data;
    
    // 逆変換関数（Newton-Raphson法）
    const inverseProject = (x: number, y: number): { u: number; v: number } | null => {
      let u = 0.5, v = 0.5;
      
      for (let iter = 0; iter < 10; iter++) {
        // バイリニア補間: P = (1-u)(1-v)q0 + u(1-v)q1 + uv*q2 + (1-u)v*q3
        const px = (1 - u) * (1 - v) * q0.x + u * (1 - v) * q1.x + u * v * q2.x + (1 - u) * v * q3.x;
        const py = (1 - u) * (1 - v) * q0.y + u * (1 - v) * q1.y + u * v * q2.y + (1 - u) * v * q3.y;
        
        const dx = x - px;
        const dy = y - py;
        
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) break;
        
        // ヤコビアン
        const dxdu = -(1 - v) * q0.x + (1 - v) * q1.x + v * q2.x - v * q3.x;
        const dxdv = -(1 - u) * q0.x - u * q1.x + u * q2.x + (1 - u) * q3.x;
        const dydu = -(1 - v) * q0.y + (1 - v) * q1.y + v * q2.y - v * q3.y;
        const dydv = -(1 - u) * q0.y - u * q1.y + u * q2.y + (1 - u) * q3.y;
        
        const det = dxdu * dydv - dxdv * dydu;
        if (Math.abs(det) < 0.0001) break;
        
        u += (dydv * dx - dxdv * dy) / det;
        v += (-dydu * dx + dxdu * dy) / det;
      }
      
      if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) return null;
      return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
    };
    
    // 各出力ピクセルに対して逆変換
    for (let outY = 0; outY < outHeight; outY++) {
      for (let outX = 0; outX < outWidth; outX++) {
        const uv = inverseProject(outX, outY);
        if (!uv) continue;
        
        // ソース座標
        const srcX = uv.u * (width - 1);
        const srcY = uv.v * (height - 1);
        
        const dstIdx = (outY * outWidth + outX) * 4;
        
        if (interpolation === 'nearest') {
          // ニアレストネイバー
          const x0 = Math.round(srcX);
          const y0 = Math.round(srcY);
          const clampedX = Math.max(0, Math.min(width - 1, x0));
          const clampedY = Math.max(0, Math.min(height - 1, y0));
          const idx = (clampedY * width + clampedX) * 4;
          for (let c = 0; c < 4; c++) {
            dst[dstIdx + c] = src[idx + c] ?? 0;
          }
        } else if (interpolation === 'average') {
          // 色の平均（4ピクセル平均）
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = Math.min(x0 + 1, width - 1);
          const y1 = Math.min(y0 + 1, height - 1);
          const idx00 = (y0 * width + x0) * 4;
          const idx01 = (y0 * width + x1) * 4;
          const idx10 = (y1 * width + x0) * 4;
          const idx11 = (y1 * width + x1) * 4;
          for (let c = 0; c < 4; c++) {
            const avg = ((src[idx00 + c] ?? 0) + (src[idx01 + c] ?? 0) + (src[idx10 + c] ?? 0) + (src[idx11 + c] ?? 0)) / 4;
            dst[dstIdx + c] = Math.round(avg);
          }
        } else {
          // バイリニア補間（デフォルト）
          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = Math.min(x0 + 1, width - 1);
          const y1 = Math.min(y0 + 1, height - 1);
          const fx = srcX - x0;
          const fy = srcY - y0;
          
          const idx00 = (y0 * width + x0) * 4;
          const idx01 = (y0 * width + x1) * 4;
          const idx10 = (y1 * width + x0) * 4;
          const idx11 = (y1 * width + x1) * 4;
          
          for (let c = 0; c < 4; c++) {
            const v00 = src[idx00 + c] ?? 0;
            const v01 = src[idx01 + c] ?? 0;
            const v10 = src[idx10 + c] ?? 0;
            const v11 = src[idx11 + c] ?? 0;
            
            const top = v00 * (1 - fx) + v01 * fx;
            const bottom = v10 * (1 - fx) + v11 * fx;
            dst[dstIdx + c] = Math.round(top * (1 - fy) + bottom * fy);
          }
        }
      }
    }
    
    tmpCtx.putImageData(dstData, 0, 0);
    
    // クリッピングパスを適用して四角形の外側を透明化
    const clipCanvas = document.createElement('canvas');
    clipCanvas.width = outWidth;
    clipCanvas.height = outHeight;
    const clipCtx = clipCanvas.getContext('2d');
    if (!clipCtx) return;
    
    // クリッピングパスを設定（変形後の四角形）
    clipCtx.beginPath();
    clipCtx.moveTo(q0.x, q0.y);
    clipCtx.lineTo(q1.x, q1.y);
    clipCtx.lineTo(q2.x, q2.y);
    clipCtx.lineTo(q3.x, q3.y);
    clipCtx.closePath();
    clipCtx.clip();
    
    // クリッピングパス内にのみ描画
    clipCtx.drawImage(tmpCanvas, 0, 0);
    
    // メインキャンバスをリサイズして描画
    this.canvas.width = outWidth;
    this.canvas.height = outHeight;
    this.ctx.drawImage(clipCanvas, 0, 0);
  }

  /**
   * バイリニア補間でサンプリング
   */
  private bilinearSample(
    srcData: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    dstData: Uint8ClampedArray,
    dstIdx: number
  ): void {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);
    
    const fx = x - x0;
    const fy = y - y0;
    
    const idx00 = (y0 * width + x0) * 4;
    const idx10 = (y0 * width + x1) * 4;
    const idx01 = (y1 * width + x0) * 4;
    const idx11 = (y1 * width + x1) * 4;
    
    for (let c = 0; c < 4; c++) {
      const v00 = srcData[idx00 + c] ?? 0;
      const v10 = srcData[idx10 + c] ?? 0;
      const v01 = srcData[idx01 + c] ?? 0;
      const v11 = srcData[idx11 + c] ?? 0;
      
      const v = v00 * (1-fx) * (1-fy) +
                v10 * fx * (1-fy) +
                v01 * (1-fx) * fy +
                v11 * fx * fy;
      
      dstData[dstIdx + c] = Math.round(v);
    }
  }
}
