// 标签颜色映射：基于标签名哈希确定性取色，同一标签永远同色。
// 饱和度适中的柔色系，每个色组含背景、文字、边框三色。
const TAG_PALETTE: { bg: string; text: string; border: string }[] = [
  { bg: '#d1fae5', text: '#047857', border: '#6ee7b7' }, // emerald
  { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' }, // blue
  { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' }, // amber
  { bg: '#ffe4e6', text: '#be123c', border: '#fda4af' }, // rose
  { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' }, // teal
  { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' }, // violet
  { bg: '#cffafe', text: '#0e7490', border: '#67e8f9' }, // cyan
  { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' }, // orange
  { bg: '#fce7f3', text: '#a21caf', border: '#f9a8c4' }, // fuchsia
  { bg: '#ecfccb', text: '#4d7c0f', border: '#bef264' }, // lime
]

export function tagStyle(tag: string): { backgroundColor: string; color: string; borderColor: string } {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0
  }
  const c = TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length]!
  return { backgroundColor: c.bg, color: c.text, borderColor: c.border }
}
