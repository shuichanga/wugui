/* 物归 Service Worker：PWA 可安装 + 静态资源缓存 + 离线页面兜底
   策略：API 一律直连不缓存（认证与数据实时性优先）；
   Vite 带哈希的静态资源缓存优先；页面导航网络优先、离线回退缓存。
   修改缓存行为时递增 CACHE_VERSION 以触发旧缓存清理。 */
const CACHE_VERSION = 'wugui-v1'
const APP_SHELL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll([APP_SHELL, '/favicon.ico', '/apple-touch-icon.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // API 请求直连：绝不缓存
  if (url.pathname.startsWith('/api/')) return

  // 静态资源（带内容哈希、不可变）：缓存优先
  if (url.pathname.startsWith('/_nuxt/') || /\.(png|ico|svg|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached ?? fetch(request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE_VERSION).then(cache => cache.put(request, copy))
        return response
      })),
    )
    return
  }

  // 页面导航：网络优先，离线时回退到本次会话缓存过的页面或应用壳
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE_VERSION).then(cache => cache.put(request, copy))
        return response
      }).catch(() =>
        caches.match(request).then(cached => cached ?? caches.match(APP_SHELL)),
      ),
    )
  }
})
