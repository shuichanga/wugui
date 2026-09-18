import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'

// 版本号：单一数据源为 package.json；也支持 APP_VERSION 环境变量覆盖（用于 CI 发布场景）
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  // 纯 SPA：后端数据全部来自独立 NestJS API（同源 /api 由 nginx 反代），本地开发走 devProxy
  // 无 SSR 依赖（旧 Cloudflare 版所有取数本就是 client-only），静态托管最简单
  ssr: false,
  nitro: {
    // 本地开发：/api 代理到本地 NestJS（pnpm dev:api，端口 3000）
    // devProxy 会剥掉 /api 前缀，故 target 需补回 /api，最终 path = /api/...
    devProxy: {
      '/api': { target: 'http://localhost:3000/api', changeOrigin: true },
    },
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
        { name: 'theme-color', content: '#f3f6f2' },
      ],
      // 防首帧闪烁：渲染前从 localStorage 读主题挂到 <html data-theme>（默认清新绿洲无属性）
      script: [
        {
          innerHTML:
            "try{var p=JSON.parse(localStorage.getItem('wugui-prefs')||'{}');if(p.theme&&p.theme!=='oasis')document.documentElement.dataset.theme=p.theme}catch(e){}",
        },
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
