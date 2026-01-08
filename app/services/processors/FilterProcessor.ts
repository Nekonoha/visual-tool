/**
 * FilterProcessor - フィルタ処理を担当
 * シャープ、ぼかし、ノイズ、畳み込み等
 */
import { BaseProcessor } from './BaseProcessor';
import type { SharpenParams, SketchParams, ChromaticAberrationParams } from '~/types';

export class FilterProcessor extends BaseProcessor {
  /**
   * シャープ（アンシャープマスク）
   */
  applySharpen(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    amount: number,
    radius: number
  ): void {
    // オリジナルを保存
    const original = ctx.getImageData(0, 0, width, height);
    const origData = original.data;

    // ぼかしを適用（アンシャープマスク用）
    const blurred = ctx.getImageData(0, 0, width, height);
    this.applyBoxBlur(blurred.data, width, height, Math.max(1, Math.round(radius)));

    // アンシャープマスク: original + (original - blurred) * amount
    const blurredData = blurred.data;
    for (let i = 0; i < origData.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const orig = origData[i + c] ?? 0;
        const blur = blurredData[i + c] ?? 0;
        const diff = orig - blur;
        origData[i + c] = this.clamp(Math.round(orig + diff * amount), 0, 255);
      }
    }

    ctx.putImageData(original, 0, 0);
  }

  /**
   * ボックスぼかし
   */
  private applyBoxBlur(data: Uint8ClampedArray, width: number, height: number, radius: number): void {
    const tempData = new Uint8ClampedArray(data);
    const kernelSize = radius * 2 + 1;
    const area = kernelSize * kernelSize;

    // 水平パス
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = this.clamp(x + dx, 0, width - 1);
          const idx = (y * width + sx) * 4;
          r += tempData[idx] ?? 0;
          g += tempData[idx + 1] ?? 0;
          b += tempData[idx + 2] ?? 0;
          a += tempData[idx + 3] ?? 0;
        }
        const idx = (y * width + x) * 4;
        data[idx] = Math.round(r / kernelSize);
        data[idx + 1] = Math.round(g / kernelSize);
        data[idx + 2] = Math.round(b / kernelSize);
        data[idx + 3] = Math.round(a / kernelSize);
      }
    }

    // 中間結果をコピー
    tempData.set(data);

    // 垂直パス
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const sy = this.clamp(y + dy, 0, height - 1);
          const idx = (sy * width + x) * 4;
          r += tempData[idx] ?? 0;
          g += tempData[idx + 1] ?? 0;
          b += tempData[idx + 2] ?? 0;
          a += tempData[idx + 3] ?? 0;
        }
        const idx = (y * width + x) * 4;
        data[idx] = Math.round(r / kernelSize);
        data[idx + 1] = Math.round(g / kernelSize);
        data[idx + 2] = Math.round(b / kernelSize);
        data[idx + 3] = Math.round(a / kernelSize);
      }
    }
  }

  /**
   * ガウシアンぼかし（Canvas filter使用）
   */
  applyGaussianBlur(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    radius: number
  ): void {
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
  }

  /**
   * えんぴつ調（スケッチ）エフェクト
   */
  applySketch(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    intensity: number,
    invert: boolean
  ): void {
    // グレースケール化
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      gray[j] = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
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
            const pixel = gray[idx] ?? 0;
            gx += pixel * (sobelX[kernelIdx] ?? 0);
            gy += pixel * (sobelY[kernelIdx] ?? 0);
          }
        }

        let edge = Math.sqrt(gx * gx + gy * gy);
        edge = this.clamp(edge * intensity, 0, 255);

        const dataIdx = (y * width + x) * 4;
        const value = invert ? Math.round(edge) : Math.round(255 - edge);
        data[dataIdx] = value;
        data[dataIdx + 1] = value;
        data[dataIdx + 2] = value;
      }
    }
  }

  /**
   * 色収差（Chromatic Aberration）
   */
  applyChromaticAberration(
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

        // 赤チャンネル: 正方向にオフセット
        const rX = this.clamp(x + offsetX, 0, width - 1);
        const rY = this.clamp(y + offsetY, 0, height - 1);
        const rIdx = (rY * width + rX) * 4;
        data[idx] = original[rIdx] ?? 0;

        // 緑チャンネル: そのまま
        // data[idx + 1] は変更なし

        // 青チャンネル: 負方向にオフセット
        const bX = this.clamp(x - offsetX, 0, width - 1);
        const bY = this.clamp(y - offsetY, 0, height - 1);
        const bIdx = (bY * width + bX) * 4;
        data[idx + 2] = original[bIdx + 2] ?? 0;
      }
    }
  }

  /**
   * エンボス効果
   */
  applyEmboss(data: Uint8ClampedArray, width: number, height: number): void {
    const kernel = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
    this.applyConvolution(data, width, height, kernel, 1);
  }

  /**
   * 畳み込み処理（汎用）
   */
  private applyConvolution(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    kernel: number[],
    divisor: number = 1,
    offset: number = 0
  ): void {
    const tempData = new Uint8ClampedArray(data);
    const kernelSize = Math.sqrt(kernel.length);
    const half = Math.floor(kernelSize / 2);

    for (let y = half; y < height - half; y++) {
      for (let x = half; x < width - half; x++) {
        let r = 0, g = 0, b = 0;
        let ki = 0;

        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const weight = kernel[ki++] ?? 0;
            r += (tempData[idx] ?? 0) * weight;
            g += (tempData[idx + 1] ?? 0) * weight;
            b += (tempData[idx + 2] ?? 0) * weight;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = this.clamp(Math.round(r / divisor + offset), 0, 255);
        data[idx + 1] = this.clamp(Math.round(g / divisor + offset), 0, 255);
        data[idx + 2] = this.clamp(Math.round(b / divisor + offset), 0, 255);
      }
    }
  }

  /**
   * ノイズ追加
   */
  addNoise(data: Uint8ClampedArray, amount: number): void {
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * amount * 2;
      data[i] = this.clamp((data[i] ?? 0) + noise, 0, 255);
      data[i + 1] = this.clamp((data[i + 1] ?? 0) + noise, 0, 255);
      data[i + 2] = this.clamp((data[i + 2] ?? 0) + noise, 0, 255);
    }
  }

  /**
   * ビネット効果（周辺減光）
   */
  applyVignette(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    amount: number,
    radius: number = 0.5
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const factor = 1 - Math.pow(Math.max(0, dist - radius) / (1 - radius), 2) * amount;

        const idx = (y * width + x) * 4;
        data[idx] = this.clamp((data[idx] ?? 0) * factor, 0, 255);
        data[idx + 1] = this.clamp((data[idx + 1] ?? 0) * factor, 0, 255);
        data[idx + 2] = this.clamp((data[idx + 2] ?? 0) * factor, 0, 255);
      }
    }
  }
}
