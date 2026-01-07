<template>
  <div class="page-editor">
    <div class="page-header">
      <h1 class="page-title">画像編集</h1>
      <p class="page-description">リサイズ、クロップ、回転、フィルターなど多彩な編集機能</p>
    </div>

    <div class="editor">
      <div class="editor__container">
        <!-- メインエディタエリア -->
        <div class="editor__preview-section">
          <div class="editor__preview-header">
            <h2 class="editor__preview-title">プレビュー</h2>
            <div class="editor__preview-actions">
              <Button
                variant="outline"
                size="sm"
                :disabled="!imageStore.hasImage"
                @click="handleResetOps"
              >
                操作リセット
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="!imageStore.hasImage"
                @click="handleClearImage"
              >
                画像を消す
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="!imageStore.canUndo"
                @click="handleUndo"
              >
                一手戻る
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="!imageStore.canRedo"
                @click="handleRedo"
              >
                一手進む
              </Button>
              <Button
                variant="primary"
                size="sm"
                @click="handleDownload"
                :disabled="!imageStore.hasImage"
                :loading="imageStore.isProcessing"
              >
                ダウンロード
              </Button>
            </div>
          </div>

          <InteractiveCrop
            v-if="cropMode && imageStore.hasImage"
            :src="imageStore.processedDataURL"
            v-model:crop-x="cropX"
            v-model:crop-y="cropY"
            v-model:crop-width="cropWidth"
            v-model:crop-height="cropHeight"
            :image-width="imageStore.imageInfo?.width"
            :image-height="imageStore.imageInfo?.height"
            @crop-change="handleInteractiveCropChange"
          />
          <ImagePreview
            v-else
            :src="imageStore.processedDataURL"
            :image-size="imageStore.imageSize"
            title="プレビュー"
          />
          <div v-if="!imageStore.hasImage" class="editor__upload-hint">
            <FileInput @file-selected="handleFileSelected" />
            <p class="hint">画像をアップロードすると右の操作パネルで編集できます。</p>
          </div>
        </div>

        <!-- サイドバー - ツールパネル -->
        <div class="editor__sidebar">
          <div class="editor__tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              :class="['editor__tab', { 'editor__tab--active': activeTab === tab.id }]"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="editor__tools">
            <!-- リサイズタブ -->
            <ToolPanel v-if="activeTab === 'resize'" title="リサイズ" :show-close="false">
              <template #default>
                <section class="panel-section">
                  <div class="panel-section__content">
                    <div class="tool-group">
                      <label class="tool-label">スケール (%)</label>
                      <Slider
                        v-model="scalePercent"
                        :min="10"
                        :max="200"
                        :step="1"
                        unit="%"
                        :disabled="!imageStore.hasImage"
                        @update:modelValue="handleScaleChange"
                      />
                    </div>
                    <div class="tool-grid tool-grid--2">
                      <label class="tool-label">
                        幅 (px)
                        <input
                          v-model.number="resizeWidth"
                          type="number"
                          class="tool-input"
                          :disabled="!imageStore.hasImage"
                          @input="updateResizeDimensions"
                        />
                      </label>
                      <label class="tool-label">
                        高さ (px)
                        <input
                          v-model.number="resizeHeight"
                          type="number"
                          class="tool-input"
                          :disabled="!imageStore.hasImage"
                          @input="updateResizeDimensions"
                        />
                      </label>
                    </div>
                    <label class="tool-checkbox">
                      <input v-model="maintainAspect" type="checkbox" :disabled="!imageStore.hasImage" />
                      <span>アスペクト比を保持</span>
                    </label>
                  </div>
                </section>
              </template>
            </ToolPanel>

            <!-- クロップタブ -->
            <ToolPanel v-if="activeTab === 'crop'" title="クロップ" :show-close="false">
              <template #default>
                <section class="panel-section">
                  <div class="panel-section__content">
                    <div class="tool-group">
                      <label class="tool-label">プリセット</label>
                      <div class="chip-row">
                        <button
                          v-for="preset in ['free','1:1','4:3','16:9']"
                          :key="preset"
                          type="button"
                          :class="['chip', { 'chip--active': cropAspect === preset }]"
                          :disabled="!imageStore.hasImage"
                          @click="handleCropPreset(preset as 'free' | '1:1' | '4:3' | '16:9')"
                        >
                          {{ preset === 'free' ? 'フリー' : preset }}
                        </button>
                      </div>
                    </div>
                    <div class="tool-group">
                      <label class="tool-label">サイズ (%)</label>
                      <Slider
                        v-model="cropSizePercent"
                        :min="5"
                        :max="100"
                        :step="1"
                        unit="%"
                        :disabled="!imageStore.hasImage"
                        @update:modelValue="handleCropSizePercent"
                      />
                    </div>
                    <div class="tool-button-group">
                      <Button
                        variant="primary"
                        size="sm"
                        full-width
                        :disabled="!imageStore.hasImage"
                        @click="handleCropApply"
                      >
                        クロップを適用
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        full-width
                        :disabled="!imageStore.hasImage"
                        @click="handleCropReset"
                      >
                        リセット
                      </Button>
                    </div>
                  </div>
                </section>
              </template>
            </ToolPanel>

            <!-- 回転・反転タブ -->
            <ToolPanel v-if="activeTab === 'transform'" title="回転・反転" :show-close="false">
              <template #default>
                <section class="panel-section">
                  <div class="panel-section__content">
                    <div class="tool-group">
                      <label class="tool-label">回転 (度)</label>
                      <Slider
                        v-model="rotationDegrees"
                        :min="0"
                        :max="360"
                        :step="1"
                        unit="°"
                        :disabled="!imageStore.hasImage"
                        @update:modelValue="handleRotateRealtime"
                        @drag-end="handleRotateCommit"
                      />
                    </div>
                    <div class="tool-button-group">
                      <Button
                        variant="outline"
                        size="sm"
                        full-width
                        @click="handleFlipHorizontal"
                        :disabled="!imageStore.hasImage"
                      >
                        水平反転
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        full-width
                        @click="handleFlipVertical"
                        :disabled="!imageStore.hasImage"
                      >
                        垂直反転
                      </Button>
                    </div>
                  </div>
                </section>
              </template>
            </ToolPanel>

            <!-- フィルタータブ -->
            <ToolPanel v-if="activeTab === 'filters'" title="色・効果" :show-close="false">
              <template #default>
                <section class="panel-section">
                  <div class="panel-section__content">
                    <div class="filters-grid">
                      <div class="tool-group">
                        <label class="tool-label">明度</label>
                        <Slider
                          v-model="brightness"
                          :min="0"
                          :max="200"
                          :step="1"
                          unit="%"
                          :disabled="!imageStore.hasImage"
                          @update:modelValue="applyFiltersRealtime"
                          @drag-end="handleFiltersCommit"
                        />
                      </div>
                      <div class="tool-group">
                        <label class="tool-label">コントラスト</label>
                        <Slider
                          v-model="contrast"
                          :min="0"
                          :max="200"
                          :step="1"
                          unit="%"
                          :disabled="!imageStore.hasImage"
                          @update:modelValue="applyFiltersRealtime"
                          @drag-end="handleFiltersCommit"
                        />
                      </div>
                      <div class="tool-group">
                        <label class="tool-label">彩度</label>
                        <Slider
                          v-model="saturation"
                          :min="0"
                          :max="200"
                          :step="1"
                          unit="%"
                          :disabled="!imageStore.hasImage"
                          @update:modelValue="applyFiltersRealtime"
                          @drag-end="handleFiltersCommit"
                        />
                      </div>
                      <div class="tool-group">
                        <label class="tool-label">ガンマ</label>
                        <Slider
                          v-model="gamma"
                          :min="10"
                          :max="300"
                          :step="1"
                          unit="%"
                          :disabled="!imageStore.hasImage"
                          @update:modelValue="applyFiltersRealtime"
                          @drag-end="handleFiltersCommit"
                        />
                      </div>
                      <div class="tool-group">
                        <label class="tool-label">色相</label>
                        <Slider
                          v-model="hue"
                          :min="0"
                          :max="360"
                          :step="1"
                          unit="°"
                          :disabled="!imageStore.hasImage"
                          @update:modelValue="applyFiltersRealtime"
                          @drag-end="handleFiltersCommit"
                        />
                      </div>
                      <div class="tool-group">
                        <label class="tool-label">ぼかし</label>
                        <Slider
                          v-model="blurAmount"
                          :min="0"
                          :max="20"
                          :step="1"
                          unit="px"
                          :disabled="!imageStore.hasImage"
                          @update:modelValue="applyFiltersRealtime"
                          @drag-end="handleFiltersCommit"
                        />
                      </div>
                    </div>
                    <div class="filter-actions">
                      <div class="tool-button-group">
                        <Button
                          variant="outline"
                          size="sm"
                          full-width
                          @click="handleGrayscale"
                          :disabled="!imageStore.hasImage"
                        >
                          グレースケール
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          full-width
                          @click="handleSepia"
                          :disabled="!imageStore.hasImage"
                        >
                          セピア
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          full-width
                          @click="showToneCurve = true"
                          :disabled="!imageStore.hasImage"
                        >
                          トーンカーブ
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              </template>
            </ToolPanel>

            <!-- 透かしタブ -->
            <ToolPanel v-if="activeTab === 'watermark'" title="透かし" :show-close="false">
              <template #default>
                <section class="panel-section">
                  <div class="panel-section__content">
                    <div class="tool-group">
                      <label class="tool-label">種別</label>
                      <div class="chip-row">
                        <button
                          v-for="type in ['none','text','image']"
                          :key="type"
                          type="button"
                          :class="['chip', { 'chip--active': watermarkType === type }]"
                          :disabled="!imageStore.hasImage"
                          @click="setWatermarkType(type as 'none' | 'text' | 'image')"
                        >
                          {{ type === 'none' ? 'なし' : type === 'text' ? 'テキスト' : '画像' }}
                        </button>
                      </div>
                    </div>

                    <div v-if="watermarkType === 'text'" class="tool-group">
                      <label class="tool-label">テキスト</label>
                      <input
                        v-model="watermarkText"
                        type="text"
                        class="tool-input"
                        :disabled="!imageStore.hasImage"
                        @input="applyRealtimeOps"
                      />
                    </div>

                    <div v-if="watermarkType === 'text'" class="tool-group">
                      <label class="tool-label">フォントサイズ</label>
                      <Slider
                        v-model="watermarkFontSize"
                        :min="8"
                        :max="120"
                        :step="1"
                        unit="px"
                        :disabled="!imageStore.hasImage"
                        @update:modelValue="applyRealtimeOps"
                      />
                    </div>

                    <div v-if="watermarkType === 'text'" class="tool-group">
                      <label class="tool-label">色</label>
                      <input
                        v-model="watermarkColor"
                        type="color"
                        class="tool-input"
                        :disabled="!imageStore.hasImage"
                        @input="applyRealtimeOps"
                      />
                    </div>

                    <div class="tool-group">
                      <label class="tool-label">不透明度</label>
                      <Slider
                        v-model="watermarkOpacity"
                        :min="0"
                        :max="100"
                        :step="1"
                        unit="%"
                        :disabled="!imageStore.hasImage"
                        @update:modelValue="applyRealtimeOps"
                      />
                    </div>

                    <div class="tool-group">
                      <label class="tool-label">位置</label>
                      <select
                        v-model="watermarkPosition"
                        class="tool-select"
                        :disabled="!imageStore.hasImage"
                        @change="applyRealtimeOps"
                      >
                        <option value="bottom-right">右下</option>
                        <option value="bottom-left">左下</option>
                        <option value="top-right">右上</option>
                        <option value="top-left">左上</option>
                        <option value="center">中央</option>
                      </select>
                    </div>

                    <div class="tool-grid tool-grid--2">
                      <label class="tool-label">
                        オフセットX (px)
                        <input
                          v-model.number="watermarkOffsetX"
                          type="number"
                          class="tool-input"
                          :disabled="!imageStore.hasImage"
                          @input="applyRealtimeOps"
                        />
                      </label>
                      <label class="tool-label">
                        オフセットY (px)
                        <input
                          v-model.number="watermarkOffsetY"
                          type="number"
                          class="tool-input"
                          :disabled="!imageStore.hasImage"
                          @input="applyRealtimeOps"
                        />
                      </label>
                    </div>

                    <div v-if="watermarkType === 'image'" class="tool-group">
                      <label class="tool-label">透かし画像</label>
                      <input
                        type="file"
                        accept="image/*"
                        class="tool-input"
                        :disabled="!imageStore.hasImage"
                        @change="handleWatermarkImageSelect"
                      />
                      <p v-if="watermarkImageName" class="tool-hint">{{ watermarkImageName }} を使用中</p>
                    </div>

                    <div v-if="watermarkType === 'image'" class="tool-group">
                      <label class="tool-label">スケール</label>
                      <Slider
                        v-model="watermarkScale"
                        :min="5"
                        :max="200"
                        :step="1"
                        unit="%"
                        :disabled="!imageStore.hasImage || !watermarkImageDataURL"
                        @update:modelValue="applyRealtimeOps"
                      />
                    </div>

                    <div class="tool-button-group">
                      <Button
                        variant="primary"
                        size="sm"
                        full-width
                        :disabled="!imageStore.hasImage"
                        @click="handleWatermarkApply"
                      >
                        透かしを適用
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        full-width
                        :disabled="!imageStore.hasImage"
                        @click="handleWatermarkReset"
                      >
                        リセット
                      </Button>
                    </div>
                  </div>
                </section>
              </template>
            </ToolPanel>
          </div>
        </div>
      </div>
    </div>
    
    <!-- トーンカーブモーダル -->
    <ToneCurveModal
      v-if="showToneCurve"
      v-model="toneCurvePoints"
      @update:modelValue="handleToneCurveUpdate"
      @preview="handleToneCurvePreview"
      @apply="handleToneCurveApply"
      @close="showToneCurve = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import FileInput from '~/components/FileInput.vue';
