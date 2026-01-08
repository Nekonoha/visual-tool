<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="app-header__container">
        <NuxtLink to="/" class="app-header__logo">
          <svg class="app-header__logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span class="app-header__logo-text">Visual Tool</span>
        </NuxtLink>

        <nav class="app-header__nav">
          <NuxtLink to="/editor" class="app-header__nav-link">
            <i class="fa-solid fa-wand-magic-sparkles app-header__nav-icon" aria-hidden="true"></i>
            画像編集
          </NuxtLink>
          <NuxtLink to="/compress" class="app-header__nav-link">
            <i class="fa-solid fa-compress app-header__nav-icon" aria-hidden="true"></i>
            バッチ圧縮
          </NuxtLink>
          <NuxtLink to="/convert" class="app-header__nav-link">
            <i class="fa-solid fa-right-left app-header__nav-icon" aria-hidden="true"></i>
            形式変換
          </NuxtLink>
          <NuxtLink to="/organize" class="app-header__nav-link">
            <i class="fa-solid fa-folder-tree app-header__nav-icon" aria-hidden="true"></i>
            整理/リネーム
          </NuxtLink>
        </nav>
      </div>
    </header>

    <aside class="app-sidebar">
      <nav class="app-sidebar__nav">
        <div class="app-sidebar__section">
          <h3 class="app-sidebar__section-title">編集機能</h3>
          <NuxtLink to="/editor" class="app-sidebar__link">
            <i class="fa-solid fa-wand-magic-sparkles app-sidebar__icon" aria-hidden="true"></i>
            画像編集
          </NuxtLink>
        </div>

        <div class="app-sidebar__section">
          <h3 class="app-sidebar__section-title">バッチ処理</h3>
          <NuxtLink to="/compress" class="app-sidebar__link">
            <i class="fa-solid fa-compress app-sidebar__icon" aria-hidden="true"></i>
            バッチ圧縮
          </NuxtLink>
          <NuxtLink to="/convert" class="app-sidebar__link">
            <i class="fa-solid fa-right-left app-sidebar__icon" aria-hidden="true"></i>
            形式変換
          </NuxtLink>
          <NuxtLink to="/organize" class="app-sidebar__link">
            <i class="fa-solid fa-folder-tree app-sidebar__icon" aria-hidden="true"></i>
            整理/リネーム
          </NuxtLink>
        </div>
      </nav>
    </aside>

    <main class="app-main">
      <slot />
    </main>

    <footer class="app-footer">
      <div class="app-footer__container">
        <p class="app-footer__text">
          © 2026 Visual Tool - 画像編集ツール
        </p>
        <div class="app-footer__support">
          <a href="https://x.com/tan_fantazma" target="_blank" class="app-footer__social-link" rel="noopener noreferrer">
            <i class="fa-brands fa-x-twitter" aria-hidden="true"></i>
            @tan_fantazma
          </a>
          <a href="https://ko-fi.com/F1F51RW9YM" target="_blank" class="app-footer__kofi-link" rel="noopener noreferrer">
            <i class="fa-solid fa-mug-hot" aria-hidden="true"></i>
            Support on Ko-fi
          </a>
        </div>
        <div class="app-footer__links">
          <NuxtLink to="/privacy" class="app-footer__link">
            <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
            プライバシーポリシー
          </NuxtLink>
          <NuxtLink to="/terms" class="app-footer__link">
            <i class="fa-solid fa-file-contract" aria-hidden="true"></i>
            利用規約
          </NuxtLink>
          <a href="https://github.com/nekonoha/visual-tool" target="_blank" class="app-footer__link" rel="noopener noreferrer">
            <i class="fa-brands fa-github" aria-hidden="true"></i>
            GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Ko-fi フローティングウィジェット
onMounted(() => {
  // スクリプトが既に読み込まれていなければ追加
  if (!document.getElementById('kofi-widget-script')) {
    const script = document.createElement('script');
    script.id = 'kofi-widget-script';
    script.src = 'https://storage.ko-fi.com/cdn/widget/OverlayWidget.js';
    script.onload = () => {
      // @ts-expect-error Ko-fi widget global
      if (window.kofiWidgetOverlay) {
        // @ts-expect-error Ko-fi widget global
        window.kofiWidgetOverlay.draw('F1F51RW9YM', {
          'type': 'floating-chat',
          'floating-chat.donateButton.text': 'Support ☕',
          'floating-chat.donateButton.background-color': '#6366F1',
          'floating-chat.donateButton.text-color': '#fff'
        });
      }
    };
    document.body.appendChild(script);
  }
});
</script>