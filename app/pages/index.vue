<template>
  <div class="home">
    <div class="hero">
      <div class="hero__content">
        <h1 class="hero__title">Visual Tool</h1>
        <p class="hero__subtitle">ブラウザで完結する高機能画像編集ツール</p>
        <p class="hero__description">
          アップロードした画像はすべてブラウザ内で処理され、サーバーに送信されることはありません。
        </p>
        <div class="hero__actions">
          <NuxtLink to="/editor" class="hero__button hero__button--primary">
            画像編集を始める
          </NuxtLink>
          <NuxtLink to="/compress" class="hero__button hero__button--secondary">
            バッチ圧縮
          </NuxtLink>
        </div>
      </div>

      <div class="hero__image">
        <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="50" y="50" width="300" height="200" rx="8" fill="var(--color-surface-muted)" stroke="var(--color-border)" stroke-width="2"/>
          <circle cx="100" cy="100" r="20" fill="var(--color-primary)" opacity="0.3"/>
          <path d="M50 200 L150 100 L250 150 L350 80 L350 250 L50 250 Z" fill="var(--color-primary)" opacity="0.2"/>
        </svg>
      </div>
    </div>

    <div class="features">
      <h2 class="features__title">主な機能</h2>
      <div class="features__grid">
        <NuxtLink to="/editor" class="feature-card">
          <div class="feature-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          <h3 class="feature-card__title">画像編集</h3>
          <p class="feature-card__description">
            リサイズ、クロップ、回転、フィルターなど多彩な編集機能
          </p>
        </NuxtLink>

        <NuxtLink to="/compress" class="feature-card">
          <div class="feature-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="16 16 12 12 8 16"></polyline>
              <line x1="12" y1="12" x2="12" y2="21"></line>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
            </svg>
          </div>
          <h3 class="feature-card__title">バッチ圧縮</h3>
          <p class="feature-card__description">
            複数の画像を一括で圧縮・最適化
          </p>
        </NuxtLink>

        <NuxtLink to="/convert" class="feature-card">
          <div class="feature-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
            </svg>
          </div>
          <h3 class="feature-card__title">形式変換</h3>
          <p class="feature-card__description">
            JPEG、PNG、WebPなど様々な形式に変換
          </p>
        </NuxtLink>

        <div class="feature-card feature-card--disabled">
          <div class="feature-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
              <line x1="18" y1="9" x2="12" y2="15"></line>
              <line x1="12" y1="9" x2="18" y2="15"></line>
            </svg>
          </div>
          <h3 class="feature-card__title">背景削除</h3>
          <p class="feature-card__description">
            AIで背景を自動削除（近日公開）
          </p>
        </div>

        <div class="feature-card feature-card--disabled">
          <div class="feature-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
            </svg>
          </div>
          <h3 class="feature-card__title">ウォーターマーク</h3>
          <p class="feature-card__description">
            画像やテキストの透かしを追加（近日公開）
          </p>
        </div>

        <div class="feature-card feature-card--disabled">
          <div class="feature-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
          </div>
          <h3 class="feature-card__title">クラウド連携</h3>
          <p class="feature-card__description">
            Google Drive、Dropboxと連携（近日公開）
          </p>
        </div>
      </div>
    </div>

    <div class="cta">
      <h2 class="cta__title">今すぐ始めましょう</h2>
      <p class="cta__description">アカウント登録不要、完全無料でご利用いただけます</p>
      <NuxtLink to="/editor" class="cta__button">
        画像編集を始める
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

/* Hero Section */
.hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-64);
  align-items: center;
  padding: var(--space-64) 0;
  min-height: 500px;
}

.hero__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

.hero__title {
  font-size: 56px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.1;
}

.hero__subtitle {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0;
}

.hero__description {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.hero__actions {
  display: flex;
  gap: var(--space-16);
  margin-top: var(--space-16);
}

.hero__button {
  padding: 14px 32px;
  font-size: var(--font-size-lg);
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast) ease-out;
  display: inline-block;
}

.hero__button--primary {
  background: var(--color-primary);
  color: white;
  box-shadow: var(--shadow-md);
}

.hero__button--primary:hover {
  background: #0056b3;
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.hero__button--secondary {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 2px solid var(--color-border);
}

.hero__button--secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.hero__image {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero__image svg {
  width: 100%;
  max-width: 400px;
  height: auto;
}

/* Features Section */
.features {
  padding: var(--space-64) 0;
  background: var(--color-surface);
  margin: 0 calc(var(--space-24) * -1);
  padding-left: var(--space-24);
  padding-right: var(--space-24);
}

.features__title {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  margin: 0 0 var(--space-48) 0;
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-24);
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-32);
  text-decoration: none;
  transition: all var(--transition-fast) ease-out;
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.feature-card:hover:not(.feature-card--disabled) {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
}

.feature-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.feature-card__icon {
  width: 48px;
  height: 48px;
  color: var(--color-primary);
}

.feature-card__icon svg {
  width: 100%;
  height: 100%;
  stroke-width: 2;
}

.feature-card__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.feature-card__description {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

/* CTA Section */
.cta {
  text-align: center;
  padding: var(--space-64) 0;
}

.cta__title {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-16) 0;
}

.cta__description {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-32) 0;
}

.cta__button {
  padding: 16px 48px;
  font-size: var(--font-size-lg);
  font-weight: 700;
  background: var(--color-primary);
  color: white;
  text-decoration: none;
  border-radius: var(--radius-lg);
  display: inline-block;
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-fast) ease-out;
}

.cta__button:hover {
  background: #0056b3;
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}

/* Responsive */
@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
    gap: var(--space-48);
  }

  .hero__title {
    font-size: 40px;
  }

  .features__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero {
    padding: var(--space-32) 0;
  }

  .hero__title {
    font-size: 32px;
  }

  .hero__subtitle {
    font-size: 18px;
  }

  .hero__actions {
    flex-direction: column;
  }

  .hero__button {
    text-align: center;
  }

  .features {
    padding: var(--space-48) 0;
  }

  .features__grid {
    grid-template-columns: 1fr;
  }

  .cta {
    padding: var(--space-48) 0;
  }

  .cta__title {
    font-size: 28px;
  }
}
</style>
