<template>
  <div class="batch-queue">
    <!-- ファイル追加UI -->
    <div class="batch-queue__upload">
      <FileInput
        multiple
        title="画像を追加"
        description="複数ファイルを選択またはドロップ"
        button-text="ファイルを選択"
        @files-selected="handleFilesSelected"
      />
    </div>

    <div class="batch-queue__header">
      <h3 class="batch-queue__title">処理キュー</h3>
      <div class="batch-queue__stats">
        <span class="batch-queue__stat">
          {{ batchStore.completedJobs }}/{{ batchStore.totalJobs }} 完了
        </span>
        <span v-if="batchStore.failedJobs > 0" class="batch-queue__stat batch-queue__stat--error">
          {{ batchStore.failedJobs }} エラー
        </span>
      </div>
    </div>

    <div v-if="batchStore.totalJobs > 0" class="batch-queue__progress">
      <div class="batch-queue__progress-bar">
        <div
          class="batch-queue__progress-fill"
          :style="{ width: `${batchStore.overallProgress}%` }"
        ></div>
      </div>
      <span class="batch-queue__progress-text">{{ batchStore.overallProgress }}%</span>
    </div>

    <div v-if="batchStore.totalJobs === 0" class="batch-queue__empty">
      <p>キューが空です</p>
      <p class="batch-queue__empty-hint">上のエリアから画像を追加してください</p>
    </div>

    <div v-else class="batch-queue__list">
      <div
        v-for="job in batchStore.jobs"
        :key="job.id"
        :class="['batch-queue__item', `batch-queue__item--${job.status}`]"
      >
        <div class="batch-queue__item-icon">
          <span v-if="job.status === 'pending'">⏳</span>
          <span v-else-if="job.status === 'processing'">🔄</span>
          <span v-else-if="job.status === 'completed'">✅</span>
          <span v-else-if="job.status === 'error'">❌</span>
        </div>

        <div class="batch-queue__item-info">
          <div class="batch-queue__item-name">{{ job.file.name }}</div>
          <div v-if="job.outputName" class="batch-queue__item-output">→ {{ job.outputName }}</div>
          <div class="batch-queue__item-details">
            <span>{{ formatSize(job.originalSize) }}</span>
            <span v-if="job.outputSize"> → {{ formatSize(job.outputSize) }}</span>
            <span v-if="job.status === 'completed' && job.outputSize">
              ({{ Math.round(((job.originalSize - job.outputSize) / job.originalSize) * 100) }}%削減)
            </span>
          </div>
          <div v-if="job.error" class="batch-queue__item-error">{{ job.error }}</div>
        </div>

        <div class="batch-queue__item-progress">
          <div
            v-if="job.status === 'processing'"
            class="batch-queue__item-progress-bar"
          >
            <div
              class="batch-queue__item-progress-fill"
              :style="{ width: `${job.progress}%` }"
            ></div>
          </div>
        </div>

        <button
          type="button"
          class="batch-queue__item-remove"
          @click="batchStore.removeJob(job.id)"
          :disabled="job.status === 'processing'"
        >
          ×
        </button>
      </div>
    </div>

    <div v-if="batchStore.totalJobs > 0" class="batch-queue__actions">
      <Button
        variant="primary"
        size="md"
        :disabled="batchStore.isProcessing || batchStore.pendingJobs === 0"
        :loading="batchStore.isProcessing"
        @click="batchStore.processQueue"
      >
        {{ batchStore.isProcessing ? '処理中...' : `${batchStore.pendingJobs}件を処理` }}
      </Button>
      <Button
        variant="outline"
        size="md"
        :disabled="batchStore.isProcessing || batchStore.completedJobs === 0"
        @click="batchStore.downloadAll"
      >
        すべてダウンロード
      </Button>
      <Button
        variant="outline"
        size="md"
        :disabled="batchStore.isProcessing"
        @click="batchStore.clearAll"
      >
        クリア
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBatchStore } from '~/stores/batch';
import Button from '~/components/ui/Button.vue';
import FileInput from '~/components/ui/FileInput.vue';

const batchStore = useBatchStore();

const handleFilesSelected = (files: File[]) => {
  batchStore.addFiles(files);
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};
</script>
