/**
 * ColorProcessor - 色調補正処理を担当
 * 明度、コントラスト、彩度、レベル補正、カラーバランス等
 */
import { BaseProcessor } from './BaseProcessor';
import type {
  LevelsParams,
  ColorBalanceParams,
} from '~/types';

interface ColorBalanceZone {
  cyan: number;
  magenta: number;
  yellow: number;
}

export class ColorProcessor extends BaseProcessor {
  /**
   * 明度調整
   * @param data - ImageData.data
   * @param value - 0-200 (100が標準)
   */
  adjustBrightness(data: Uint8ClampedArray, value: number): void {
    const factor = value / 100;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp((data[i] ?? 0) * factor, 0, 255);
      data[i + 1] = this.clamp((data[i + 1] ?? 0) * factor, 0, 255);
      data[i + 2] = this.clamp((data[i + 2] ?? 0) * factor, 0, 255);
    }
  }

  /**
   * コントラスト調整
   * @param data - ImageData.data
   * @param value - 0-200 (100が標準)
   */
  adjustContrast(data: Uint8ClampedArray, value: number): void {
    const factor = (value / 100 - 1) * 255;
    const lut = this.createLUT((v) => ((v - 128) * (value / 100) + 128 + factor / 255));
    // 実際には単純な式を使用
    const contrast = value / 100;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp(((data[i] ?? 0) - 128) * contrast + 128, 0, 255);
      data[i + 1] = this.clamp(((data[i + 1] ?? 0) - 128) * contrast + 128, 0, 255);
      data[i + 2] = this.clamp(((data[i + 2] ?? 0) - 128) * contrast + 128, 0, 255);
    }
  }

  /**
   * 彩度調整
   * @param data - ImageData.data
   * @param value - 0-200 (100が標準)
   */
  adjustSaturation(data: Uint8ClampedArray, value: number): void {
    const factor = value / 100;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      data[i] = this.clamp(gray + (r - gray) * factor, 0, 255);
      data[i + 1] = this.clamp(gray + (g - gray) * factor, 0, 255);
      data[i + 2] = this.clamp(gray + (b - gray) * factor, 0, 255);
    }
  }

  /**
   * 色相回転
   * @param data - ImageData.data
   * @param degrees - 回転角度 (-180 to 180)
   */
  adjustHue(data: Uint8ClampedArray, degrees: number): void {
    const hueShift = degrees / 360;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;

      const hsl = this.rgbToHsl(r, g, b);
      hsl.h = (hsl.h + hueShift + 1) % 1;
      const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);

      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
    }
  }

  /**
   * ガンマ補正
   * @param data - ImageData.data
   * @param gamma - ガンマ値 (0.1 to 10, 1が標準)
   */
  adjustGamma(data: Uint8ClampedArray, gamma: number): void {
    const inverseGamma = 1 / gamma;
    const lut = this.createLUT((v) => 255 * Math.pow(v / 255, inverseGamma));
    this.applyLUT(data, lut);
  }

  /**
   * グレースケール変換
   */
  toGrayscale(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }

  /**
   * セピア調変換
   */
  toSepia(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      data[i] = this.clamp(0.393 * r + 0.769 * g + 0.189 * b, 0, 255);
      data[i + 1] = this.clamp(0.349 * r + 0.686 * g + 0.168 * b, 0, 255);
      data[i + 2] = this.clamp(0.272 * r + 0.534 * g + 0.131 * b, 0, 255);
    }
  }

  /**
   * ネガティブ（色反転）
   */
  toNegative(data: Uint8ClampedArray): void {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - (data[i] ?? 0);
      data[i + 1] = 255 - (data[i + 1] ?? 0);
      data[i + 2] = 255 - (data[i + 2] ?? 0);
    }
  }

  /**
   * レベル補正
   */
  applyLevels(data: Uint8ClampedArray, params: LevelsParams): void {
    const { inputBlack, inputWhite, outputBlack, outputWhite, gamma } = params;
    const inputRange = Math.max(1, inputWhite - inputBlack);
    const outputRange = outputWhite - outputBlack;
    const inverseGamma = 1 / gamma;

    const lut = this.createLUT((i) => {
      let val = (i - inputBlack) / inputRange;
      val = Math.max(0, Math.min(1, val));
      val = Math.pow(val, inverseGamma);
      return outputBlack + val * outputRange;
    });

    this.applyLUT(data, lut);
  }

  /**
   * カラーバランス調整
   */
  applyColorBalance(
    data: Uint8ClampedArray,
    shadows: ColorBalanceZone,
    midtones: ColorBalanceZone,
    highlights: ColorBalanceZone
  ): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;

      // 輝度を計算
      const lum = (r + g + b) / 3 / 255;

      // 各ゾーンの重みを計算
      const shadowWeight = Math.max(0, 1 - lum * 3);
      const highlightWeight = Math.max(0, (lum - 0.66) * 3);
      const midtoneWeight = 1 - shadowWeight - highlightWeight;

      // 各チャンネルの調整量を計算
      const cyanShift =
        shadows.cyan * shadowWeight +
        midtones.cyan * midtoneWeight +
        highlights.cyan * highlightWeight;
      const magentaShift =
        shadows.magenta * shadowWeight +
        midtones.magenta * midtoneWeight +
        highlights.magenta * highlightWeight;
      const yellowShift =
        shadows.yellow * shadowWeight +
        midtones.yellow * midtoneWeight +
        highlights.yellow * highlightWeight;

      // 適用（cyan-red, magenta-green, yellow-blue）
      data[i] = this.clamp(r - cyanShift, 0, 255);
      data[i + 1] = this.clamp(g - magentaShift, 0, 255);
      data[i + 2] = this.clamp(b - yellowShift, 0, 255);
    }
  }

  /**
   * ポスタライズ（諧調化）
   */
  posterize(data: Uint8ClampedArray, levels: number): void {
    if (levels < 2) return;
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(Math.round((data[i] ?? 0) / step) * step);
      data[i + 1] = Math.round(Math.round((data[i + 1] ?? 0) / step) * step);
      data[i + 2] = Math.round(Math.round((data[i + 2] ?? 0) / step) * step);
    }
  }

  /**
   * 2値化（閾値処理）
   */
  threshold(data: Uint8ClampedArray, thresholdValue: number): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const value = gray >= thresholdValue ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }

  /**
   * トーンカーブ適用
   * @param data - ImageData.data
   * @param points - カーブ制御点 { x: 0-1, y: 0-1 }[]
   */
  applyToneCurve(data: Uint8ClampedArray, points: Array<{ x: number; y: number }>): void {
    if (points.length < 2) return;

    const sorted = [...points].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return;

    const lut = this.createLUT((i) => {
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

      const span = Math.max(1e-4, p2.x - p1.x);
      const localT = (t - p1.x) / span;
      const y = p1.y + (p2.y - p1.y) * localT;
      return y * 255;
    });

    this.applyLUT(data, lut);
  }
}
