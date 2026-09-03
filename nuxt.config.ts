import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  nitro: {
    preset: 'cloudflare-pages',
    modules: ['nitro-cloudflare-dev'],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: '物归',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: '家庭收纳管理：记录物品与收纳位置，全家人共享' },
      ],
    },
  },
})
