/**
 * useKeyboardShortcuts
 * キーボードショートカットを管理するComposable
 */

import { onMounted, onUnmounted, type Ref } from 'vue';

interface ShortcutOptions {
  canUndo: Ref<boolean>;
  canRedo: Ref<boolean>;
  hasImage: Ref<boolean>;
  isModalOpen: Ref<boolean>;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

export function useKeyboardShortcuts(options: ShortcutOptions) {
  const handleKeydown = (e: KeyboardEvent) => {
    // モーダルが開いている場合はスキップ
    if (options.isModalOpen.value) return;
    
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    
    // Ctrl+Z: Undo
    if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (options.canUndo.value) {
        options.onUndo();
      }
      return;
    }
    
    // Ctrl+Y or Ctrl+Shift+Z: Redo
    if (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
      e.preventDefault();
      if (options.canRedo.value) {
        options.onRedo();
      }
      return;
    }
    
    // Ctrl+S: Save
    if (isCtrlOrCmd && e.key === 's') {
      e.preventDefault();
      if (options.hasImage.value) {
        options.onSave();
      }
      return;
    }
    
    // Delete: Delete image (optional)
    if (e.key === 'Delete' && options.onDelete) {
      e.preventDefault();
      options.onDelete();
      return;
    }
  };
  
  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });
  
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
  
  return {
    handleKeydown,
  };
}