import ImagePreview from '~/components/ImagePreview.vue';
import InteractiveCrop from '~/components/InteractiveCrop.vue';
import Button from '~/components/Button.vue';
import Slider from '~/components/Slider.vue';
import ToolPanel from '~/components/ToolPanel.vue';
import ToneCurveModal from '~/components/ToneCurveModal.vue';
import { useImageStore } from '~/stores/image';

interface ToneCurvePoint {
  x: number;
  y: number;
}

definePageMeta({
  layout: 'default',
});

const isServer = typeof window === 'undefined';
// SSRガード: サーバーレンダリング時はスタブを返してクラッシュを防ぐ
const imageStore = isServer
  ? ({ hasImage: false, imageInfo: null } as unknown as ReturnType<typeof useImageStore>)
  : useImageStore();

const tabs = [
  { id: 'resize', label: 'リサイズ' },
  { id: 'crop', label: 'クロップ' },
  { id: 'transform', label: '回転・反転' },
  { id: 'filters', label: '色・効果' },
  { id: 'watermark', label: '透かし' },
];

const activeTab = ref('resize');
const cropMode = computed(() => activeTab.value === 'crop');

// リサイズ
const resizeWidth = ref(0);
const resizeHeight = ref(0);
const maintainAspect = ref(true);
const scalePercent = ref(100);

