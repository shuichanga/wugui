// 外观偏好：localStorage 持久化的展示层设置（SSR 与首帧恒为默认值，hydration 后切换，防 mismatch）
export type BoardStyle = 'clean' | 'colorful'

const KEY = 'wugui-prefs'

interface Prefs {
  boardStyle: BoardStyle
}

const DEFAULTS: Prefs = { boardStyle: 'clean' }

function read(): Prefs {
  if (import.meta.server) return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) as Partial<Prefs> }
  } catch {
    return { ...DEFAULTS }
  }
}

export function usePreferences() {
  // useState 保证多组件（首页看板 / 设置页开关）共享同一份状态
  const hydrated = useHydrated()
  const prefs = useState<Prefs>('prefs', () => ({ ...DEFAULTS }))

  onMounted(() => {
    prefs.value = read()
  })

  function update(patch: Partial<Prefs>) {
    prefs.value = { ...prefs.value, ...patch }
    if (import.meta.client) {
      try { localStorage.setItem(KEY, JSON.stringify(prefs.value)) } catch { /* 隐私模式等写入失败忽略 */ }
    }
  }

  // 渲染用视图：hydration 前恒为默认值，避免 SSR/客户端不一致
  const view = computed(() => (hydrated.value ? prefs.value : DEFAULTS))

  return {
    boardStyle: computed(() => view.value.boardStyle),
    setBoardStyle: (v: BoardStyle) => update({ boardStyle: v }),
  }
}
