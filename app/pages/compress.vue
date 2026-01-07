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
import BatchQueue from '~/components/BatchQueue.vue';
import Button from '~/components/Button.vue';
import Slider from '~/components/Slider.vue';
import ToolPanel from '~/components/ToolPanel.vue';

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

<style scoped>
.page-compress {
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

.compress-container {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--space-24);
  height: calc(100vh - 200px);
}

.compress-main {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  overflow: hidden;
}

.compress-sidebar {
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

.stats-card__value--error {
  color: var(--color-secondary);
}

@media (max-width: 1024px) {
  .compress-container {
    grid-template-columns: 1fr;
    height: auto;
  }

  .compress-sidebar {
    order: -1;
  }
}
</style>
