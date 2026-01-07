<template>
  <div class="page-compress">
    <div class="page-header">
      <h1 class="page-title">バッチ圧縮</h1>
      <p class="page-description">複数の画像を一括で圧縮・最適化</p>
    </div>

    <div class="compress-container">
      <div class="compress-main">
        <BatchQueue />
      </div>

      <div class="compress-sidebar">
        <ToolPanel title="圧縮設定" :show-close="false">
          <template #default>
            <section class="panel-section">
              <div class="panel-section__content">
                <div class="tool-group">
                  <label class="tool-label">画質</label>
                  <Slider
                    v-model="batchStore.settings.quality"
                    :min="1"
                    :max="100"
                    :step="1"
                    label="画質"
                  />
                  <span class="tool-value">{{ batchStore.settings.quality }}%</span>
                  <p class="tool-hint">低い値ほどファイルサイズが小さくなります</p>
                </div>

                <div class="tool-group">
                  <label class="tool-label">出力形式</label>
                  <select v-model="batchStore.settings.format" class="tool-select">
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP（推奨）</option>
                  </select>
                  <p class="tool-hint">WebPは最も高い圧縮率を実現します</p>
                </div>

                <div class="tool-group">
                  <label class="tool-label">最大幅（px）</label>
                  <input
                    v-model.number="batchStore.settings.maxWidth"
                    type="number"
                    class="tool-input"
                    placeholder="無制限"
                    min="1"
                  />
                  <p class="tool-hint">空欄で元のサイズを維持</p>
                </div>

                <div class="tool-group">
                  <label class="tool-label">最大高さ（px）</label>
                  <input
                    v-model.number="batchStore.settings.maxHeight"
                    type="number"
                    class="tool-input"
                    placeholder="無制限"
                    min="1"
                  />
                  <p class="tool-hint">縦横比は自動で維持されます</p>
                </div>

                <div class="tool-group">
                  <div class="stats-card">
                    <div class="stats-card__item">
                      <span class="stats-card__label">処理待ち</span>
                      <span class="stats-card__value">{{ batchStore.totalJobs - batchStore.completedJobs }}</span>
                    </div>
                    <div class="stats-card__item">
                      <span class="stats-card__label">完了</span>
                      <span class="stats-card__value stats-card__value--success">{{ batchStore.completedJobs }}</span>
                    </div>
                    <div v-if="batchStore.failedJobs > 0" class="stats-card__item">
                      <span class="stats-card__label">エラー</span>
                      <span class="stats-card__value stats-card__value--error">{{ batchStore.failedJobs }}</span>
                    </div>
                  </div>
                </div>

                <div class="tool-group">
                  <Button
                    variant="primary"
                    size="md"
                    :disabled="batchStore.totalJobs === 0 || batchStore.isProcessing"
                    :loading="batchStore.isProcessing"
                    @click="handleProcess"
                    class="btn--full-width"
                  >
                    {{ batchStore.isProcessing ? '処理中...' : '圧縮開始' }}
                  </Button>
                </div>
              </div>
            </section>
          </template>
        </ToolPanel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useBatchStore } from '~/stores/batch';
import BatchQueue from '~/components/editor/BatchQueue.vue';
import Button from '~/components/ui/Button.vue';
import Slider from '~/components/ui/Slider.vue';
import ToolPanel from '~/components/ui/ToolPanel.vue';

definePageMeta({
  layout: 'default',
});

const batchStore = useBatchStore();

onMounted(() => {
  batchStore.settings.operation = 'compress';
});

const handleProcess = async () => {
  await batchStore.processQueue();
};
</script>
