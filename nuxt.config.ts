import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'

// 版本号：单一数据源为 package.json；也支持 APP_VERSION 环境变量覆盖（用于 CI 发布场景）
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

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
  runtimeConfig: {
    public: {
      appVersion: process.env.APP_VERSION ?? pkg.version,
    },
  },
  app: {
    head: {
      title: '物归',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: '家庭收纳管理：记录物品与收纳空间，全家人共享' },
        { name: 'theme-color', content: '#059669' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },
})
