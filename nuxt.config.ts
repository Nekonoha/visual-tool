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
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { 
          rel: 'stylesheet', 
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap' 
        },
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
