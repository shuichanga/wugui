// 应用内确认/提示弹窗：替代原生 confirm()/alert()
// 原生对话框在部分移动端浏览器（如鸿蒙夸克）不弹出，导致操作静默失效
export interface DialogOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  /** 危险操作（删除/退出等）：确认按钮显示为红色 */
  danger?: boolean
}

interface DialogState {
  open: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  danger: boolean
  /** false = 单按钮提示（alert 模式） */
  showCancel: boolean
}

// 仅客户端交互时变更，SSR 请求间无共享写入风险
const state = reactive<DialogState>({
  open: false,
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
  showCancel: true,
})

let resolver: ((v: boolean) => void) | null = null

function close(result: boolean) {
  state.open = false
  const r = resolver
  resolver = null
  r?.(result)
}

export function useDialog() {
  /** 确认弹窗（双按钮），resolve true=确认 false=取消 */
  function confirmDialog(options: DialogOptions): Promise<boolean> {
    resolver?.(false)
    state.title = options.title
    state.message = options.message ?? ''
    state.confirmText = options.confirmText ?? '确定'
    state.cancelText = options.cancelText ?? '取消'
    state.danger = options.danger ?? false
    state.showCancel = true
    state.open = true
    return new Promise<boolean>(resolve => { resolver = resolve })
  }

  /** 提示弹窗（单按钮） */
  function alertDialog(title: string, message?: string): Promise<void> {
    resolver?.(false)
    state.title = title
    state.message = message ?? ''
    state.confirmText = '确定'
    state.danger = false
    state.showCancel = false
    state.open = true
    return new Promise<void>(resolve => { resolver = () => resolve() })
  }

  return { state, confirmDialog, alertDialog, closeDialog: close }
}
