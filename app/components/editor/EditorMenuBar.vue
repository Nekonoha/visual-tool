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
  (e: 'open-brightness-contrast'): void;
  (e: 'open-hue-saturation'): void;
  (e: 'open-tone-curve'): void;
  (e: 'open-grayscale'): void;
  (e: 'open-sepia'): void;
  (e: 'open-watermark'): void;
  // New advanced filters
  (e: 'open-posterize'): void;
  (e: 'open-levels'): void;
  (e: 'open-color-balance'): void;
  (e: 'open-threshold'): void;
  (e: 'open-sharpen'): void;
  (e: 'open-sketch'): void;
  (e: 'open-chromatic-aberration'): void;
  // Advanced transforms - 各モード別
  (e: 'open-free-transform'): void;
  (e: 'open-scale-transform'): void;
  (e: 'open-perspective-transform'): void;
  (e: 'open-skew-transform'): void;
  (e: 'open-rotate-transform'): void;
}>();

interface MenuItem {
  label: string;
  icon?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface Menu {
  label: string;
  icon?: string;
  items: MenuItem[];
}

const menus = computed<Menu[]>(() => [
  {
    label: '編集',
    icon: 'fa-solid fa-pen-to-square',
    items: [
      { label: '元に戻す (Ctrl+Z)', icon: 'fa-solid fa-rotate-left', action: () => emit('undo'), disabled: !props.canUndo },
      { label: 'やり直し (Ctrl+Y)', icon: 'fa-solid fa-rotate-right', action: () => emit('redo'), disabled: !props.canRedo },
      { divider: true, label: '' },
      { label: 'すべてリセット', icon: 'fa-solid fa-arrow-rotate-left', action: () => emit('reset'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: '画像を保存...', icon: 'fa-solid fa-download', action: () => emit('download'), disabled: !props.hasImage },
    ],
  },
  {
    label: '変形',
    icon: 'fa-solid fa-up-right-and-down-left-from-center',
    items: [
      { label: 'リサイズ...', icon: 'fa-solid fa-expand', action: () => emit('open-resize'), disabled: !props.hasImage },
      { label: 'クロップ...', icon: 'fa-solid fa-crop', action: () => emit('open-crop'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: '回転...', icon: 'fa-solid fa-rotate', action: () => emit('open-rotate-transform'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: '自由変形...', icon: 'fa-solid fa-vector-square', action: () => emit('open-free-transform'), disabled: !props.hasImage },
      { label: '拡大・縮小...', icon: 'fa-solid fa-maximize', action: () => emit('open-scale-transform'), disabled: !props.hasImage },
      { label: '遠近ゆがみ...', icon: 'fa-solid fa-diamond', action: () => emit('open-perspective-transform'), disabled: !props.hasImage },
      { label: '平行ゆがみ...', icon: 'fa-solid fa-turn-up', action: () => emit('open-skew-transform'), disabled: !props.hasImage },
    ],
  },
  {
    label: '色調補正',
    icon: 'fa-solid fa-palette',
    items: [
      { label: '明るさ・コントラスト...', icon: 'fa-solid fa-sun', action: () => emit('open-brightness-contrast'), disabled: !props.hasImage },
      { label: '色相・彩度・明度...', icon: 'fa-solid fa-droplet', action: () => emit('open-hue-saturation'), disabled: !props.hasImage },
      { label: 'カラーバランス...', icon: 'fa-solid fa-sliders', action: () => emit('open-color-balance'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: 'レベル補正...', icon: 'fa-solid fa-chart-simple', action: () => emit('open-levels'), disabled: !props.hasImage },
      { label: 'トーンカーブ...', icon: 'fa-solid fa-bezier-curve', action: () => emit('open-tone-curve'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: '諧調化...', icon: 'fa-solid fa-layer-group', action: () => emit('open-posterize'), disabled: !props.hasImage },
      { label: '2値化...', icon: 'fa-solid fa-circle-half-stroke', action: () => emit('open-threshold'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: 'グレースケール', icon: 'fa-solid fa-image', action: () => emit('open-grayscale'), disabled: !props.hasImage },
      { label: 'セピア', icon: 'fa-solid fa-image-portrait', action: () => emit('open-sepia'), disabled: !props.hasImage },
    ],
  },
  {
    label: 'フィルター',
    icon: 'fa-solid fa-wand-magic-sparkles',
    items: [
      { label: 'シャープ...', icon: 'fa-solid fa-star-of-life', action: () => emit('open-sharpen'), disabled: !props.hasImage },
      { divider: true, label: '' },
      { label: 'えんぴつ調...', icon: 'fa-solid fa-pencil', action: () => emit('open-sketch'), disabled: !props.hasImage },
      { label: '色収差...', icon: 'fa-solid fa-circle-nodes', action: () => emit('open-chromatic-aberration'), disabled: !props.hasImage },
    ],
  },
  {
    label: 'その他',
    icon: 'fa-solid fa-ellipsis',
    items: [
      { label: 'ウォーターマーク...', icon: 'fa-solid fa-stamp', action: () => emit('open-watermark'), disabled: !props.hasImage },
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
        <i v-if="menu.icon" :class="menu.icon" aria-hidden="true"></i>
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
            <i v-if="item.icon" :class="item.icon" class="menu-dropdown-item__icon" aria-hidden="true"></i>
            <span class="menu-dropdown-item__label">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
