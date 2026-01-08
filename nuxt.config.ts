// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  // SSR無効化（SPA モード）
  ssr: false,
  
  // GitHub Pagesなどサブパス配信時のベースURL
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      htmlAttrs: {
        lang: 'ja',
      },
      title: 'imgcrate - Browser Image Editor',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'imgcrate is a browser-based image editing tool. Resize, crop, color correction, filters, batch processing and more. All images are processed locally - never uploaded to any server.' },
        { name: 'keywords', content: 'image editor, photo editor, resize, crop, compress, convert, WebP, PNG, JPEG, online, browser, free, nekonoha, imgcrate' },
        { name: 'author', content: 'nekonoha (@tan_fantazma)' },
        { name: 'robots', content: 'index, follow' },
        // OGP
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'imgcrate - Browser Image Editor' },
        { property: 'og:description', content: 'Browser-based image editing tool. Resize, crop, color correction, filters, batch processing and more. All processing done locally.' },
        { property: 'og:site_name', content: 'imgcrate' },
        { property: 'og:locale', content: 'ja_JP' },
        { property: 'og:image', content: '/og-image.svg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:site', content: '@tan_fantazma' },
        { name: 'twitter:creator', content: '@tan_fantazma' },
        { name: 'twitter:title', content: 'imgcrate - Browser Image Editor' },
        { name: 'twitter:description', content: 'Browser-based image editing tool. All images processed locally - never uploaded to any server.' },
        { name: 'twitter:image', content: '/og-image.svg' },
        // テーマカラー
        { name: 'theme-color', content: '#6366f1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { 
          rel: 'stylesheet', 
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap' 
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  // CSS - メインエントリーポイントのみ
  css: [
    '@fortawesome/fontawesome-free/css/all.min.css',
    '~/styles/main.css',
  ],
  
  // Modules
  modules: ['@pinia/nuxt'],
  
  // Pinia
  pinia: {
    storesDirs: ['./app/stores/**'],
  },
  
  // Auto imports
  imports: {
    dirs: ['./app/stores', './app/composables', './app/types'],
  },
})
