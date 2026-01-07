// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  // SSR無効化（SPA モード）
  ssr: false,
  
  // CSS
  css: [
    '@fortawesome/fontawesome-free/css/all.min.css',
    '~/styles/globals.css',
    '~/styles/components.css',
  ],
  
  // Modules
  modules: ['@pinia/nuxt'],
  
  // Pinia
  pinia: {
    storesDirs: ['./app/stores/**'],
  },
  
  // Auto imports
  imports: {
    dirs: ['./app/stores', './app/composables'],
  },
})
