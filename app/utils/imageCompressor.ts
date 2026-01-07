// 画像圧縮ユーティリティ
export class ImageCompressor {
  /**
   * 画像を圧縮
   */
  static async compress(
    file: File,
    options: {
      quality?: number; // 0-1
      maxWidth?: number;
      maxHeight?: number;
      format?: 'jpeg' | 'png' | 'webp';
      maintainAspect?: boolean;
      resampleMethod?: 'lanczos' | 'bicubic' | 'bilinear';
    } = {}
  ): Promise<Blob> {
    const { 
      quality = 0.8, 
      maxWidth, 
      maxHeight, 
      format = 'jpeg', 
      maintainAspect = true,
      resampleMethod = 'bilinear' 
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = async () => {
          try {
            let { width, height } = img;

            // リサイズ処理
            const needsResize = maxWidth || maxHeight;
            if (needsResize) {
              if (maintainAspect) {
                const ratio = Math.min(
                  maxWidth ? maxWidth / width : Infinity,
                  maxHeight ? maxHeight / height : Infinity
                );
                if (ratio < 1) {
                  width = Math.round(width * ratio);
                  height = Math.round(height * ratio);
                }
              } else {
                width = maxWidth || width;
                height = maxHeight || height;
              }
            }

            let canvas: HTMLCanvasElement;

            // 高品質リサイズが必要な場合
            if (needsResize && (resampleMethod === 'lanczos' || resampleMethod === 'bicubic')) {
              const { LanczosResampler, BicubicResampler } = await import('./advancedResampler');
              
              // ソースキャンバスを作成
              const sourceCanvas = document.createElement('canvas');
              sourceCanvas.width = img.width;
              sourceCanvas.height = img.height;
              const sourceCtx = sourceCanvas.getContext('2d');
              if (!sourceCtx) throw new Error('Canvas context not available');
              sourceCtx.drawImage(img, 0, 0);

              // リサンプラーを選択
              if (resampleMethod === 'lanczos') {
                const resampler = new LanczosResampler(3);
                canvas = await resampler.resample(sourceCanvas, width, height);
              } else {
                const resampler = new BicubicResampler();
                canvas = await resampler.resample(sourceCanvas, width, height);
              }
            } else {
              // 標準のバイリニア補間
              canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('Canvas context not available');

              // 高品質描画設定
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              // 描画
              ctx.drawImage(img, 0, 0, width, height);
            }

            // フォーマット変換
            const mimeType = `image/${format}`;

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Failed to compress image'));
                }
              },
              mimeType,
              quality
            );
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

  /**
   * ファイル形式を変換
   */
  static async convert(file: File, targetFormat: 'jpeg' | 'png' | 'webp'): Promise<Blob> {
    return this.compress(file, {
      quality: 1.0,
      format: targetFormat,
    });
  }

  /**
   * ファイルサイズの推定
   */
  static estimateSize(originalSize: number, quality: number): number {
    // 簡易的な推定式
    return Math.round(originalSize * quality);
  }
}
