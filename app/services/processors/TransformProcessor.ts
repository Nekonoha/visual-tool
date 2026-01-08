/**
 * TransformProcessor - 変形処理を担当
 * リサイズ、回転、反転、せん断、遠近法、自由変形等
 */
import { BaseProcessor } from './BaseProcessor';
import type {
  InterpolationMethod,
  Corner,
  Corners,
  SkewParams,
  PerspectiveParams,
  FreeTransformParams,
} from '~/types';

export class TransformProcessor extends BaseProcessor {
  /**
   * リサイズ
   */
  resize(
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    width: number,
    height: number
  ): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(sourceImage, 0, 0, width, height);
  }

  /**
   * アスペクト比を保持してリサイズ
   */
  resizeKeepAspect(
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const ratio = Math.min(
      maxWidth / sourceImage.width,
      maxHeight / sourceImage.height
    );
    const width = Math.round(sourceImage.width * ratio);
    const height = Math.round(sourceImage.height * ratio);

    this.resize(sourceImage, width, height);
    return { width, height };
  }

  /**
   * 回転
   */
  rotate(
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    degrees: number
  ): void {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));

    const newWidth = Math.ceil(sourceImage.width * cos + sourceImage.height * sin);
    const newHeight = Math.ceil(sourceImage.width * sin + sourceImage.height * cos);

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    this.ctx.translate(newWidth / 2, newHeight / 2);
    this.ctx.rotate(rad);
    this.ctx.drawImage(
      sourceImage,
      -sourceImage.width / 2,
      -sourceImage.height / 2
    );
    this.ctx.resetTransform();
  }

  /**
   * 水平反転
   */
  flipHorizontal(sourceImage: HTMLImageElement | HTMLCanvasElement): void {
    this.canvas.width = sourceImage.width;
    this.canvas.height = sourceImage.height;
    this.ctx.translate(this.canvas.width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(sourceImage, 0, 0);
    this.ctx.resetTransform();
  }

  /**
   * 垂直反転
   */
  flipVertical(sourceImage: HTMLImageElement | HTMLCanvasElement): void {
    this.canvas.width = sourceImage.width;
    this.canvas.height = sourceImage.height;
    this.ctx.translate(0, this.canvas.height);
    this.ctx.scale(1, -1);
    this.ctx.drawImage(sourceImage, 0, 0);
    this.ctx.resetTransform();
  }

  /**
   * クロップ（切り抜き）
   */
  crop(
    sourceImage: HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(sourceImage, x, y, width, height, 0, 0, width, height);
  }

  /**
   * せん断変形 (Skew)
   */
  applySkew(
    width: number,
    height: number,
    horizontal: number,
    vertical: number
  ): void {
    const imgData = this.ctx.getImageData(0, 0, width, height);
    const srcData = new Uint8ClampedArray(imgData.data);
    const data = imgData.data;

    const shearX = horizontal * 0.5;
    const shearY = vertical * 0.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cx = x - width / 2;
        const cy = y - height / 2;

        const srcCx = cx - cy * shearX;
        const srcCy = cy - cx * shearY;

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
   * 遠近変形 (Perspective)
   */
  applyPerspective(
    width: number,
    height: number,
    horizontal: number,
    vertical: number
  ): void {
    const imgData = this.ctx.getImageData(0, 0, width, height);
    const srcData = new Uint8ClampedArray(imgData.data);
    const data = imgData.data;

    const perspX = horizontal * 0.002;
    const perspY = vertical * 0.002;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cx = x - width / 2;
        const cy = y - height / 2;

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
   * 自由変形 (Free Transform)
   * 4隅座標による四角形変形
   */
  applyFreeTransform(
    width: number,
    height: number,
    corners: Corners,
    interpolation: InterpolationMethod = 'bilinear'
  ): void {
    const { tl, tr, bl, br } = corners;

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
    const { canvas: tmpCanvas, ctx: tmpCtx } = this.createTempCanvas(outWidth, outHeight);
    const dstData = tmpCtx.createImageData(outWidth, outHeight);
    const dst = dstData.data;

    // 逆変換関数（Newton-Raphson法）
    const inverseProject = (x: number, y: number): { u: number; v: number } | null => {
      let u = 0.5, v = 0.5;

      for (let iter = 0; iter < 10; iter++) {
        const px = (1 - u) * (1 - v) * q0.x + u * (1 - v) * q1.x + u * v * q2.x + (1 - u) * v * q3.x;
        const py = (1 - u) * (1 - v) * q0.y + u * (1 - v) * q1.y + u * v * q2.y + (1 - u) * v * q3.y;

        const dx = x - px;
        const dy = y - py;

        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) break;

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
      return { u: this.clamp(u, 0, 1), v: this.clamp(v, 0, 1) };
    };

    // 各出力ピクセルに対して逆変換
    for (let outY = 0; outY < outHeight; outY++) {
      for (let outX = 0; outX < outWidth; outX++) {
        const uv = inverseProject(outX, outY);
        if (!uv) continue;

        const srcX = uv.u * (width - 1);
        const srcY = uv.v * (height - 1);
        const dstIdx = (outY * outWidth + outX) * 4;

        this.samplePixel(src, width, height, srcX, srcY, dst, dstIdx, interpolation);
      }
    }

    tmpCtx.putImageData(dstData, 0, 0);

    // クリッピングパスを適用
    const { canvas: clipCanvas, ctx: clipCtx } = this.createTempCanvas(outWidth, outHeight);

    clipCtx.beginPath();
    clipCtx.moveTo(q0.x, q0.y);
    clipCtx.lineTo(q1.x, q1.y);
    clipCtx.lineTo(q2.x, q2.y);
    clipCtx.lineTo(q3.x, q3.y);
    clipCtx.closePath();
    clipCtx.clip();
    clipCtx.drawImage(tmpCanvas, 0, 0);

    // メインキャンバスをリサイズして描画
    this.canvas.width = outWidth;
    this.canvas.height = outHeight;
    this.ctx.drawImage(clipCanvas, 0, 0);
  }

  /**
   * ピクセルサンプリング（補間方法選択）
   */
  private samplePixel(
    src: Uint8ClampedArray,
    width: number,
    height: number,
    srcX: number,
    srcY: number,
    dst: Uint8ClampedArray,
    dstIdx: number,
    interpolation: InterpolationMethod
  ): void {
    const x0 = Math.floor(srcX);
    const y0 = Math.floor(srcY);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);

    if (interpolation === 'nearest') {
      const clampedX = Math.max(0, Math.min(width - 1, Math.round(srcX)));
      const clampedY = Math.max(0, Math.min(height - 1, Math.round(srcY)));
      const idx = (clampedY * width + clampedX) * 4;
      for (let c = 0; c < 4; c++) {
        dst[dstIdx + c] = src[idx + c] ?? 0;
      }
    } else if (interpolation === 'average') {
      const idx00 = (y0 * width + x0) * 4;
      const idx01 = (y0 * width + x1) * 4;
      const idx10 = (y1 * width + x0) * 4;
      const idx11 = (y1 * width + x1) * 4;
      for (let c = 0; c < 4; c++) {
        const avg =
          ((src[idx00 + c] ?? 0) +
            (src[idx01 + c] ?? 0) +
            (src[idx10 + c] ?? 0) +
            (src[idx11 + c] ?? 0)) /
          4;
        dst[dstIdx + c] = Math.round(avg);
      }
    } else {
      // bilinear
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
