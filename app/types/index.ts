/**
 * 共通型定義
 */

// ========================================
// UI Types
// ========================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// ========================================
// Image Editor Types
// ========================================

export interface Point {
  x: number;
  y: number;
}

export interface ToneCurvePoint {
  x: number; // 0..1
  y: number; // 0..1
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageInfo extends ImageDimensions {
  format?: string;
  fileSize?: number;
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

export interface TransformParams {
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

export interface ResizeParams {
  width: number;
  height: number;
}

export type OperationType = 
  | 'resize'
  | 'crop'
  | 'transform'
  | 'filters'
  | 'watermark'
  | 'grayscale'
  | 'sepia';

export interface AppliedOperation {
  type: OperationType;
  params: Record<string, any>;
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
