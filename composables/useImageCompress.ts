// 前端图片压缩：最长边压到 maxDim，输出 JPEG
export async function compressImage(file: File, maxDim = 1280, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('不是图片文件')
  }
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('压缩失败'))),
      'image/jpeg',
      quality,
    )
  })

  return new File([blob], 'photo.jpg', { type: 'image/jpeg' })
}