// クロップ
const cropX = ref(0);
const cropY = ref(0);
const cropWidth = ref(0);
const cropHeight = ref(0);
const cropSizePercent = ref(100);
const cropAspect = ref<'free' | '1:1' | '4:3' | '16:9'>('free');

// 回転
const rotationDegrees = ref(0);

// フィルター
const brightness = ref(100);
const contrast = ref(100);
const saturation = ref(100);
const blurAmount = ref(0);
const hue = ref(0);
const gamma = ref(100);
const toneCurvePoints = ref<ToneCurvePoint[]>([
  { x: 0, y: 0 },
  { x: 0.33, y: 0.33 },
  { x: 0.66, y: 0.66 },
  { x: 1, y: 1 },
]);
const showToneCurve = ref(false);

// 透かし
const watermarkType = ref<'none' | 'text' | 'image'>('none');
const watermarkText = ref('Sample Watermark');
const watermarkFontSize = ref(32);
const watermarkColor = ref('#ffffff');
const watermarkOpacity = ref(50);
const watermarkPosition = ref<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('bottom-right');
const watermarkOffsetX = ref(24);
const watermarkOffsetY = ref(24);
const watermarkScale = ref(30);
const watermarkImageDataURL = ref<string | null>(null);
const watermarkImageName = ref('');

