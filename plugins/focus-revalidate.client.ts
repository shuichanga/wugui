// 实时同步阶段一（Web 端）：窗口重新聚焦时全量 revalidate 页面数据
// 与小程序前台 30s 轮询互补——他端（小程序）的变更在切回浏览器标签页时立即可见
export default defineNuxtPlugin(() => {
  let last = 0
  window.addEventListener('focus', () => {
    const now = Date.now()
    if (now - last < 2000) return
    last = now
    // Nuxt 自动导入：刷新所有 useAsyncData 缓存（SWR 页面重新拉取最新数据）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(refreshNuxtData as any)()
  })
})
