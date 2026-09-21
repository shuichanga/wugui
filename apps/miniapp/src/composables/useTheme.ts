// 外观偏好：主题配色 + 空间看板背景（对齐 Web 端 composables/usePreferences.ts）
// 小程序内所有页面共享同一 JS 运行时，模块级 ref 即为跨页共享状态
import { computed, ref } from 'vue'

export type BoardStyle = 'clean' | 'colorful'
export type ThemeId = 'oasis' | 'timber' | 'inkstone'

const KEY_THEME = 'wugui:theme'
const KEY_BOARD = 'wugui:board-style'

const THEME_IDS: readonly string[] = ['oasis', 'timber', 'inkstone']

/** 主题色卡：设置页色板预览用（与 App.vue 中 CSS 变量保持一致） */
export const THEMES: { id: ThemeId; label: string; bg: string; primary: string; tint: string; signal: string }[] = [
  { id: 'oasis', label: '清新绿洲', bg: '#f3f6f2', primary: '#16a34a', tint: '#e3f3ea', signal: '#16a34a' },
  { id: 'timber', label: '暖木收纳', bg: '#f6f1e7', primary: '#33604a', tint: '#f0e7d4', signal: '#33604a' },
  { id: 'inkstone', label: '现代墨石', bg: '#f2f2f0', primary: '#17191b', tint: '#e4e6e6', signal: '#0e9f6e' },
]

function readTheme(): ThemeId {
  const v = uni.getStorageSync(KEY_THEME)
  return THEME_IDS.includes(v) ? (v as ThemeId) : 'oasis'
}

function readBoard(): BoardStyle {
  return uni.getStorageSync(KEY_BOARD) === 'colorful' ? 'colorful' : 'clean'
}

const theme = ref<ThemeId>(readTheme())
const boardStyle = ref<BoardStyle>(readBoard())

/** 页面根元素的主题类名，CSS 变量在 App.vue 中按类定义 */
const themeClass = computed(() => `theme-${theme.value}`)

export function useTheme() {
  function setTheme(id: ThemeId) {
    theme.value = id
    uni.setStorageSync(KEY_THEME, id)
  }

  function setBoardStyle(style: BoardStyle) {
    boardStyle.value = style
    uni.setStorageSync(KEY_BOARD, style)
  }

  return { theme, boardStyle, themeClass, setTheme, setBoardStyle }
}
