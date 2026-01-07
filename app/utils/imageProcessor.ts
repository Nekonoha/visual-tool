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
    const ctx = this.canvas.getContext('2d');
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
    const sctx = sourceCanvas.getContext('2d');
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
    const tctx = tmpCanvas.getContext('2d');
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
}
