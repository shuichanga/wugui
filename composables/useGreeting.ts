// 问候语与日期：依赖客户端本地时间（问候语 SSR 会以服务器时间渲染，日期行需调用方 hydration gate）
export function useGreeting() {
  const auth = useAuthStore()

  const greeting = computed(() => {
    const h = new Date().getHours()
    const period = h < 6 ? '夜深了' : h < 11 ? '早上好' : h < 13 ? '中午好' : h < 18 ? '下午好' : '晚上好'
    const name = auth.user?.displayName?.trim()
    return name ? `${period}，${name}` : period
  })

  const today = computed(() => {
    const d = new Date()
    const week = ['日', '一', '二', '三', '四', '五', '六']
    return `${d.getMonth() + 1}月${d.getDate()}日 周${week[d.getDay()]}`
  })

  return { greeting, today }
}
