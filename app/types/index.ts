/**
 * 共通型定義
 * 全コンポーネント・サービスはこのファイルから型をインポートする
 */

// ========================================
// UI Types
// ========================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// ========================================
// Geometry Types
// ========================================

/** 2D座標点 */
export interface Point {
  x: number;
  y: number;
}

/** 変形用コーナー座標（正規化: 0-1） */
export interface Corner {
  x: number;
  y: number;
}

/** 四隅座標（変形用） */
export interface Corners {
  tl: Corner;
  tr: Corner;
  bl: Corner;
  br: Corner;
}

/** 矩形領域 */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 画像サイズ */
export interface ImageDimensions {
  width: number;
  height: number;
}

/** 画像情報 */
export interface ImageInfo extends ImageDimensions {
  format?: string;
  fileSize?: number;
}

// ========================================
// Transform Types
// ========================================

/** 変形モード */
export type TransformMode = 'free' | 'scale' | 'perspective' | 'skew' | 'rotate';

/** 補間方法 */
export type InterpolationMethod = 'nearest' | 'bilinear' | 'average';

/** アンカー位置（9点グリッド） */
export type AnchorPosition = 'tl' | 't' | 'tr' | 'l' | 'c' | 'r' | 'bl' | 'b' | 'br';

/** 自由変形パラメータ */
export interface FreeTransformParams extends Corners {
  // Cornersを継承
}

/** スキュー（平行ゆがみ）パラメータ */
export interface SkewParams {
  horizontal: number;
  vertical: number;
}

/** パース（遠近ゆがみ）パラメータ */
export interface PerspectiveParams {
  horizontal: number;
  vertical: number;
}

/** 基本変形パラメータ */
export interface TransformParams {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

/** リサイズパラメータ */
export interface ResizeParams {
  width: number;
  height: number;
}

// ========================================
// Tone Curve Types
// ========================================

export interface ToneCurvePoint {
  x: number; // 0..1
  y: number; // 0..1
}

// ========================================
// Watermark Types
// ========================================

export type WatermarkType = 'none' | 'text' | 'image';
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
export type WatermarkMode = 'single' | 'pattern';

export interface WatermarkParams {
  type: WatermarkType;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  position: WatermarkPosition;
  offsetX: number;
  offsetY: number;
  imageDataURL: string;
  scale: number;
  mode: WatermarkMode;
  rotation: number;
  spacingX: number;
  spacingY: number;
  anchorX?: number | null;
  anchorY?: number | null;
}

// ========================================
// Image Operations
// ========================================

export interface FilterParams {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
  gamma: number;
  grayscale?: boolean;
  sepia?: boolean;
  toneCurvePoints?: ToneCurvePoint[];
}

// ========================================
// Advanced Filter Types
// ========================================

/** ポスタライズ（諧調化）パラメータ */
export interface PosterizeParams {
  levels: number; // 2-256
}

/** レベル補正パラメータ */
export interface LevelsParams {
  inputBlack: number;  // 0-255
  inputWhite: number;  // 0-255
  outputBlack: number; // 0-255
  outputWhite: number; // 0-255
  gamma: number;       // 0.1-10
}

/** カラーバランスパラメータ */
export interface ColorBalanceParams {
  shadows: { cyan: number; magenta: number; yellow: number };    // -100 to 100
  midtones: { cyan: number; magenta: number; yellow: number };   // -100 to 100
  highlights: { cyan: number; magenta: number; yellow: number }; // -100 to 100
}

/** 2値化パラメータ */
export interface ThresholdParams {
  threshold: number; // 0-255
}

/** シャープパラメータ */
export interface SharpenParams {
  amount: number;  // 0-500 (%)
  radius: number;  // 0.1-10 (px)
}

/** えんぴつ調（スケッチ）パラメータ */
export interface SketchParams {
  intensity: number; // 0-100
  invert: boolean;   // 白背景黒線 or 黒背景白線
}

/** 色収差パラメータ */
export interface ChromaticAberrationParams {
  offsetX: number; // -50 to 50 (px)
  offsetY: number; // -50 to 50 (px)
}

// ========================================
// Operation Types
// ========================================

export type OperationType = 
  | 'resize'
  | 'crop'
  | 'transform'
  | 'filters'
  | 'watermark'
  | 'grayscale'
  | 'sepia'
  | 'advancedTransform';

export interface AppliedOperation {
  type: OperationType;
  params: Record<string, unknown>;
}

// ========================================
// Image Processing Options
// ========================================

export interface ImageOps {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
  gamma: number;
  grayscale: boolean;
  sepia: boolean;
  toneCurvePoints: ToneCurvePoint[];
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  resizeWidth: number | null;
  resizeHeight: number | null;
  crop: CropRect | null;
  watermark: WatermarkParams;
}

// ========================================
// Aspect Ratio
// ========================================

export type AspectRatioPreset = 'free' | '1:1' | '4:3' | '16:9' | '3:2' | '2:3';

export const ASPECT_RATIO_MAP: Record<AspectRatioPreset, number | null> = {
  'free': null,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '3:2': 3 / 2,
  '2:3': 2 / 3,
};

// ========================================
// Export Types
// ========================================

export type ExportFormat = 'jpeg' | 'png' | 'webp';

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
  filename: string;
}
