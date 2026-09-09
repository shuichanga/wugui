// 注册 Service Worker（PWA 可安装 + 离线兜底），仅生产环境
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return
  if (import.meta.dev) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
})
