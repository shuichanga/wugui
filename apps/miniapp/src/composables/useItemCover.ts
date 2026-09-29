// 物品卡片封面解析（模块级缓存，多页面共享）
// 背景：照片上传成功后本地 photoPaths 被移除、云端引用追加到 photoRefs（见 utils/photo-uploader），
// 卡片只读 photoPaths 会显示占位图；这里对齐详情页链路：本地路径优先，缺省时解析云端签名 URL 回退
import { ref } from 'vue'
import { resolvePhotoUrl } from '../utils/photo-uploader'
import type { LocalItem } from './useLocalData'

// itemId → 云端封面签名 URL（resolvePhotoUrl 自带内存缓存，命中即时返回）
const covers = ref<Record<string, string>>({})

export function useItemCover() {
  /** 卡片封面 src：本地路径优先，其次云端解析结果（异步填充后响应式更新） */
  function coverSrc(it: LocalItem): string {
    return it.photoPaths[0] || covers.value[it.id] || ''
  }

  /** 批量解析列表中缺本地路径物品的云端封面；已有结果的物品跳过 */
  async function resolveCovers(list: LocalItem[]) {
    for (const it of list) {
      if (it.photoPaths[0] || covers.value[it.id] || !it.photoRefs?.length) continue
      const url = await resolvePhotoUrl(it.photoRefs[0].photoId)
      // #region debug-point D:cover-resolve (sync-pull-missing-items)
      uni.request({ url: 'http://127.0.0.1:7777/event', method: 'POST', data: { sessionId: 'sync-pull-missing-items', runId: 'pre', hypothesisId: 'D', location: 'useItemCover.ts:resolveCovers', msg: '[DEBUG] cover resolved', data: { itemId: it.id.slice(0, 8), hasLocal: !!it.photoPaths[0], refs: it.photoRefs.length, url: url ? url.slice(0, 60) : null }, ts: Date.now() } })
      // #endregion
      if (url) covers.value = { ...covers.value, [it.id]: url }
    }
  }

  return { coverSrc, resolveCovers }
}

/** 物品照片变动（如编辑页删除）后清掉该物品的封面缓存，下次列表渲染重新解析 */
export function invalidateCover(itemId: string) {
  if (covers.value[itemId]) {
    const { [itemId]: _removed, ...rest } = covers.value
    covers.value = rest
  }
}
