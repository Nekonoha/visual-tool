<script setup lang="ts">
const props = defineProps<{
  title: string;
  visible: boolean;
  width?: string;
  height?: string;
  minWidth?: string;
  minHeight?: string;
  maxWidth?: string;
  maxHeight?: string;
  showReset?: boolean;
  applyDisabled?: boolean;
  applyLoading?: boolean;
  resizable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'apply'): void;
  (e: 'cancel'): void;
  (e: 'reset'): void;
}>();

// ドラッグ機能
const modalPos = ref({ x: 0, y: 0 });
const dragging = ref(false);
let dragStart = { x: 0, y: 0 };
let modalStart = { x: 0, y: 0 };

// リサイズ機能
const modalSize = ref({ width: 0, height: 0 });
const resizing = ref(false);
let resizeStart = { x: 0, y: 0 };
let sizeStart = { width: 0, height: 0 };
const modalRef = ref<HTMLElement | null>(null);

const modalStyle = computed(() => {
  const style: Record<string, string> = {
    transform: `translate(${modalPos.value.x}px, ${modalPos.value.y}px)`,
  };
  
  // ベースサイズ
  style.width = props.width || '500px';
  if (props.height) style.height = props.height;
  style.minWidth = props.minWidth || '300px';
  style.minHeight = props.minHeight || '200px';
  style.maxWidth = props.maxWidth || '95vw';
  style.maxHeight = props.maxHeight || '90vh';
  
  // リサイズ中はサイズを上書き
  if (modalSize.value.width > 0) {
    style.width = `${modalSize.value.width}px`;
  }
  if (modalSize.value.height > 0) {
    style.height = `${modalSize.value.height}px`;
  }
  
  return style;
});

// モーダルが開いたときに位置とサイズをリセット
watch(() => props.visible, (visible) => {
  if (visible) {
    modalPos.value = { x: 0, y: 0 };
    modalSize.value = { width: 0, height: 0 };
  }
});

const onDragStart = (e: PointerEvent) => {
  dragging.value = true;
  dragStart = { x: e.clientX, y: e.clientY };
  modalStart = { ...modalPos.value };
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd, { once: true });
};

const onDragMove = (e: PointerEvent) => {
  if (!dragging.value) return;
  modalPos.value = {
    x: modalStart.x + (e.clientX - dragStart.x),
    y: modalStart.y + (e.clientY - dragStart.y),
  };
};

const onDragEnd = () => {
  dragging.value = false;
  window.removeEventListener('pointermove', onDragMove);
};

// リサイズ機能
const onResizeStart = (e: PointerEvent) => {
  if (!props.resizable) return;
  e.preventDefault();
  resizing.value = true;
  resizeStart = { x: e.clientX, y: e.clientY };
  
  // 現在のサイズを取得
  if (modalRef.value) {
    const rect = modalRef.value.getBoundingClientRect();
    sizeStart = { width: rect.width, height: rect.height };
    modalSize.value = { width: rect.width, height: rect.height };
  }
  
  window.addEventListener('pointermove', onResizeMove);
  window.addEventListener('pointerup', onResizeEnd, { once: true });
};

const onResizeMove = (e: PointerEvent) => {
  if (!resizing.value) return;
  
  const minW = parseInt(props.minWidth || '300');
  const minH = parseInt(props.minHeight || '200');
  const maxW = window.innerWidth * 0.95;
  const maxH = window.innerHeight * 0.9;
  
  modalSize.value = {
    width: Math.max(minW, Math.min(maxW, sizeStart.width + (e.clientX - resizeStart.x))),
    height: Math.max(minH, Math.min(maxH, sizeStart.height + (e.clientY - resizeStart.y))),
  };
};

const onResizeEnd = () => {
  resizing.value = false;
  window.removeEventListener('pointermove', onResizeMove);
};

const close = () => {
  emit('update:visible', false);
  emit('cancel');
};

const apply = () => {
  emit('apply');
};

const reset = () => {
  emit('reset');
};

// ESCキーで閉じる
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.visible) {
    close();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="operation-modal-overlay" @click.self="close">
      <div 
        ref="modalRef"
        class="operation-modal" 
        :class="{ 'operation-modal--resizable': resizable }"
        :style="modalStyle"
      >
        <div class="modal-header" @pointerdown.prevent="onDragStart">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close" @click.stop="close">×</button>
        </div>
        
        <div class="modal-body">
          <slot />
        </div>
        
        <div class="modal-footer">
          <div class="footer-left">
            <button v-if="showReset" class="modal-btn modal-btn-reset" @click="reset">
              リセット
            </button>
          </div>
          <div class="footer-right">
            <button class="modal-btn modal-btn-cancel" @click="close">
              キャンセル
            </button>
            <button
              class="modal-btn modal-btn-apply"
              :disabled="applyDisabled || applyLoading"
              @click="apply"
            >
              <span v-if="applyLoading" class="loading-spinner"></span>
              適用
            </button>
          </div>
        </div>
        
        <!-- リサイズハンドル -->
        <div 
          v-if="resizable" 
          class="resize-handle"
          @pointerdown="onResizeStart"
        ></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.operation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.operation-modal {
  background: var(--color-surface);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.operation-modal--resizable {
  resize: none; /* 使用時はJSでリサイズ */
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  cursor: grab;
  user-select: none;
}

.modal-header:active {
  cursor: grabbing;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.15s;
}

.modal-close:hover {
  color: var(--color-text);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  gap: 12px;
}

.footer-left {
  display: flex;
  gap: 8px;
}

.footer-right {
  display: flex;
  gap: 8px;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.modal-btn-reset {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text);
}

.modal-btn-reset:hover {
  background: var(--color-surface-hover);
}

.modal-btn-cancel {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text);
}

.modal-btn-cancel:hover {
  background: var(--color-surface-hover);
}

.modal-btn-apply {
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-btn-apply:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.modal-btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* リサイズハンドル */
.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, var(--color-text-muted) 50%);
  opacity: 0.4;
  transition: opacity 0.15s;
  border-bottom-right-radius: 8px;
}

.resize-handle:hover {
  opacity: 0.7;
}

.resize-handle::before {
  content: '';
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 6px;
  height: 6px;
  border-right: 2px solid var(--color-text-muted);
  border-bottom: 2px solid var(--color-text-muted);
}
</style>
