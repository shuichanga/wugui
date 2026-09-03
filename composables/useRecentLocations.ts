// 最近用过的收纳位置（localStorage，最多 5 条）
export interface RecentLocation {
  id: string
  label: string
  roomId: string
  furnitureId?: string
  compartmentId?: string
}

const KEY = 'wugui_recent_locations'

export function useRecentLocations() {
  const list = useState<RecentLocation[]>('recent-locations', () => [])

  function load() {
    if (import.meta.server || list.value.length) return
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) list.value = JSON.parse(raw)
    } catch {
      list.value = []
    }
  }

  function push(loc: RecentLocation) {
    list.value = [loc, ...list.value.filter(x => x.id !== loc.id)].slice(0, 5)
    try {
      localStorage.setItem(KEY, JSON.stringify(list.value))
    } catch { /* 隐私模式等场景忽略 */ }
  }

  // 登录/登出时调用，避免不同账号看到彼此的最近位置
  function clear() {
    list.value = []
    try {
      localStorage.removeItem(KEY)
    } catch { /* 忽略 */ }
  }

  return { list, load, push, clear }
}
