import type { PendingPhoto } from '~/components/PhotoUploader.vue'

interface UploadSign {
  policy: string
  signature: string
  accessKeyId: string
  host: string
  key: string
}

// 照片 OSS 三步直传：sign（服务端签发凭证）→ 浏览器直传 OSS → confirm（落库）
// 文件不经服务器中转（2C2G + 3M 带宽扛不住）；OSS 前提：桶已配置允许站点来源的 POST 跨域
export async function uploadItemPhotos(itemId: string, photos: PendingPhoto[]) {
  for (const p of photos) {
    const sign = await apiFetch<UploadSign>(`/api/items/${itemId}/photos/sign`, {
      method: 'POST',
      body: { contentType: p.file.type || 'image/jpeg' },
    })

    // PostObject：file 必须是最后一个字段
    const fd = new FormData()
    fd.append('key', sign.key)
    fd.append('policy', sign.policy)
    fd.append('OSSAccessKeyId', sign.accessKeyId)
    fd.append('signature', sign.signature)
    fd.append('Content-Type', p.file.type || 'image/jpeg')
    fd.append('file', p.file)
    try {
      // 直连 OSS 域名（非 /api，不走 apiFetch 的 401 跳转）；成功为 204 空响应
      await $fetch(sign.host, { method: 'POST', body: fd })
    } catch {
      // 失败响应是 XML，不做结构化解析，统一转成友好提示
      throw new Error('照片上传失败，请检查网络后重试')
    }

    await apiFetch(`/api/items/${itemId}/photos/confirm`, { method: 'POST', body: { key: sign.key } })
  }
}