// ファイル選択
const handleFileSelected = async (file: File) => {
  await imageStore.loadImage(file);
  if (imageStore.imageInfo) {
    syncUIFromOps();
  }
};

// リサイズハンドラ
const updateResizeDimensions = () => {
  if (maintainAspect.value && imageStore.imageInfo) {
    const ratio = imageStore.imageInfo.aspectRatio;
    resizeHeight.value = Math.round(resizeWidth.value / ratio);
  }
  if (imageStore.imageInfo && imageStore.imageInfo.width) {
    scalePercent.value = Math.round((resizeWidth.value / imageStore.imageInfo.width) * 100);
  }
  applyRealtimeOps();
};

const handleScaleChange = (val: number) => {
  if (!imageStore.imageInfo) return;
  const factor = val / 100;
  resizeWidth.value = Math.max(1, Math.round(imageStore.imageInfo.width * factor));
  resizeHeight.value = Math.max(1, Math.round(imageStore.imageInfo.height * factor));
  scalePercent.value = val;
  applyRealtimeOps();
};

// クロップハンドラ
const applyCenteredCrop = (ratio: number | null, sizePercent: number) => {
  if (!imageStore.imageInfo) return;
  const baseW = imageStore.imageInfo.width;
  const baseH = imageStore.imageInfo.height;
  let w = baseW;
  let h = baseH;
  if (ratio) {
    if (baseW / baseH > ratio) {
      h = baseH;
      w = Math.round(h * ratio);
    } else {
      w = baseW;
      h = Math.round(w / ratio);
    }
  }
  const factor = Math.max(1, Math.min(100, sizePercent)) / 100;
  w = Math.max(1, Math.round(w * factor));
  h = Math.max(1, Math.round(h * factor));
  const x = Math.max(0, Math.round((baseW - w) / 2));
  const y = Math.max(0, Math.round((baseH - h) / 2));
  cropX.value = x;
  cropY.value = y;
  cropWidth.value = w;
  cropHeight.value = h;
};

