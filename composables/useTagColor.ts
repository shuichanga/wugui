// 标签颜色映射：基于标签名哈希确定性取色，同一标签永远同色。
// 原型四色系：绿（品牌）/ 蓝 / 琥珀 / 中性，柔底 + 深字，无边框（border 保留接口兼容）。
const TAG_PALETTE: { bg: string; text: string; border: string }[] = [
  { bg: '#e7f4ec', text: '#0f7a38', border: 'transparent' }, // 绿（品牌 tint）
  { bg: '#e4eefc', text: '#1d4ed8', border: 'transparent' }, // 蓝
  { bg: '#fbf0de', text: '#b45309', border: 'transparent' }, // 琥珀
  { bg: '#f0f2f0', text: '#51605a', border: 'transparent' }, // 中性
]

export function tagStyle(tag: string): { backgroundColor: string; color: string; borderColor: string } {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0
  }
  const c = TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length]!
  return { backgroundColor: c.bg, color: c.text, borderColor: c.border }
}
