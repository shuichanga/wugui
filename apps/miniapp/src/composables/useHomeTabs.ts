// 首页容器（swiper 单页四 tab）的共享状态
// 点击 tab / 滑动 swiper / 外部页面跳转都通过这里切换，瞬时无 reLaunch
import { ref } from 'vue'

export type TabKey = 'home' | 'items' | 'locations' | 'settings'

export const TAB_ORDER: TabKey[] = ['home', 'items', 'locations', 'settings']

// 模块级 ref：容器页、AppTabbar、各 tab 组件共享同一份状态
const activeTab = ref(0)

// 首页看板卡 → 物品 tab 的按空间过滤（消费后清空；物品列表含该空间全部下属层级）
const pendingItemRoom = ref('')

export function useHomeTabs() {
  /**
   * 切换 tab：
   * - 已在首页容器：直接改 activeTab，swiper 原生跟手滑动，瞬时完成
   * - 在其它页面：优先 navigateBack 返回容器页（容器是 navigateTo 进入时
   *   一直留在页面栈底，返回即复用已挂载的 swiper 实例，瞬时无白屏）；
   *   栈里没有容器页时才 reLaunch 兜底
   */
  function switchTab(key: TabKey) {
    const idx = TAB_ORDER.indexOf(key)
    if (idx < 0) return
    const pages = getCurrentPages()
    const route = (pages[pages.length - 1] as any)?.route ?? ''
    const onHome = route === 'pages/home/home'
    if (onHome) {
      if (activeTab.value === idx) return
      activeTab.value = idx
      return
    }
    activeTab.value = idx
    const homeIndex = pages.findIndex((p: any) => p?.route === 'pages/home/home')
    if (homeIndex >= 0) {
      uni.navigateBack({ delta: pages.length - 1 - homeIndex })
    } else {
      uni.reLaunch({ url: '/pages/home/home' })
    }
  }

  return { activeTab, pendingItemRoom, switchTab }
}
