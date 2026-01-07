<template>
  <section class="legal-page">
    <div class="legal-page__container">
      <h1 class="legal-page__title">プライバシーポリシー</h1>
      <p class="legal-page__intro">
        本サービスは、ユーザーのプライバシーを尊重し、個人情報の取り扱いに細心の注意を払います。
      </p>
      <div class="legal-page__section">
        <h2>収集する情報</h2>
        <p>アップロードされた画像はブラウザ内で処理され、サーバーへ送信されません。</p>
      </div>
      <div class="legal-page__section">
        <h2>利用目的</h2>
        <p>提供する画像処理機能の実行、および品質向上のための匿名データ統計のみを目的とします。</p>
      </div>
      <div class="legal-page__section">
        <h2>第三者提供</h2>
        <p>法令に基づく場合を除き、個人情報を第三者へ提供することはありません。</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.legal-page {
  padding: var(--space-48) var(--space-24);
  background: var(--color-background);
  color: var(--color-text-primary);
}

.legal-page__container {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

.legal-page__title {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
}

.legal-page__intro {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.legal-page__section {
  padding: var(--space-16);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.legal-page__section h2 {
  margin: 0 0 var(--space-8) 0;
  font-size: 20px;
}

.legal-page__section p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
</style>