const handleCropPreset = (preset: 'free' | '1:1' | '4:3' | '16:9') => {
  cropAspect.value = preset;
  const ratioMap = { free: null, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };
  applyCenteredCrop(ratioMap[preset], cropSizePercent.value);
};

const handleCropSizePercent = (val: number) => {
  cropSizePercent.value = val;
  const ratioMap = { free: null, '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };
  applyCenteredCrop(ratioMap[cropAspect.value], val);
};

const handleCropApply = () => {
  if (!imageStore.hasImage) return;
  imageStore.applyFiltersRealtime({
    brightness: brightness.value,
    contrast: contrast.value,
    saturation: saturation.value,
    blur: blurAmount.value,
    hue: hue.value,
    gamma: gamma.value / 100,
    toneCurvePoints: toneCurvePoints.value,
    crop: { x: cropX.value, y: cropY.value, width: cropWidth.value, height: cropHeight.value },
    resizeWidth: resizeWidth.value !== imageStore.imageInfo?.width ? resizeWidth.value : null,
    resizeHeight: resizeHeight.value !== imageStore.imageInfo?.height ? resizeHeight.value : null,
  });
  imageStore.commitOpsHistory();
  activeTab.value = 'resize';
};

const handleCropReset = () => {
  if (!imageStore.imageInfo) return;
  cropX.value = 0;
  cropY.value = 0;
  cropWidth.value = imageStore.imageInfo.width;
  cropHeight.value = imageStore.imageInfo.height;
  cropSizePercent.value = 100;
  cropAspect.value = 'free';
};

const handleInteractiveCropChange = (crop: { x: number; y: number; width: number; height: number }) => {
  cropX.value = crop.x;
  cropY.value = crop.y;
  cropWidth.value = crop.width;
  cropHeight.value = crop.height;
};

// 回転ハンドラ
const handleRotateRealtime = async () => {
  if (!imageStore.hasImage) return;
  await imageStore.rotate(rotationDegrees.value);
};

const handleRotateCommit = () => {
  imageStore.commitOpsHistory();
};

const handleFlipHorizontal = async () => {
  await imageStore.flipHorizontal();
};

const handleFlipVertical = async () => {
  await imageStore.flipVertical();
};

// フィルターハンドラ
const applyFiltersRealtime = () => {
  applyRealtimeOps();
};

const handleFiltersCommit = () => {
  imageStore.commitOpsHistory();
};

const handleGrayscale = async () => {
  await imageStore.grayscale();
};

const handleSepia = async () => {
  await imageStore.sepia();
};

const handleToneCurvePreview = (points: ToneCurvePoint[]) => {
  toneCurvePoints.value = points;
  applyRealtimeOps();
};

const handleToneCurveUpdate = (points: ToneCurvePoint[]) => {
  toneCurvePoints.value = points;
  applyRealtimeOps();
};

const handleToneCurveApply = (points: ToneCurvePoint[]) => {
  toneCurvePoints.value = points;
  applyRealtimeOps();
  imageStore.commitOpsHistory();
  showToneCurve.value = false;
};

const handleWatermarkImageSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read watermark image'));
    reader.readAsDataURL(file);
  });
  watermarkImageDataURL.value = dataURL;
  watermarkImageName.value = file.name;
  watermarkType.value = 'image';
  applyRealtimeOps();
};

