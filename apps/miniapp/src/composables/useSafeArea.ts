// 胶囊对齐安全区：微信端自定义导航下，uni 注入的 --status-bar-height 是固定 25px，
// 而真机状态栏普遍 36~59px，导致页面内容整体偏上、被胶囊遮挡。
// 这里用系统真实状态栏高度 + 胶囊矩形（wx.getMenuButtonBoundingClientRect）
// 计算导航带高度，让页面标题与右上角胶囊垂直居中对齐。
//
// 用法：各页根节点 <view class="page" :style="topVars">，
// 变量沿 DOM 继承，全局 .page / .topbar 公式自动拿到真实值。

interface CapsuleRect {
  top: number
  height: number
}

let cached: { statusBarHeight: number; navBarHeight: number } | null = null

function computeOnce(): { statusBarHeight: number; navBarHeight: number } {
  if (cached) return cached
  let statusBarHeight = 0
  let navBarHeight = 44

  // #ifdef MP-WEIXIN
  try {
    statusBarHeight = uni.getSystemInfoSync().statusBarHeight ?? 0
    const rect = (
      uni as unknown as { getMenuButtonBoundingClientRect?: () => CapsuleRect }
    ).getMenuButtonBoundingClientRect?.()
    // 导航带高度 = 胶囊高度 + 上下留白（胶囊 top 与状态栏的间距上下各一份）
    if (rect && rect.height > 0) {
      navBarHeight = rect.height + Math.max(rect.top - statusBarHeight, 0) * 2
    }
  } catch {
    /* 模拟器或低版本基础库：保持默认 44px */
  }
  // #endif

  // #ifndef MP-WEIXIN
  try {
    statusBarHeight = uni.getSystemInfoSync().statusBarHeight ?? 0
  } catch {
    /* noop */
  }
  // #endif

  cached = { statusBarHeight, navBarHeight }
  return cached
}

export function useSafeArea() {
  const { statusBarHeight, navBarHeight } = computeOnce()
  /** 挂在各页根节点，覆盖 uni 注入的固定值 */
  const topVars = {
    '--status-bar-height': `${statusBarHeight}px`,
    '--nav-bar-height': `${navBarHeight}px`,
  }
  /** 供 <page-meta :page-style> 使用：变量直接写到 page 元素上（比视图内联样式更可靠，全页继承） */
  const pageStyle = `--status-bar-height: ${statusBarHeight}px; --nav-bar-height: ${navBarHeight}px;`
  return { statusBarHeight, navBarHeight, topVars, pageStyle }
}
