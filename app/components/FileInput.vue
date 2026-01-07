<template>
  <div class="file-input">
    <input
      ref="inputElement"
      type="file"
      accept="image/*"
      :multiple="multiple"
      class="file-input__hidden"
      @change="handleFileChange"
    />
    <div class="file-input__wrapper" @click="triggerInput" @dragover.prevent @drop.prevent="handleDrop">
      <div class="file-input__content">
        <svg class="file-input__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <h3 class="file-input__title">{{ title }}</h3>
        <p class="file-input__description">{{ description }}</p>
        <Button variant="primary" size="md">{{ buttonText }}</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from './Button.vue';

interface Props {
  title?: string;
  description?: string;
  buttonText?: string;
  multiple?: boolean;
}

interface Emits {
  (e: 'file-selected', file: File): void;
  (e: 'files-selected', files: File[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  title: '画像をアップロード',
  description: 'ドラッグ＆ドロップまたはクリックして選択',
  buttonText: 'ファイルを選択',
  multiple: false,
});

const emit = defineEmits<Emits>();

const inputElement = ref<HTMLInputElement | null>(null);

const triggerInput = () => {
  inputElement.value?.click();
};

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    if (props.multiple) {
      const files = Array.from(input.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        emit('files-selected', files);
      }
    } else {
      const file = input.files[0];
      if (file && file.type.startsWith('image/')) {
        emit('file-selected', file);
      }
    }
  }
};

const handleDrop = (e: DragEvent) => {
  if (e.dataTransfer?.files) {
    if (props.multiple) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        emit('files-selected', files);
      }
    } else {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        emit('file-selected', file);
      }
    }
  }
};
</script>

