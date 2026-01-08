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
  /** ポップアウト時に渡すデータ（JSON.stringifyで渡される） */
  popoutData?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'apply'): void;
  (e: 'cancel'): void;
  (e: 'reset'): void;
  (e: 'popout'): void;
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

// ポップアウトウィンドウ
const popoutWindow = ref<Window | null>(null);

// スマホ判定
const isMobile = ref(false);
const isSmallScreen = ref(false);

const updateScreenSize = () => {
  isMobile.value = window.innerWidth < 768;
  isSmallScreen.value = window.innerWidth < 480;
};

onMounted(() => {
  updateScreenSize();
  window.addEventListener('resize', updateScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize);
});

const modalStyle = computed(() => {
  const style: Record<string, string> = {};
  
  // スマホではドラッグ無効化、位置固定
  if (!isMobile.value) {
    style.transform = `translate(${modalPos.value.x}px, ${modalPos.value.y}px)`;
  }
  
  // スマホ・小型画面では固定サイズを無視して画面に合わせる
  if (isSmallScreen.value) {
    style.width = 'calc(100vw - 8px)';
    style.height = 'calc(100vh - 50px)';
    style.minWidth = '0';
    style.minHeight = '0';
    style.maxWidth = '100vw';
    style.maxHeight = 'calc(100vh - 40px)';
  } else if (isMobile.value) {
    style.width = 'calc(100vw - 32px)';
    style.height = 'calc(100vh - 80px)';
    style.minWidth = '0';
    style.minHeight = '0';
    style.maxWidth = 'calc(100vw - 16px)';
    style.maxHeight = 'calc(100vh - 60px)';
  } else {
    // PC: propsの値を使用
    style.width = props.width || 'min(720px, calc(100vw - 16px))';
    style.height = props.height || 'min(600px, calc(100vh - 60px))';
    style.minWidth = props.minWidth || '0';
    style.minHeight = props.minHeight || '0';
    style.maxWidth = props.maxWidth || 'calc(100vw - 8px)';
    style.maxHeight = props.maxHeight || 'calc(100vh - 50px)';
    
    // リサイズ中はサイズを上書き（PCのみ）
    if (modalSize.value.width > 0) {
      style.width = `${modalSize.value.width}px`;
    }
    if (modalSize.value.height > 0) {
      style.height = `${modalSize.value.height}px`;
    }
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

/**
 * ポップアウト（別ウィンドウでプレビュー画像を表示）
 */
const popout = () => {
  // ブラウザのポップアップブロッカーに注意
  const width = 1000;
  const height = 800;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  
  const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`;
  
  // 新しいウィンドウを開く
  const newWindow = window.open('', `popout_${Date.now()}`, features);
  
  if (newWindow) {
    popoutWindow.value = newWindow;
    
    // プレビュー画像のsrcを取得（CanvasまたはModalPreviewから）
    let imageSrc = '';
    const canvas = modalRef.value?.querySelector('canvas') as HTMLCanvasElement | null;
    const img = modalRef.value?.querySelector('img') as HTMLImageElement | null;
    
    if (canvas) {
      try {
        imageSrc = canvas.toDataURL('image/png');
      } catch {
        // tainted canvasの場合
      }
    } else if (img) {
      imageSrc = img.src;
    }
    
    // ダークモード対応の背景色
    const isDark = document.documentElement.classList.contains('dark');
    const bgColor = isDark ? '#1a1a2e' : '#f5f5f5';
    const textColor = isDark ? '#e0e0e0' : '#333';
    const borderColor = isDark ? '#333' : '#ddd';
    
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${props.title} - プレビュー</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background: ${bgColor};
              color: ${textColor};
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .header {
              padding: 12px 20px;
              border-bottom: 1px solid ${borderColor};
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-shrink: 0;
            }
            .title { font-size: 16px; font-weight: 600; }
            .hint { font-size: 12px; opacity: 0.7; }
            .preview-area {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              overflow: auto;
              background: repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 16px 16px;
            }
            .preview-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .no-preview {
              padding: 40px;
              text-align: center;
              opacity: 0.5;
            }
            .controls {
              padding: 12px 20px;
              border-top: 1px solid ${borderColor};
              display: flex;
              justify-content: center;
              gap: 12px;
              flex-shrink: 0;
            }
            button {
              padding: 8px 20px;
              border: 1px solid ${borderColor};
              border-radius: 6px;
              background: transparent;
              color: ${textColor};
              cursor: pointer;
              font-size: 14px;
            }
            button:hover { background: rgba(128,128,128,0.2); }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="title">${props.title}</span>
            <span class="hint">メインウィンドウで編集すると更新されます</span>
          </div>
          <div class="preview-area" id="previewArea">
            ${imageSrc 
              ? `<img src="${imageSrc}" class="preview-image" id="previewImage" />`
              : '<div class="no-preview">プレビュー画像がありません</div>'
            }
          </div>
          <div class="controls">
            <button onclick="window.close()">閉じる</button>
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
    
    // プレビュー更新用のメッセージリスナー
    const updatePreview = () => {
      if (newWindow.closed) {
        clearInterval(updateInterval);
        popoutWindow.value = null;
        return;
      }
      
      let newSrc = '';
      const currentCanvas = modalRef.value?.querySelector('canvas') as HTMLCanvasElement | null;
      const currentImg = modalRef.value?.querySelector('img') as HTMLImageElement | null;
      
      if (currentCanvas) {
        try {
          newSrc = currentCanvas.toDataURL('image/png');
        } catch {
          // tainted canvas
        }
      } else if (currentImg) {
        newSrc = currentImg.src;
      }
      
      if (newSrc) {
        const previewImg = newWindow.document.getElementById('previewImage') as HTMLImageElement | null;
        if (previewImg && previewImg.src !== newSrc) {
          previewImg.src = newSrc;
        }
      }
    };
    
    // 定期的にプレビューを更新
    const updateInterval = setInterval(updatePreview, 500);
    
    emit('popout');
  } else {
    alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
  }
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
          <div class="modal-header-actions">
            <button 
              class="modal-popout" 
              @click.stop="popout" 
              title="別ウィンドウで開く"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </button>
            <button class="modal-close" @click.stop="close">×</button>
          </div>
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
