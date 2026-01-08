import { defineStore } from 'pinia';

export type ThemeMode = 'light' | 'dark' | 'auto';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: 'auto' as ThemeMode,
  }),

  getters: {
    /**
     * 実際に適用されるテーマを返す
     */
    effectiveTheme(): 'light' | 'dark' {
      if (this.theme === 'auto') {
        // ブラウザのシステム設定を確認
        if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
      }
      return this.theme;
    },
  },

  actions: {
    /**
     * テーマを設定
     */
    setTheme(mode: ThemeMode) {
      this.theme = mode;
      this.applyTheme();
      this.saveToLocalStorage();
    },

    /**
     * テーマをDOMに適用
     */
    applyTheme() {
      if (typeof document === 'undefined') return;
      
      const effectiveTheme = this.effectiveTheme;
      document.documentElement.setAttribute('data-theme', effectiveTheme);
    },

    /**
     * LocalStorageに保存
     */
    saveToLocalStorage() {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem('imgcrate-theme', this.theme);
    },

    /**
     * LocalStorageから読み込み
     */
    loadFromLocalStorage() {
      if (typeof localStorage === 'undefined') return;
      
      const saved = localStorage.getItem('imgcrate-theme') as ThemeMode | null;
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        this.theme = saved;
      }
      this.applyTheme();
    },

    /**
     * システム設定変更を監視
     */
    watchSystemTheme() {
      if (typeof window === 'undefined' || !window.matchMedia) return;

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.theme === 'auto') {
          this.applyTheme();
        }
      });
    },

    /**
     * 初期化
     */
    initialize() {
      this.loadFromLocalStorage();
      this.watchSystemTheme();
    },
  },
});
