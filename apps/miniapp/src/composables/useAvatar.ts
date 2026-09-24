// 用户头像：本地 + 服务端双模式
//  - 未登录（本地模式）：头像图持久化到小程序本地目录，路径存 Storage（M1 行为）
//  - 已登录：上传走 POST /api/me/avatar（multipart，服务端磁盘存储），展示走服务端头像
//    下载缓存 —— 服务端 /api/avatars/:userId 需要 Authorization 头，小程序 <image> 无法携带，
//    所以用 uni.request(arraybuffer) 下载到本地文件，按 avatarUrl 里的 ?v=文件名 版本号缓存：
//    版本未变直接用缓存，头像在 Web 端被更换后 v 变化 → 自动重新下载（双端一致）
import { ref } from 'vue'
import { API_BASE } from '../config'
import { api } from '../utils/api'
import { useAuth } from './useAuth'

const PATH_KEY = 'wugui:avatar-path'
const CACHE_KEY = 'wugui:avatar-cache'

interface AvatarCache { v: string; path: string }

const avatarPath = ref<string>(uni.getStorageSync(PATH_KEY) || '')

function persistPath(path: string) {
  avatarPath.value = path
  uni.setStorageSync(PATH_KEY, path)
}

function readCache(): AvatarCache | null {
  try {
    const raw = uni.getStorageSync(CACHE_KEY)
    return raw ? (JSON.parse(raw) as AvatarCache) : null
  } catch {
    return null
  }
}

function removeLocalFile(path: string) {
  if (!path) return
  // #ifdef MP-WEIXIN
  try {
    wx.getFileSystemManager().unlink({ filePath: path, fail: () => {} })
  } catch { /* noop */ }
  // #endif
}

/** 把服务端头像（avatarUrl 形如 /api/avatars/{id}?v={文件名}）下载缓存为本地文件 */
async function downloadToCache(avatarUrl: string): Promise<void> {
  const auth = useAuth()
  const v = avatarUrl.split('v=')[1] ?? Date.now().toString()

  const cached = readCache()
  if (cached && cached.v === v && cached.path) {
    persistPath(cached.path)
    return
  }

  const res = await uni.request({
    url: `${API_BASE}${avatarUrl}`,
    method: 'GET',
    header: { Authorization: `Bearer ${auth.state.token}` },
    responseType: 'arraybuffer',
  })
  if (res.statusCode < 200 || res.statusCode >= 300) throw new Error('头像下载失败')

  // #ifdef MP-WEIXIN
  const fs = wx.getFileSystemManager()
  const dest = `${wx.env.USER_DATA_PATH}/__wugui_avatar_${v}`
  fs.writeFileSync(dest, res.data as ArrayBuffer)
  if (cached?.path && cached.path !== dest) removeLocalFile(cached.path)
  uni.setStorageSync(CACHE_KEY, JSON.stringify({ v, path: dest } satisfies AvatarCache))
  persistPath(dest)
  // #endif
}

/**
 * 从服务端同步头像（App onShow / 登录后调用）：
 * /auth/me 的 user.avatarUrl 非空 → 版本化下载缓存；为空 → 清掉服务端头像缓存
 */
export async function syncAvatarFromServer(): Promise<void> {
  const auth = useAuth()
  if (!auth.isLogged) return
  try {
    const me = await api.get<{ user: { avatarUrl: string | null } }>('/auth/me')
    const url = me.user?.avatarUrl
    if (!url) {
      // 服务端无头像：清服务端缓存（本地模式的自选头像不动）
      const cached = readCache()
      if (cached) {
        removeLocalFile(cached.path)
        uni.removeStorageSync(CACHE_KEY)
      }
      return
    }
    await downloadToCache(url)
  } catch {
    // 静默：保留当前显示（离线时用缓存）
  }
}

/** 上传头像：已登录 → 服务端（双端一致）；未登录 → 仅本地（M1 行为） */
export async function uploadAvatar(path: string): Promise<void> {
  const auth = useAuth()
  if (!auth.isLogged) {
    const old = avatarPath.value
    persistPath(path)
    if (old && old !== path) removeLocalFile(old)
    return
  }

  const res = await uni.uploadFile({
    url: `${API_BASE}/api/me/avatar`,
    filePath: path,
    name: 'file',
    header: { Authorization: `Bearer ${auth.state.token}` },
  })
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(res.statusCode === 413 ? '头像不能超过 1MB' : '头像上传失败')
  }
  const parsed = JSON.parse(res.data) as { ok: boolean; avatarUrl: string }
  removeLocalFile(path) // 临时选图文件已上传，清理本地副本
  await downloadToCache(parsed.avatarUrl)
}

/** 移除头像：已登录 → 服务端删除（双端一致）；未登录 → 仅本地 */
export async function removeAvatar(): Promise<void> {
  const auth = useAuth()
  if (auth.isLogged) {
    await api.delete('/me/avatar')
    const cached = readCache()
    if (cached) {
      removeLocalFile(cached.path)
      uni.removeStorageSync(CACHE_KEY)
    }
    persistPath('')
    return
  }
  const old = avatarPath.value
  clearAvatar()
  if (old) removeLocalFile(old)
}

export function useAvatar() {
  return {
    avatarPath,
    setAvatar,
    clearAvatar,
    uploadAvatar,
    removeAvatar,
  }
}

function setAvatar(path: string) {
  persistPath(path)
}

function clearAvatar() {
  persistPath('')
  uni.removeStorageSync(CACHE_KEY)
}
