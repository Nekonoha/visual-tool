<script setup lang="ts">
const props = defineProps<{
  canUndo: boolean;
  canRedo: boolean;
  hasImage: boolean;
}>();

const emit = defineEmits<{
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'reset'): void;
  (e: 'download'): void;
  (e: 'open-resize'): void;
  (e: 'open-crop'): void;
  (e: 'open-transform'): void;
  (e: 'open-brightness-contrast'): void;
  (e: 'open-hue-saturation'): void;
  (e: 'open-tone-curve'): void;
  (e: 'open-grayscale'): void;
  (e: 'open-sepia'): void;
  (e: 'open-watermark'): void;
}>();

interface MenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

const menus = computed<Menu[]>(() => [
  {
    label: '編集',
    items: [
      { label: '元に戻す (Ctrl+Z)', action: () => emit('undo'), disabled: !props.canUndo },
      { label: 'やり直し (Ctrl+Y)', action: () => emit('redo'), disabled: !props.canRedo },
      { divider: true, label: '' },
      { label: 'すべてリセット', action: () => emit('reset'), disabled: !props.hasImage },
    ],
  },
  {
    label: '画像',
    items: [
      { label: 'リサイズ...', action: () => emit('open-resize'), disabled: !props.hasImage },
      { label: 'クロップ...', action: () => emit('open-crop'), disabled: !props.hasImage },
    ],
  },
  {
    label: '変形',
    items: [
      { label: '回転・反転...', action: () => emit('open-transform'), disabled: !props.hasImage },
    ],
  },
  {
    label: '色調補正',
    items: [
      { label: '明るさ・コントラスト...', action: () => emit('open-brightness-contrast'), disabled: !props.hasImage },
      { label: '色相・彩度・明度...', action: () => emit('open-hue-saturation'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: 'トーンカーブ...', action: () => emit('open-tone-curve'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: 'グレースケール', action: () => emit('open-grayscale'), disabled: !props.hasImage },
      { label: 'セピア', action: () => emit('open-sepia'), disabled: !props.hasImage },
    ],
  },
  {
    label: 'その他',
    items: [
      { label: 'ウォーターマーク...', action: () => emit('open-watermark'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: '画像を保存...', action: () => emit('download'), disabled: !props.hasImage },
    ],
  },
]);

const activeMenu = ref<string | null>(null);

const toggleMenu = (label: string) => {
  activeMenu.value = activeMenu.value === label ? null : label;
};

const handleItemClick = (item: MenuItem) => {
  if (item.disabled || item.divider) return;
  item.action?.();
  activeMenu.value = null;
};

const closeMenu = () => {
  activeMenu.value = null;
};

// クリック外で閉じる
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
});

const menuBarRef = ref<HTMLElement | null>(null);

const handleOutsideClick = (e: MouseEvent) => {
  if (menuBarRef.value && !menuBarRef.value.contains(e.target as Node)) {
    closeMenu();
  }
};
</script>

<template>
  <div ref="menuBarRef" class="editor-menu-bar">
    <div
      v-for="menu in menus"
      :key="menu.label"
      class="menu-item"
      :class="{ active: activeMenu === menu.label }"
    >
      <button class="menu-button" @click.stop="toggleMenu(menu.label)">
        {{ menu.label }}
      </button>
      <div v-if="activeMenu === menu.label" class="menu-dropdown">
        <template v-for="(item, index) in menu.items" :key="index">
          <div v-if="item.divider" class="menu-divider" />
          <button
            v-else
            class="menu-dropdown-item"
            :class="{ disabled: item.disabled }"
            :disabled="item.disabled"
            @click.stop="handleItemClick(item)"
          >
            {{ item.label }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
