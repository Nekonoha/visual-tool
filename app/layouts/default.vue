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
        </div>

        <div class="app-sidebar__section">
          <h3 class="app-sidebar__section-title">高度な機能</h3>
          <div class="app-sidebar__link app-sidebar__link--disabled">
            <i class="fa-solid fa-eraser app-sidebar__icon" aria-hidden="true"></i>
            背景削除（近日）
          </div>
          <div class="app-sidebar__link app-sidebar__link--disabled">
            <i class="fa-solid fa-water app-sidebar__icon" aria-hidden="true"></i>
            ウォーターマーク（近日）
          </div>
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
        <div class="app-footer__links">
          <NuxtLink to="/privacy" class="app-footer__link">プライバシーポリシー</NuxtLink>
          <NuxtLink to="/terms" class="app-footer__link">利用規約</NuxtLink>
          <a href="https://github.com/nekonoha/visual-tool" target="_blank" class="app-footer__link" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* App Layout */
.app-layout {
  display: grid;
  grid-template-areas:
    'header header'
    'sidebar main'
    'footer footer';
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
  background: var(--color-background);
}

/* Header */
.app-header {
  grid-area: header;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.app-header__container {
  display: flex;
  align-items: center;
  gap: var(--space-32);
  padding: 0 var(--space-24);
  height: 64px;
  max-width: 1920px;
  margin: 0 auto;
}

.app-header__logo {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  text-decoration: none;
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: 20px;
  transition: color var(--transition-fast) ease-out;
}

.app-header__logo:hover {
  color: var(--color-primary);
}

.app-header__logo-icon {
  width: 32px;
  height: 32px;
  stroke-width: 2;
}

.app-header__nav {
  display: flex;
  gap: var(--space-8);
  margin-left: auto;
}

.app-header__nav-link {
  padding: 8px 16px;
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast) ease-out;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.app-header__nav-link:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-muted);
}

.app-header__nav-link.router-link-active {
  color: var(--color-primary);
  background: rgba(0, 122, 255, 0.1);
}

.app-header__nav-icon {
  font-size: 16px;
}

/* Sidebar */
.app-sidebar {
  grid-area: sidebar;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  position: sticky;
  top: 64px;
  height: calc(100vh - 64px);
}

.app-sidebar__nav {
  padding: var(--space-24) var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

.app-sidebar__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.app-sidebar__section-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  margin: 0 0 var(--space-8) 0;
  padding: 0 var(--space-12);
}

.app-sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  padding: var(--space-12);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-md);
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast) ease-out;
}

.app-sidebar__link:hover {
  color: var(--color-text-primary);
  background: var(--color-surface-muted);
}

.app-sidebar__link.router-link-active {
  color: var(--color-primary);
  background: rgba(0, 122, 255, 0.1);
}

.app-sidebar__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

/* Sidebar disabled state */
.app-sidebar__link--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Main */
.app-main {
  grid-area: main;
  padding: var(--space-24);
  overflow-x: hidden;
}

/* Footer */
.app-footer {
  grid-area: footer;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--space-24) 0;
}

.app-footer__container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-24);
  max-width: 1920px;
  margin: 0 auto;
}

.app-footer__text {
  margin: 0;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
}

.app-footer__links {
  display: flex;
  gap: var(--space-24);
}

.app-footer__link {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  transition: color var(--transition-fast) ease-out;
}

.app-footer__link:hover {
  color: var(--color-primary);
}

/* Responsive */
@media (max-width: 1024px) {
  .app-layout {
    grid-template-areas:
      'header'
      'main'
      'footer';
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    display: none;
  }

  .app-header__nav {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .app-header__container {
    padding: 0 var(--space-16);
    gap: var(--space-16);
  }

  .app-header__logo-text {
    display: none;
  }

  .app-header__nav-link {
    padding: 6px 12px;
    font-size: var(--font-size-sm);
  }

  .app-main {
    padding: var(--space-16);
  }

  .app-footer__container {
    flex-direction: column;
    gap: var(--space-16);
    text-align: center;
  }
}
</style>