const handleWatermarkReset = () => {
  watermarkType.value = 'none';
  watermarkText.value = 'Sample Watermark';
  watermarkFontSize.value = 32;
  watermarkColor.value = '#ffffff';
  watermarkOpacity.value = 50;
  watermarkPosition.value = 'bottom-right';
  watermarkOffsetX.value = 24;
  watermarkOffsetY.value = 24;
  watermarkScale.value = 30;
  watermarkImageDataURL.value = null;
  watermarkImageName.value = '';
  applyRealtimeOps();
  imageStore.commitOpsHistory();
};

const handleWatermarkApply = () => {
  applyRealtimeOps();
  imageStore.commitOpsHistory();
};

const setWatermarkType = (type: 'none' | 'text' | 'image') => {
  watermarkType.value = type;
  applyRealtimeOps();
};

// 統合リアルタイムプレビュー
const applyRealtimeOps = () => {
  if (!imageStore.hasImage) return;
  const shouldApplyCrop = !cropMode.value && (cropX.value > 0 || cropY.value > 0 || cropWidth.value !== imageStore.imageInfo?.width || cropHeight.value !== imageStore.imageInfo?.height);
  imageStore.applyFiltersRealtime({
    brightness: brightness.value,
    contrast: contrast.value,
    saturation: saturation.value,
    blur: blurAmount.value,
    hue: hue.value,
    gamma: gamma.value / 100,
    toneCurvePoints: toneCurvePoints.value,
    crop: shouldApplyCrop ? { x: cropX.value, y: cropY.value, width: cropWidth.value, height: cropHeight.value } : null,
    resizeWidth: resizeWidth.value !== imageStore.imageInfo?.width ? resizeWidth.value : null,
    resizeHeight: resizeHeight.value !== imageStore.imageInfo?.height ? resizeHeight.value : null,
    watermark: {
      type: watermarkType.value,
      text: watermarkText.value,
      fontSize: watermarkFontSize.value,
      color: watermarkColor.value,
      opacity: watermarkOpacity.value / 100,
      position: watermarkPosition.value,
      offsetX: watermarkOffsetX.value,
      offsetY: watermarkOffsetY.value,
      imageDataURL: watermarkType.value === 'image' ? watermarkImageDataURL.value || '' : '',
      scale: watermarkScale.value / 100,
    },
  });
};

