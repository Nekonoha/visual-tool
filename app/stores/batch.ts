// バッチ処理用ストア
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface BatchJob {
  id: string;
  file: File;
  originalSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  outputBlob?: Blob;
  outputSize?: number;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface BatchSettings {
  operation: 'compress' | 'convert' | 'resize';
  quality?: number; // 0-100 for compression
  format?: 'jpeg' | 'png' | 'webp';
  maxWidth?: number;
  maxHeight?: number;
  maintainAspect?: boolean;
  resampleMethod?: 'lanczos' | 'bicubic' | 'bilinear'; // リサンプリング方法
}

export const useBatchStore = defineStore('batch', () => {
  // State
  const jobs = ref<BatchJob[]>([]);
  const settings = ref<BatchSettings>({
    operation: 'compress',
    quality: 80,
    format: 'jpeg',
    maintainAspect: true,
    resampleMethod: 'lanczos',
  });
  const isProcessing = ref(false);

  // Computed
  const totalJobs = computed(() => jobs.value.length);
  const completedJobs = computed(() => jobs.value.filter((j) => j.status === 'completed').length);
  const failedJobs = computed(() => jobs.value.filter((j) => j.status === 'error').length);
  const pendingJobs = computed(() => jobs.value.filter((j) => j.status === 'pending').length);
  const overallProgress = computed(() => {
    if (totalJobs.value === 0) return 0;
    return Math.round((completedJobs.value / totalJobs.value) * 100);
  });

  const totalOriginalSize = computed(() => {
    return jobs.value.reduce((sum, job) => sum + job.originalSize, 0);
  });

  const totalOutputSize = computed(() => {
    return jobs.value.reduce((sum, job) => sum + (job.outputSize || 0), 0);
  });

  const compressionRatio = computed(() => {
    if (totalOriginalSize.value === 0) return 0;
    return Math.round(((totalOriginalSize.value - totalOutputSize.value) / totalOriginalSize.value) * 100);
  });

  // Actions
  const addFiles = (files: File[]) => {
    const newJobs: BatchJob[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      originalSize: file.size,
      status: 'pending',
      progress: 0,
    }));
    jobs.value.push(...newJobs);
  };

  const removeJob = (jobId: string) => {
    const index = jobs.value.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      jobs.value.splice(index, 1);
    }
  };

  const clearCompleted = () => {
    jobs.value = jobs.value.filter((j) => j.status !== 'completed');
  };

  const clearAll = () => {
    jobs.value = [];
  };

  const updateJobStatus = (jobId: string, status: BatchJob['status'], progress?: number) => {
    const job = jobs.value.find((j) => j.id === jobId);
    if (job) {
      job.status = status;
      if (progress !== undefined) {
        job.progress = progress;
      }
      if (status === 'processing' && !job.startTime) {
        job.startTime = Date.now();
      }
      if ((status === 'completed' || status === 'error') && !job.endTime) {
        job.endTime = Date.now();
      }
    }
  };

  const setJobOutput = (jobId: string, blob: Blob) => {
    const job = jobs.value.find((j) => j.id === jobId);
    if (job) {
      job.outputBlob = blob;
      job.outputSize = blob.size;
    }
  };

  const setJobError = (jobId: string, error: string) => {
    const job = jobs.value.find((j) => j.id === jobId);
    if (job) {
      job.error = error;
      job.status = 'error';
    }
  };

  const processQueue = async () => {
    if (isProcessing.value) return;
    isProcessing.value = true;

    const { ImageCompressor } = await import('~/utils/imageCompressor');
    const pendingJobsList = jobs.value.filter((j) => j.status === 'pending');

    for (const job of pendingJobsList) {
      try {
        updateJobStatus(job.id, 'processing', 0);

        // 圧縮設定を取得
        const { quality, format, maxWidth, maxHeight, resampleMethod } = settings.value;

        // 圧縮処理
        const compressedBlob = await ImageCompressor.compress(job.file, {
          quality: quality / 100, // 0-100 → 0-1
          format: format as 'jpeg' | 'png' | 'webp',
          maxWidth,
          maxHeight,
          maintainAspect: true,
          resampleMethod: resampleMethod || 'bilinear',
        });

        // 出力を保存
        setJobOutput(job.id, compressedBlob);
        updateJobStatus(job.id, 'completed', 100);
      } catch (err) {
        setJobError(job.id, err instanceof Error ? err.message : 'Unknown error');
      }
    }

    isProcessing.value = false;
  };

  const downloadAll = () => {
    jobs.value.forEach((job) => {
      if (job.status === 'completed' && job.outputBlob) {
        const url = URL.createObjectURL(job.outputBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `processed_${job.file.name}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  return {
    // State
    jobs,
    settings,
    isProcessing,

    // Computed
    totalJobs,
    completedJobs,
    failedJobs,
    pendingJobs,
    overallProgress,
    totalOriginalSize,
    totalOutputSize,
    compressionRatio,

    // Actions
    addFiles,
    removeJob,
    clearCompleted,
    clearAll,
    updateJobStatus,
    setJobOutput,
    setJobError,
    processQueue,
    downloadAll,
  };
});
