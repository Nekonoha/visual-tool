/**
 * EffectProcessor - 特殊効果処理を担当
 * ウォーターマーク、オーバーレイ等
 */
import { BaseProcessor } from './BaseProcessor';
import type { WatermarkParams, WatermarkPosition } from '~/types';

export class EffectProcessor extends BaseProcessor {
  private watermarkCache: { src: string; image: HTMLImageElement } | null = null;

  /**
   * ウォーターマーク画像をロード（キャッシュ付き）
   */
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
   * ウォーターマーク位置を計算
   */
  private computePosition(
    position: WatermarkPosition,
    canvasWidth: number,
    canvasHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    offsetX: number,
    offsetY: number,
    anchorX?: number | null,
    anchorY?: number | null
  ): { x: number; y: number } {
    if (position === 'custom' && anchorX != null && anchorY != null) {
      return {
        x: this.clamp(anchorX, 0, Math.max(0, canvasWidth - watermarkWidth)),
        y: this.clamp(anchorY, 0, Math.max(0, canvasHeight - watermarkHeight)),
      };
    }

    switch (position) {
      case 'top-left':
        return { x: offsetX, y: offsetY };
      case 'top-right':
        return { x: canvasWidth - watermarkWidth - offsetX, y: offsetY };
      case 'bottom-left':
        return { x: offsetX, y: canvasHeight - watermarkHeight - offsetY };
      case 'center':
        return {
          x: (canvasWidth - watermarkWidth) / 2,
          y: (canvasHeight - watermarkHeight) / 2,
        };
      case 'custom':
        return { x: offsetX, y: offsetY };
      case 'bottom-right':
      default:
        return {
          x: canvasWidth - watermarkWidth - offsetX,
          y: canvasHeight - watermarkHeight - offsetY,
        };
    }
  }

  /**
   * ウォーターマークを適用
   */
  async applyWatermark(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    params: WatermarkParams
  ): Promise<void> {
    if (!params.type || params.type === 'none') return;

    const opacity = this.clamp(params.opacity / 100, 0, 1);
    if (opacity <= 0) return;

    const position = params.position ?? 'bottom-right';
    const offsetX = params.offsetX ?? 24;
    const offsetY = params.offsetY ?? 24;
    const mode = params.mode ?? 'single';
    const rotation = params.rotation ?? 0;
    const spacingX = params.spacingX ?? 100;
    const spacingY = params.spacingY ?? 100;
    const rotRad = (rotation * Math.PI) / 180;

    ctx.save();
    ctx.globalAlpha = opacity;

    if (params.type === 'text' && params.text) {
      await this.drawTextWatermark(
        ctx,
        canvasWidth,
        canvasHeight,
        params.text,
        params.fontSize ?? 32,
        params.color ?? '#ffffff',
        position,
        offsetX,
        offsetY,
        mode,
        rotRad,
        spacingX,
        spacingY
      );
    } else if (params.type === 'image' && params.imageDataURL) {
      await this.drawImageWatermark(
        ctx,
        canvasWidth,
        canvasHeight,
        params.imageDataURL,
        params.scale ?? 0.3,
        position,
        offsetX,
        offsetY,
        mode,
        rotRad,
        spacingX,
        spacingY
      );
    }

    ctx.restore();
  }

  /**
   * テキストウォーターマークを描画
   */
  private async drawTextWatermark(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    text: string,
    fontSize: number,
    color: string,
    position: WatermarkPosition,
    offsetX: number,
    offsetY: number,
    mode: 'single' | 'pattern',
    rotRad: number,
    spacingX: number,
    spacingY: number
  ): Promise<void> {
    const actualFontSize = Math.max(8, fontSize);
    ctx.font = `${actualFontSize}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.textBaseline = 'top';

    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight =
      (metrics.actualBoundingBoxAscent ?? actualFontSize) +
      (metrics.actualBoundingBoxDescent ?? 0);

    const drawSingle = (cx: number, cy: number) => {
      ctx.save();
      ctx.translate(cx + textWidth / 2, cy + textHeight / 2);
      ctx.rotate(rotRad);
      ctx.translate(-textWidth / 2, -textHeight / 2);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    if (mode === 'pattern') {
      const stepX = textWidth + spacingX;
      const stepY = textHeight + spacingY;
      const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
      const startX = -diagonal / 2;
      const startY = -diagonal / 2;
      const endX = canvasWidth + diagonal / 2;
      const endY = canvasHeight + diagonal / 2;

      for (let y = startY; y < endY; y += stepY) {
        for (let x = startX; x < endX; x += stepX) {
          drawSingle(x, y);
        }
      }
    } else {
      const { x, y } = this.computePosition(
        position,
        canvasWidth,
        canvasHeight,
        textWidth,
        textHeight,
        offsetX,
        offsetY
      );
      drawSingle(x, y);
    }
  }

  /**
   * 画像ウォーターマークを描画
   */
  private async drawImageWatermark(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    imageDataURL: string,
    scale: number,
    position: WatermarkPosition,
    offsetX: number,
    offsetY: number,
    mode: 'single' | 'pattern',
    rotRad: number,
    spacingX: number,
    spacingY: number
  ): Promise<void> {
    try {
      const img = await this.loadWatermarkImage(imageDataURL);
      const actualScale = this.clamp(scale, 0.05, 2);
      const drawW = img.width * actualScale;
      const drawH = img.height * actualScale;

      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const drawSingle = (cx: number, cy: number) => {
        ctx.save();
        ctx.translate(cx + drawW / 2, cy + drawH / 2);
        ctx.rotate(rotRad);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      };

      if (mode === 'pattern') {
        const stepX = drawW + spacingX;
        const stepY = drawH + spacingY;
        const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
        const startX = -diagonal / 2;
        const startY = -diagonal / 2;
        const endX = canvasWidth + diagonal / 2;
        const endY = canvasHeight + diagonal / 2;

        for (let y = startY; y < endY; y += stepY) {
          for (let x = startX; x < endX; x += stepX) {
            drawSingle(x, y);
          }
        }
      } else {
        const { x, y } = this.computePosition(
          position,
          canvasWidth,
          canvasHeight,
          drawW,
          drawH,
          offsetX,
          offsetY
        );
        drawSingle(x, y);
      }
    } catch (err) {
      console.error('Failed to draw image watermark:', err);
    }
  }

  /**
   * グラデーションオーバーレイ
   */
  applyGradientOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    colorStops: Array<{ offset: number; color: string }>,
    direction: 'horizontal' | 'vertical' | 'diagonal' = 'vertical',
    opacity: number = 0.5
  ): void {
    let gradient: CanvasGradient;

    switch (direction) {
      case 'horizontal':
        gradient = ctx.createLinearGradient(0, 0, width, 0);
        break;
      case 'diagonal':
        gradient = ctx.createLinearGradient(0, 0, width, height);
        break;
      case 'vertical':
      default:
        gradient = ctx.createLinearGradient(0, 0, 0, height);
        break;
    }

    for (const stop of colorStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * カラーオーバーレイ
   */
  applyColorOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color: string,
    opacity: number = 0.5,
    blendMode: GlobalCompositeOperation = 'multiply'
  ): void {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = blendMode;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * 境界線を追加
   */
  addBorder(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    borderWidth: number,
    borderColor: string
  ): void {
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      width - borderWidth,
      height - borderWidth
    );
    ctx.restore();
  }
}
