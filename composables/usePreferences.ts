// 外观偏好：localStorage 持久化的展示层设置（SSR 与首帧恒为默认值，hydration 后切换，防 mismatch）
export type BoardStyle = 'clean' | 'colorful'
export type ThemeId = 'oasis' | 'timber' | 'inkstone'

const KEY = 'wugui-prefs'

// 主题 → <html data-theme>；meta theme-color 同步浏览器 chrome 底色
const THEME_ATTR: Record<ThemeId, string> = { oasis: '', timber: 'timber', inkstone: 'inkstone' }
const THEME_BG: Record<ThemeId, string> = { oasis: '#f3f6f2', timber: '#f6f1e7', inkstone: '#f2f2f0' }

interface Prefs {
  theme: ThemeId
  boardStyle: BoardStyle
}

const DEFAULTS: Prefs = { theme: 'oasis', boardStyle: 'clean' }
const THEME_IDS: readonly string[] = ['oasis', 'timber', 'inkstone']

function sanitize(p: Partial<Prefs>): Prefs {
  return {
    theme: p.theme && THEME_IDS.includes(p.theme) ? p.theme : DEFAULTS.theme,
    boardStyle: p.boardStyle === 'colorful' ? 'colorful' : DEFAULTS.boardStyle,
  }
}

function read(): Prefs {
  if (import.meta.server) return { ...DEFAULTS }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return sanitize(JSON.parse(raw) as Partial<Prefs>)
  } catch {
    return { ...DEFAULTS }
  }
}

// 渲染前/切换时把主题挂到 <html> 上（oasis 为默认值，移除属性即可）
function applyThemeDom(theme: ThemeId) {
  if (import.meta.server) return
  const attr = THEME_ATTR[theme]
  if (attr) document.documentElement.dataset.theme = attr
  else delete document.documentElement.dataset.theme
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_BG[theme])
}

export function usePreferences() {
  // useState 保证多组件（首页看板 / 设置页开关）共享同一份状态
  const hydrated = useHydrated()
  const prefs = useState<Prefs>('prefs', () => ({ ...DEFAULTS }))

  onMounted(() => {
    prefs.value = read()
    // 内联脚本已提前设好属性，这里兜底同步（脚本失败 / 手动清过 DOM 的场景）
    applyThemeDom(prefs.value.theme)
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
    theme: computed(() => view.value.theme),
    setTheme: (v: ThemeId) => {
      update({ theme: v })
      applyThemeDom(v)
    },
    boardStyle: computed(() => view.value.boardStyle),
    setBoardStyle: (v: BoardStyle) => update({ boardStyle: v }),
  }
}
