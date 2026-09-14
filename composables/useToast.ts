// 全局浮动提示（toast）：fixed 定位不占文档流，短消息反馈不引起布局跳动
type ToastType = 'success' | 'error'

interface ToastState {
  visible: boolean
  message: string
  type: ToastType
}

// 模块级共享状态（与 useDialog 同模式）：跨组件单例
const state = reactive<ToastState>({
  visible: false,
  message: '',
  type: 'success',
})

let timer: ReturnType<typeof setTimeout> | null = null
const DURATION = 2500

export function useToast() {
  /** 显示提示，2.5 秒后自动消失；连续调用会刷新内容与计时 */
  function toast(message: string, type: ToastType = 'success') {
    state.message = message
    state.type = type
    state.visible = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      state.visible = false
      timer = null
    }, DURATION)
  }

  return { state, toast }
}
