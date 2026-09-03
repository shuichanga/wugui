// 前端图片压缩：最长边压到 maxDim，输出 JPEG
// 内存策略：分级解码 + 及时释放，避免手机大图（12MP 级）整幅解码导致渲染进程崩溃
const MAX_DIM = 1280
const SKIP_LIMIT_BYTES = 400 * 1024 // 小图直接透传，不做 canvas 编解码
const REJECT_LIMIT_BYTES = 25 * 1024 * 1024

export async function compressImage(file: File, maxDim = MAX_DIM, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('不是图片文件')
  }
  if (file.size > REJECT_LIMIT_BYTES) {
    throw new Error('图片太大，请换一张')
  }
  // 已经足够小的图直接透传（服务端限 2MB）
  if (file.size <= SKIP_LIMIT_BYTES) {
    return file
  }

  // 第一级：解码时同步降采样（resizeWidth 只给宽，保持纵横比），峰值内存从 ~48MB 降到 ~12MB
  let bitmap: ImageBitmap | null = null
  let width = 0
  let height = 0
  try {
    bitmap = await createImageBitmap(file, { resizeWidth: maxDim * 2, resizeQuality: 'medium' })
    width = bitmap.width
    height = bitmap.height
  } catch {
    bitmap = null
  }

  let drawSource: ImageBitmap | HTMLImageElement
  if (bitmap) {
    drawSource = bitmap
  } else {
    // 第二级兜底：浏览器不支持降采样选项（老 Safari 等）时走 Image 解码
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      drawSource = img
      width = img.naturalWidth
      height = img.naturalHeight
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  // 目标尺寸：最长边压到 maxDim
  const scale = Math.min(1, maxDim / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')
  ctx.drawImage(drawSource, 0, 0, w, h)

  // 立即释放解码源
  if (bitmap) bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('压缩失败'))),
      'image/jpeg',
      quality,
    )
  })

  // 释放 canvas 缓冲
  canvas.width = 0
  canvas.height = 0

  return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
}
