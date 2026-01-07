<template>
  <div class="page-convert">
    <div class="page-header">
      <h1 class="page-title">形式変換</h1>
      <p class="page-description">JPEG、PNG、WebPなど様々な形式に一括変換</p>
    </div>

    <div class="convert-container">
      <div class="convert-main">
        <BatchQueue />
      </div>

      <div class="convert-sidebar">
        <ToolPanel title="変換設定" :show-close="false">
          <template #default>
            <section class="panel-section">
              <div class="panel-section__content">
                <div class="tool-group">
                  <label class="tool-label">出力形式</label>
                  <select v-model="batchStore.settings.format" class="tool-select">
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                  <p class="tool-hint">変換後の画像形式を選択</p>
                </div>

                <div v-if="batchStore.settings.format === 'jpeg'" class="tool-group">
                  <label class="tool-label">JPEG画質</label>
                  <Slider
                    v-model="batchStore.settings.quality"
                    :min="1"
                    :max="100"
                    :step="1"
                    label="画質"
                  />
                  <span class="tool-value">{{ batchStore.settings.quality }}%</span>
                  <p class="tool-hint">高い値ほど高品質ですがファイルサイズが大きくなります</p>
                </div>

                <div v-if="batchStore.settings.format === 'webp'" class="tool-group">
                  <label class="tool-label">WebP画質</label>
                  <Slider
                    v-model="batchStore.settings.quality"
                    :min="1"
                    :max="100"
                    :step="1"
                    label="画質"
                  />
                  <span class="tool-value">{{ batchStore.settings.quality }}%</span>
                  <p class="tool-hint">WebPは高い圧縮率を実現します</p>
                </div>

                <div class="tool-group">
                  <label class="tool-label">リサイズ品質</label>
                  <select v-model="batchStore.settings.resampleMethod" class="tool-select">
                    <option value="bilinear">標準（高速）</option>
                    <option value="bicubic">高品質（バイキュービック）</option>
                    <option value="lanczos">最高品質（Lanczos）</option>
                  </select>
                  <p class="tool-hint">リサイズする場合の補間方法を選択</p>
                </div>

                <div class="tool-group">
                  <div class="info-box">
                    <h4 class="info-box__title">形式の特徴</h4>
                    <ul class="info-box__list">
                      <li v-if="batchStore.settings.format === 'jpeg'">
                        <strong>JPEG:</strong> 写真に最適、透明度なし
                      </li>
                      <li v-else-if="batchStore.settings.format === 'png'">
                        <strong>PNG:</strong> 透明度対応、ロスレス圧縮
                      </li>
                      <li v-else-if="batchStore.settings.format === 'webp'">
                        <strong>WebP:</strong> 次世代形式、高圧縮率、透明度対応
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="tool-group">
                  <div class="stats-card">
                    <div class="stats-card__item">
                      <span class="stats-card__label">変換待ち</span>
                      <span class="stats-card__value">{{ batchStore.totalJobs - batchStore.completedJobs }}</span>
                    </div>
                    <div class="stats-card__item">
                      <span class="stats-card__label">完了</span>
                      <span class="stats-card__value stats-card__value--success">{{ batchStore.completedJobs }}</span>
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
                    {{ batchStore.isProcessing ? '変換中...' : '変換開始' }}
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
import BatchQueue from '~/components/BatchQueue.vue';
import Button from '~/components/Button.vue';
import Slider from '~/components/Slider.vue';
import ToolPanel from '~/components/ToolPanel.vue';

definePageMeta({
  layout: 'default',
});

const batchStore = useBatchStore();

onMounted(() => {
  batchStore.settings.operation = 'convert';
});

const handleProcess = async () => {
  await batchStore.processQueue();
};
</script>

<style scoped>
.page-convert {
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-32);
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

.convert-container {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--space-24);
  height: calc(100vh - 200px);
}

.convert-main {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  overflow: hidden;
}

.convert-sidebar {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  overflow-y: auto;
}

.tool-hint {
  margin: var(--space-8) 0 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.info-box {
  padding: var(--space-16);
  background: rgba(0, 122, 255, 0.05);
  border-radius: var(--radius-md);
  border: 1px solid rgba(0, 122, 255, 0.2);
}

.info-box__title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-primary);
  margin: 0 0 var(--space-8) 0;
}

.info-box__list {
  margin: 0;
  padding-left: var(--space-20);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.info-box__list li {
  margin-bottom: var(--space-4);
}

.stats-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  padding: var(--space-16);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
}

.stats-card__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats-card__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.stats-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.stats-card__value--success {
  color: #10b981;
}

@media (max-width: 1024px) {
  .convert-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .convert-sidebar {
    order: -1;
  }
}
</style>
