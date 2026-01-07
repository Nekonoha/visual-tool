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
            <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
          </div>
          <h3 class="feature-card__title">画像編集</h3>
          <p class="feature-card__description">
            リサイズ、クロップ、回転、フィルターなど多彩な編集機能
          </p>
        </NuxtLink>

        <NuxtLink to="/compress" class="feature-card">
          <div class="feature-card__icon">
            <i class="fa-solid fa-compress" aria-hidden="true"></i>
          </div>
          <h3 class="feature-card__title">バッチ圧縮</h3>
          <p class="feature-card__description">
            複数の画像を一括で圧縮・最適化
          </p>
        </NuxtLink>

        <NuxtLink to="/convert" class="feature-card">
          <div class="feature-card__icon">
            <i class="fa-solid fa-right-left" aria-hidden="true"></i>
          </div>
          <h3 class="feature-card__title">形式変換</h3>
          <p class="feature-card__description">
            JPEG、PNG、WebPなど様々な形式に変換
          </p>
        </NuxtLink>

        <NuxtLink to="/organize" class="feature-card">
          <div class="feature-card__icon">
            <i class="fa-solid fa-folder-tree" aria-hidden="true"></i>
          </div>
          <h3 class="feature-card__title">整理・リネーム</h3>
          <p class="feature-card__description">
            パターン名付けとサムネイル生成で一括整理
          </p>
        </NuxtLink>
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
