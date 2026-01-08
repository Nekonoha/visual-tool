/**
 * BaseProcessor - 画像処理の基底クラス
 * 共通ユーティリティとヘルパーメソッドを提供
 */
export abstract class BaseProcessor {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;
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
   * キャンバスをBlobに変換
   */
  protected canvasToBlob(mimeType: string = 'image/png', quality?: number): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'));
            return;
          }
          resolve(blob);
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * キャンバスをDataURLに変換
   */
  protected canvasToDataURL(mimeType: string = 'image/png', quality?: number): string {
    return this.canvas.toDataURL(mimeType, quality);
  }

  /**
   * 透明な縁をトリミング
   */
  protected trimTransparentEdges(): void {
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

  /**
   * バイリニア補間でサンプリング
   */
  protected bilinearSample(
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

      const v =
        v00 * (1 - fx) * (1 - fy) +
        v10 * fx * (1 - fy) +
        v01 * (1 - fx) * fy +
        v11 * fx * fy;

      dstData[dstIdx + c] = Math.round(v);
    }
  }

  /**
   * 一時キャンバスを作成
   */
  protected createTempCanvas(width: number, height: number): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas context not available');
    return { canvas, ctx };
  }

  /**
   * ImageDataをキャンバスにコピー
   */
  protected copyImageData(src: ImageData): ImageData {
    const dst = new ImageData(src.width, src.height);
    dst.data.set(src.data);
    return dst;
  }

  /**
   * 値をクランプ
   */
  protected clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * RGBからHSLに変換
   */
  protected rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h, s, l };
  }

  /**
   * HSLからRGBに変換
   */
  protected hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  /**
   * ルックアップテーブル(LUT)を作成
   */
  protected createLUT(fn: (value: number) => number): number[] {
    const lut = new Array<number>(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = this.clamp(Math.round(fn(i)), 0, 255);
    }
    return lut;
  }

  /**
   * LUTを適用
   */
  protected applyLUT(data: Uint8ClampedArray, lut: number[]): void {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i] ?? 0] ?? 0;
      data[i + 1] = lut[data[i + 1] ?? 0] ?? 0;
      data[i + 2] = lut[data[i + 2] ?? 0] ?? 0;
    }
  }
}
