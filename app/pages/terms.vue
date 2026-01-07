<template>
  <section class="legal-page">
    <div class="legal-page__container">
      <h1 class="legal-page__title">利用規約</h1>
      <p class="legal-page__intro">
        本サービスをご利用いただく前に、以下の利用規約をお読みください。
      </p>
      <div class="legal-page__section">
        <h2>サービス提供</h2>
        <p>本サービスはブラウザ上で提供され、機能は予告なく変更・停止される場合があります。</p>
      </div>
      <div class="legal-page__section">
        <h2>禁止事項</h2>
        <p>法令に違反する行為、不正アクセス、第三者の権利侵害となる行為は禁止されています。</p>
      </div>
      <div class="legal-page__section">
        <h2>免責事項</h2>
        <p>本サービスの利用によって生じた損害について、運営者は責任を負いかねます。</p>
      </div>
      <div class="legal-page__section">
        <h2>準拠法</h2>
        <p>本利用規約は日本法に準拠し、日本の裁判所を第一審の専属的合意管轄とします。</p>
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
