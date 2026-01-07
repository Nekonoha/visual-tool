/**
 * Lanczos補間を使った高品質な画像リサイズ
 */
export class LanczosResampler {
  private lobes: number;

  constructor(lobes: number = 3) {
    this.lobes = lobes;
  }

  /**
   * Lanczosカーネル関数
   */
  private lanczos(x: number): number {
    if (x === 0) return 1;
    if (x <= -this.lobes || x >= this.lobes) return 0;
    
    const xPi = x * Math.PI;
    return (Math.sin(xPi) / xPi) * (Math.sin(xPi / this.lobes) / (xPi / this.lobes));
  }

  /**
   * 画像をLanczos補間でリサイズ
   */
  async resample(
    sourceCanvas: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number
  ): Promise<HTMLCanvasElement> {
    const srcWidth = sourceCanvas.width;
    const srcHeight = sourceCanvas.height;

    // ソース画像データを取得
    const srcCtx = sourceCanvas.getContext('2d');
    if (!srcCtx) throw new Error('Cannot get source context');
    
    const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
    const srcPixels = srcData.data;

    // ターゲットキャンバスを作成
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
    
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) throw new Error('Cannot get target context');
    
    const targetData = targetCtx.createImageData(targetWidth, targetHeight);
    const targetPixels = targetData.data;

    // スケール比を計算
    const xRatio = srcWidth / targetWidth;
    const yRatio = srcHeight / targetHeight;

    // 各ターゲットピクセルを計算
    for (let ty = 0; ty < targetHeight; ty++) {
      for (let tx = 0; tx < targetWidth; tx++) {
        // ソース座標を計算
        const sx = (tx + 0.5) * xRatio;
        const sy = (ty + 0.5) * yRatio;

        // カーネルの範囲を計算
        const sxStart = Math.max(0, Math.floor(sx - this.lobes));
        const sxEnd = Math.min(srcWidth - 1, Math.ceil(sx + this.lobes));
        const syStart = Math.max(0, Math.floor(sy - this.lobes));
        const syEnd = Math.min(srcHeight - 1, Math.ceil(sy + this.lobes));

        let r = 0, g = 0, b = 0, a = 0;
        let weightSum = 0;

        // カーネル範囲内の各ピクセルを処理
        for (let ksy = syStart; ksy <= syEnd; ksy++) {
          const yWeight = this.lanczos(sy - ksy);
          
          for (let ksx = sxStart; ksx <= sxEnd; ksx++) {
            const xWeight = this.lanczos(sx - ksx);
            const weight = xWeight * yWeight;

            const srcIndex = (ksy * srcWidth + ksx) * 4;
            
            r += srcPixels[srcIndex] * weight;
            g += srcPixels[srcIndex + 1] * weight;
            b += srcPixels[srcIndex + 2] * weight;
            a += srcPixels[srcIndex + 3] * weight;
            
            weightSum += weight;
          }
        }

        // 正規化して書き込み
        const targetIndex = (ty * targetWidth + tx) * 4;
        targetPixels[targetIndex] = Math.round(r / weightSum);
        targetPixels[targetIndex + 1] = Math.round(g / weightSum);
        targetPixels[targetIndex + 2] = Math.round(b / weightSum);
        targetPixels[targetIndex + 3] = Math.round(a / weightSum);
      }
    }

    targetCtx.putImageData(targetData, 0, 0);
    return targetCanvas;
  }

  /**
   * 画像ファイルを高品質リサイズ
   */
  async resizeImage(
    file: File,
    maxWidth: number,
    maxHeight: number,
    maintainAspect: boolean = true
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = async () => {
          try {
            let targetWidth = maxWidth;
            let targetHeight = maxHeight;

            if (maintainAspect) {
              const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
              if (ratio < 1) {
                targetWidth = Math.round(img.width * ratio);
                targetHeight = Math.round(img.height * ratio);
              } else {
                targetWidth = img.width;
                targetHeight = img.height;
              }
            }

            // ソースキャンバスを作成
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = img.width;
            sourceCanvas.height = img.height;
            const sourceCtx = sourceCanvas.getContext('2d');
            if (!sourceCtx) throw new Error('Cannot get source context');
            sourceCtx.drawImage(img, 0, 0);

            // Lanczos補間でリサイズ
            const targetCanvas = await this.resample(sourceCanvas, targetWidth, targetHeight);

            // Blobに変換
            targetCanvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            }, 'image/png');
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}

/**
 * バイキュービック補間（Lanczosより高速だが品質はやや劣る）
 */
export class BicubicResampler {
  /**
   * キュービック補間カーネル
   */
  private cubic(x: number): number {
    const absX = Math.abs(x);
    if (absX <= 1) {
      return 1.5 * absX * absX * absX - 2.5 * absX * absX + 1;
    } else if (absX < 2) {
      return -0.5 * absX * absX * absX + 2.5 * absX * absX - 4 * absX + 2;
    }
    return 0;
  }

  /**
   * 画像をバイキュービック補間でリサイズ
   */
  async resample(
    sourceCanvas: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number
  ): Promise<HTMLCanvasElement> {
    const srcWidth = sourceCanvas.width;
    const srcHeight = sourceCanvas.height;

    const srcCtx = sourceCanvas.getContext('2d');
    if (!srcCtx) throw new Error('Cannot get source context');
    
    const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
    const srcPixels = srcData.data;

    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
    
    const targetCtx = targetCanvas.getContext('2d');
    if (!targetCtx) throw new Error('Cannot get target context');
    
    const targetData = targetCtx.createImageData(targetWidth, targetHeight);
    const targetPixels = targetData.data;

    const xRatio = srcWidth / targetWidth;
    const yRatio = srcHeight / targetHeight;

    for (let ty = 0; ty < targetHeight; ty++) {
      for (let tx = 0; tx < targetWidth; tx++) {
        const sx = (tx + 0.5) * xRatio;
        const sy = (ty + 0.5) * yRatio;

        const sxStart = Math.max(0, Math.floor(sx - 2));
        const sxEnd = Math.min(srcWidth - 1, Math.ceil(sx + 2));
        const syStart = Math.max(0, Math.floor(sy - 2));
        const syEnd = Math.min(srcHeight - 1, Math.ceil(sy + 2));

        let r = 0, g = 0, b = 0, a = 0;
        let weightSum = 0;

        for (let ksy = syStart; ksy <= syEnd; ksy++) {
          const yWeight = this.cubic(sy - ksy);
          
          for (let ksx = sxStart; ksx <= sxEnd; ksx++) {
            const xWeight = this.cubic(sx - ksx);
            const weight = xWeight * yWeight;

            const srcIndex = (ksy * srcWidth + ksx) * 4;
            
            r += srcPixels[srcIndex] * weight;
            g += srcPixels[srcIndex + 1] * weight;
            b += srcPixels[srcIndex + 2] * weight;
            a += srcPixels[srcIndex + 3] * weight;
            
            weightSum += weight;
          }
        }

        const targetIndex = (ty * targetWidth + tx) * 4;
        targetPixels[targetIndex] = Math.max(0, Math.min(255, Math.round(r / weightSum)));
        targetPixels[targetIndex + 1] = Math.max(0, Math.min(255, Math.round(g / weightSum)));
        targetPixels[targetIndex + 2] = Math.max(0, Math.min(255, Math.round(b / weightSum)));
        targetPixels[targetIndex + 3] = Math.max(0, Math.min(255, Math.round(a / weightSum)));
      }
    }

    targetCtx.putImageData(targetData, 0, 0);
    return targetCanvas;
  }
}
