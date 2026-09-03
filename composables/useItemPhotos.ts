import type { PendingPhoto } from '~/components/PhotoUploader.vue'

// 照片经 Worker 中转 multipart 上传（本地/生产行为一致）
export async function uploadItemPhotos(itemId: string, photos: PendingPhoto[]) {
  for (const p of photos) {
    const fd = new FormData()
    fd.append('file', p.file)
    await apiFetch(`/api/items/${itemId}/photos`, { method: 'POST', body: fd })
  }
}