// その他のハンドラ
const handleDownload = () => {
  imageStore.download('edited-image.jpg');
};

const syncUIFromOps = () => {
  const current = imageStore.ops;
  if (!current) return;
  if (imageStore.imageInfo) {
    resizeWidth.value = current.resizeWidth || imageStore.imageInfo.width;
    resizeHeight.value = current.resizeHeight || imageStore.imageInfo.height;
    scalePercent.value = imageStore.imageInfo.width
      ? Math.round((resizeWidth.value / imageStore.imageInfo.width) * 100)
      : 100;
    if (current.crop) {
      cropX.value = current.crop.x;
      cropY.value = current.crop.y;
      cropWidth.value = current.crop.width;
      cropHeight.value = current.crop.height;
    } else {
      cropX.value = 0;
      cropY.value = 0;
      cropWidth.value = imageStore.imageInfo.width;
      cropHeight.value = imageStore.imageInfo.height;
    }
  }
  rotationDegrees.value = current.rotation ?? 0;
  brightness.value = current.brightness ?? 100;
  contrast.value = current.contrast ?? 100;
  saturation.value = current.saturation ?? 100;
  blurAmount.value = current.blur ?? 0;
  hue.value = current.hue ?? 0;
  gamma.value = Math.round((current.gamma ?? 1) * 100);
  toneCurvePoints.value = current.toneCurvePoints ?? [
    { x: 0, y: 0 },
    { x: 0.33, y: 0.33 },
    { x: 0.66, y: 0.66 },
    { x: 1, y: 1 },
  ];
  if (current.watermark) {
    watermarkType.value = current.watermark.type ?? 'none';
    watermarkText.value = current.watermark.text ?? 'Sample Watermark';
    watermarkFontSize.value = current.watermark.fontSize ?? 32;
    watermarkColor.value = current.watermark.color ?? '#ffffff';
    watermarkOpacity.value = Math.round((current.watermark.opacity ?? 0.5) * 100);
    watermarkPosition.value = current.watermark.position ?? 'bottom-right';
    watermarkOffsetX.value = current.watermark.offsetX ?? 24;
    watermarkOffsetY.value = current.watermark.offsetY ?? 24;
    watermarkScale.value = Math.round((current.watermark.scale ?? 0.3) * 100);
    watermarkImageDataURL.value = current.watermark.imageDataURL || null;
    watermarkImageName.value = current.watermark.imageDataURL ? 'watermark-image' : '';
  }
};

