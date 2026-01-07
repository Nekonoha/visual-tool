<template>
  <div class="page-organize">
    <div class="page-header">
      <h1 class="page-title">整理 / リネーム</h1>
      <p class="page-description">パターン名付けとサムネイル生成で一括整理</p>
    </div>

    <div class="organize-container">
      <div class="organize-main">
        <BatchQueue />
      </div>

      <div class="organize-sidebar">
        <ToolPanel title="リネーム設定" :show-close="false">
          <template #default>
            <section class="panel-section">
              <div class="panel-section__content">
                <div class="tool-group">
                  <label class="tool-label">パターン</label>
                  <input
                    v-model="batchStore.settings.renamePattern"
                    type="text"
                    class="tool-input"
                    placeholder="image_{index}"
                  />
                  <p class="tool-hint">利用可能: {index}, {name}, {ext}</p>
                </div>

                <div class="tool-grid tool-grid--2">
                  <label class="tool-label">
                    開始番号
                    <input v-model.number="batchStore.settings.startIndex" type="number" min="1" class="tool-input" />
                  </label>
                  <label class="tool-label">
                    桁数パディング
                    <input v-model.number="batchStore.settings.padDigits" type="number" min="1" class="tool-input" />
                  </label>
                </div>

                <label class="tool-checkbox">
                  <input v-model="batchStore.settings.keepExtension" type="checkbox" />
                  <span>拡張子を元ファイルのままにする</span>
                </label>
              </div>
            </section>
          </template>
        </ToolPanel>

        <ToolPanel title="サムネイル生成" :show-close="false">
          <template #default>
            <section class="panel-section">
              <div class="panel-section__content">
                <label class="tool-checkbox">
                  <input v-model="batchStore.settings.thumbnail.enabled" type="checkbox" />
                  <span>サムネイルを生成する</span>
                </label>

                <div class="tool-grid tool-grid--2">
                  <label class="tool-label">
                    幅 (px)
                    <input
                      v-model.number="batchStore.settings.thumbnail.width"
                      type="number"
                      min="1"
                      class="tool-input"
                      :disabled="!batchStore.settings.thumbnail.enabled"
                    />
                  </label>
                  <label class="tool-label">
                    高さ (px)
                    <input
                      v-model.number="batchStore.settings.thumbnail.height"
                      type="number"
                      min="1"
                      class="tool-input"
                      :disabled="!batchStore.settings.thumbnail.enabled"
                    />
                  </label>
                </div>

                <div class="tool-group">
                  <label class="tool-label">出力形式</label>
                  <select
                    v-model="batchStore.settings.thumbnail.format"
                    class="tool-select"
                    :disabled="!batchStore.settings.thumbnail.enabled"
                  >
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>

                <div class="tool-group">
                  <label class="tool-label">画質</label>
                  <Slider
                    v-model="batchStore.settings.thumbnail.quality"
                    :min="10"
                    :max="100"
                    :step="1"
                    unit="%"
                    :disabled="!batchStore.settings.thumbnail.enabled"
                  />
                  <span class="tool-value">{{ batchStore.settings.thumbnail.quality }}%</span>
                  <p class="tool-hint">JPEG/WebP のみ適用</p>
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
                    {{ batchStore.isProcessing ? '処理中...' : '整理を実行' }}
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
  batchStore.settings.operation = 'organize';
});

const handleProcess = async () => {
  await batchStore.processQueue();
};
</script>
