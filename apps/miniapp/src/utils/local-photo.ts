// 本地照片：wx.chooseImage 拿到临时路径 → 压缩 → 复制进小程序本地目录（wxfile://local/）
// 小程序临时路径 wxfile://tmp_ 会随重启失效，M1 阶段先复制到持久化本地目录，
// M2 上云同步时（订阅用户）从 wxfile://local/ 上传即可

const PHOTO_PREFIX = '__wugui_photo_'

export const MAX_PHOTOS_PER_ITEM = 3
/** 别名：与 useLocalData.MAX_PHOTOS 对齐（业务代码统一走 local-photo 出口） */
export const MAX_PHOTOS = MAX_PHOTOS_PER_ITEM
export const MAX_WIDTH = 1280
export const COMPRESS_QUALITY = 80

/** 选图 → 压缩 → 持久化到 wxfile://local 目录，返回本地路径 */
export function pickLocalPhoto(remaining: number): Promise<string> {
  if (remaining <= 0) return Promise.reject(new Error('已达上限'))
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    wx.chooseMedia({
      count: Math.min(remaining, MAX_PHOTOS_PER_ITEM),
      mediaType: ['image'],
      sizeType: ['compressed', 'original'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tmp = res.tempFiles?.[0]?.tempFilePath
        if (!tmp) {
          reject(new Error('未选到照片'))
          return
        }
        try {
          resolve(await saveToPersistent(tmp))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => reject(new Error(err?.errMsg || '选图失败')),
    })
    // #endif
  })
}

/** 复制到小程序本地持久目录，避免临时文件被系统清理 */
function saveToPersistent(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    try {
      const fs = wx.getFileSystemManager()
      const dest = `${wx.env.USER_DATA_PATH}/${PHOTO_PREFIX + Date.now()}_${Math.floor(Math.random() * 1e6)}.jpg`
      fs.saveFile({
        tempFilePath: src,
        filePath: dest,
        success: (res) => resolve(res.savedFilePath),
        fail: (err) => reject(new Error(err?.errMsg || '保存失败')),
      })
    } catch (e) {
      reject(e)
    }
    // #endif
  })
}

/** 删除本地照片文件（清理事物时同步清理磁盘） */
export function removeLocalPhoto(path: string) {
  if (!path) return
  // #ifdef MP-WEIXIN
  try {
    wx.getFileSystemManager().unlink({ filePath: path, fail: () => {} })
  } catch {
    /* noop */
  }
  // #endif
}

/** 批量清理 */
export function removeLocalPhotos(paths: string[]) {
  for (const p of paths) removeLocalPhoto(p)
}

/** 相对时间：今天显示 HH:MM，昨天显示"昨天"，其它显示"M月D日" */
export function timeLabel(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const yesterday = new Date(now.getTime() - 86400000)
  if (d.toDateString() === yesterday.toDateString()) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 绝对时间："M月D日 HH:MM"（详情页"添加于"用） */
export function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 标签分色（对齐 Web 端 tagStyle 的浅色底 + 深色字） */
const TAG_COLORS: Array<{ bg: string; color: string }> = [
  { bg: '#e7f4ec', color: '#0f7a38' },
  { bg: '#f0f2f0', color: '#51605a' },
  { bg: '#fdeded', color: '#dc2626' },
  { bg: '#e4eefc', color: '#1d4ed8' },
  { bg: '#fbf0de', color: '#b45309' },
  { bg: '#f3e8f5', color: '#8b5cf6' },
]

export function tagStyle(tag: string): { backgroundColor: string; color: string } {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0
  return TAG_COLORS[h % TAG_COLORS.length]
}