const resetUIState = () => {
  if (imageStore.imageInfo) {
    resizeWidth.value = imageStore.imageInfo.width;
    resizeHeight.value = imageStore.imageInfo.height;
    scalePercent.value = 100;
    cropX.value = 0;
    cropY.value = 0;
    cropWidth.value = imageStore.imageInfo.width;
    cropHeight.value = imageStore.imageInfo.height;
    cropSizePercent.value = 100;
    cropAspect.value = 'free';
  }
  rotationDegrees.value = 0;
  brightness.value = 100;
  contrast.value = 100;
  saturation.value = 100;
  blurAmount.value = 0;
  hue.value = 0;
  gamma.value = 100;
  toneCurvePoints.value = [
    { x: 0, y: 0 },
    { x: 0.33, y: 0.33 },
    { x: 0.66, y: 0.66 },
    { x: 1, y: 1 },
  ];
  watermarkType.value = 'none';
  watermarkText.value = 'Sample Watermark';
  watermarkFontSize.value = 32;
  watermarkColor.value = '#ffffff';
  watermarkOpacity.value = 50;
  watermarkPosition.value = 'bottom-right';
  watermarkOffsetX.value = 24;
  watermarkOffsetY.value = 24;
  watermarkScale.value = 30;
  watermarkImageDataURL.value = null;
  watermarkImageName.value = '';
};

const handleResetOps = async () => {
  await imageStore.resetOperations();
  resetUIState();
  syncUIFromOps();
  activeTab.value = 'resize';
};

const handleClearImage = () => {
  imageStore.reset();
  resizeWidth.value = 0;
  resizeHeight.value = 0;
  scalePercent.value = 100;
  cropX.value = 0;
  cropY.value = 0;
  cropWidth.value = 0;
  cropHeight.value = 0;
  cropSizePercent.value = 100;
  cropAspect.value = 'free';
  rotationDegrees.value = 0;
  brightness.value = 100;
  contrast.value = 100;
  saturation.value = 100;
  blurAmount.value = 0;
  hue.value = 0;
  gamma.value = 100;
  toneCurvePoints.value = [
    { x: 0, y: 0 },
    { x: 0.33, y: 0.33 },
    { x: 0.66, y: 0.66 },
    { x: 1, y: 1 },
  ];
  watermarkType.value = 'none';
  watermarkText.value = 'Sample Watermark';
  watermarkFontSize.value = 32;
  watermarkColor.value = '#ffffff';
  watermarkOpacity.value = 50;
  watermarkPosition.value = 'bottom-right';
  watermarkOffsetX.value = 24;
  watermarkOffsetY.value = 24;
  watermarkScale.value = 30;
  watermarkImageDataURL.value = null;
  watermarkImageName.value = '';
};

const handleUndo = async () => {
  await imageStore.undo();
  syncUIFromOps();
};

const handleRedo = async () => {
  await imageStore.redo();
  syncUIFromOps();
};

// クロップタブが開かれた時に範囲を初期化
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'crop' && imageStore.imageInfo) {
    if (cropWidth.value === 0 || cropHeight.value === 0) {
      cropX.value = 0;
      cropY.value = 0;
      cropWidth.value = imageStore.imageInfo.width;
      cropHeight.value = imageStore.imageInfo.height;
    }
  }
});

onMounted(() => {
  imageStore.initProcessor();
});
</script>

<style scoped>
.page-editor {
  max-width: 1800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-24);
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-8) 0;
}

.page-description {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  margin: 0;
}

.editor__container {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--space-24);
  min-height: 720px;
}

.editor__preview-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor__preview-section :deep(.image-preview) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor__preview-section :deep(.image-preview__container) {
  flex: 1;
}

.editor__preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-16);
  flex-shrink: 0;
}

.editor__preview-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.editor__preview-actions {
  display: flex;
  gap: var(--space-8);
}

.editor__upload-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-16);
  height: 100%;
}

.hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.editor__sidebar {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.editor__tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-8);
  flex-shrink: 0;
}

.editor__tab {
  padding: var(--space-12);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast) ease-out;
}

.editor__tab:hover {
  background: var(--color-background);
  color: var(--color-text-primary);
}

.editor__tab--active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.editor__tools {
  flex: 1;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-12);
}

.filter-actions {
  margin-top: var(--space-12);
}

@media (max-width: 1024px) {
  .editor__container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .editor__sidebar {
    order: -1;
  }

  .editor__tabs {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
