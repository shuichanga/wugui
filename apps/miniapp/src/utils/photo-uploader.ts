// 照片云同步：扫描本地 photoPaths 暂存照片 → OSS 三步直传（sign → uni.uploadFile → confirm）
// 成功一张回填一张（photoPaths 移除 + photoRefs 追加），中断重跑天然幂等（只传剩余的）
// 由 useSync 在 syncNow 成功后触发（此时 item 已 push 到服务端，sign 的归属校验才能通过）
import { ITEM, useStore, type LocalItem } from '../composables/useLocalData'
import { api } from './api'

interface UploadSign {
  policy: string
  signature: string
  accessKeyId: string
  host: string
  key: string
}

function mimeByPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

/** 上传当前住所全部待传照片；返回 { uploaded, failed } 供提示 */
export async function uploadPendingPhotos(): Promise<{ uploaded: number; failed: number }> {
  const { store, items } = useStore()
  let uploaded = 0
  let failed = 0

  for (const item of items()) {
    if (!item.photoPaths?.length) continue
    for (const path of [...item.photoPaths]) {
      try {
        await uploadOne(store, item, path)
        uploaded++
      } catch {
        failed++
      }
    }
  }
  return { uploaded, failed }
}

async function uploadOne(
  store: ReturnType<typeof useStore>['store'],
  item: LocalItem,
  path: string,
) {
  const contentType = mimeByPath(path)
  const sign = await api.post<UploadSign>(`/items/${item.id}/photos/sign`, { contentType })

  // OSS PostObject：uni.uploadFile 把 file 追加在 formData 之后（file 必须是最后一个字段）
  const uploadRes = await uni.uploadFile({
    url: sign.host,
    filePath: path,
    name: 'file',
    formData: {
      key: sign.key,
      policy: sign.policy,
      OSSAccessKeyId: sign.accessKeyId,
      signature: sign.signature,
      'Content-Type': contentType,
      success_action_status: '200',
    },
  })
  if (uploadRes.statusCode !== 200 && uploadRes.statusCode !== 204) {
    throw new Error(`OSS 上传失败（${uploadRes.statusCode}）`)
  }

  const confirmed = await api.post<{ ok: boolean; photoId: string; sortOrder: number }>(
    `/items/${item.id}/photos/confirm`,
    { key: sign.key },
  )

  // 回填本地：photoPaths 移除已上传项、photoRefs 追加云端引用。
  // 只动照片字段，不 bump updatedAt（文字数据 LWW 基准不受照片上传影响）
  const fresh = store.get<LocalItem>(ITEM, item.id)
  if (!fresh) return
  const refs = [...(fresh.photoRefs ?? []), { photoId: confirmed.photoId, ossKey: sign.key, sortOrder: confirmed.sortOrder }]
  store.put<LocalItem>(ITEM, {
    ...fresh,
    photoPaths: fresh.photoPaths.filter(p => p !== path),
    photoRefs: refs,
  })
}

// ---- 云端照片 URL 解析（展示用） ----

// 内存缓存：photoId → 签名 URL（1 小时有效；小程序冷启动/过期后重新解析）
const urlCache = new Map<string, { url: string; expiresAt: number }>()

/** 拿云端照片的签名 URL（缓存有效期内直接命中；过期重新签） */
export async function resolvePhotoUrl(photoId: string): Promise<string | null> {
  const hit = urlCache.get(photoId)
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.url
  try {
    const res = await api.get<{ url: string }>(`/photos/${photoId}/url`)
    urlCache.set(photoId, { url: res.url, expiresAt: Date.now() + 55 * 60 * 1000 })
    return res.url
  } catch {
    return null
  }
}
