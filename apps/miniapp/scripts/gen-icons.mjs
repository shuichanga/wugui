// 从 LocationIcon.vue 中的 ICON_PATHS 表批量生成 PNG 图标到 src/static/icons/
// 用法：node apps/miniapp/scripts/gen-icons.mjs
//
// 为什么输出 PNG 而不是 SVG：微信小程序 <image> 对 SVG 的位图映射不保证 viewBox 居中
// （实测内容整体偏移），PNG 位图 + aspectFit 是确定性居中的渲染路径。
//
// 产物命名（与 LocationIcon.vue 的 src 计算保持一致）：
//   <slug>.png              默认主题（清新绿洲）主色
//   <slug>--timber.png      暖木收纳主色
//   <slug>--inkstone.png    现代墨石主色
//   <slug>-muted.png        灰版（三主题共用，用于无物品/占位）
//   <slug>-white.png        白色版（彩色卡等深色底用，三主题共用）
//   tab-<slug>-active.png / tab-<slug>-active--<theme>.png   选中态
//   tab-<slug>-inactive.png                                  未选中态（三主题共用）
import { readFileSync, rmSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'src/components/LocationIcon.vue')
const OUT = join(ROOT, 'src/static/icons')

// 三套主题的主色（须与 App.vue 中 .page.theme-* 的 --color-primary 一致）
const THEME_PRIMARY = {
  oasis: '#16a34a',
  timber: '#33604a',
  inkstone: '#17191b',
}
// 未选中 / 灰版共用色
const MUTED = '#8a978f'

// 输出位图边长：viewBox 24 的 4 倍（三倍屏下 48rpx≈72 物理像素仍有富余）
const SIZE = 96

const vue = readFileSync(SRC, 'utf8')
const ICONS_BLOCK_RE = /const\s+ICON_PATHS[^{]*\{([\s\S]*?)\n\}/
const m = vue.match(ICONS_BLOCK_RE)
if (!m) {
  console.error('未找到 ICON_PATHS 定义')
  process.exit(1)
}
const itemRe = /^\s*['"]?([\w-]+)['"]?\s*:\s*'([^']+)'[,?\s]*$/gm
const icons = new Map()
let mm
while ((mm = itemRe.exec(m[1])) !== null) {
  icons.set(mm[1], mm[2])
}
console.log(`解析到 ${icons.size} 个图标`)

// 全量重建：清空目录，避免残留旧的 .svg 产物
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

/** SVG 文本 → PNG 文件（sharp/librsvg 光栅化，居中由 viewBox 数学保证） */
const renderIcon = (name, body, color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  return sharp(Buffer.from(svg), { density: (72 * SIZE) / 24 })
    .resize(SIZE, SIZE)
    .png({ palette: true, compressionLevel: 9 })
    .toFile(join(OUT, `${name}.png`))
}

const jobs = []
let count = 0
const writeIcon = (name, body, color) => {
  jobs.push(renderIcon(name, body, color))
  count++
}

for (const [slug, body] of icons) {
  const isTab = slug.startsWith('tab-')
  if (isTab) {
    for (const [theme, color] of Object.entries(THEME_PRIMARY)) {
      const suffix = theme === 'oasis' ? '' : `--${theme}`
      writeIcon(`${slug}-active${suffix}`, body, color)
    }
    writeIcon(`${slug}-inactive`, body, MUTED)
  } else {
    for (const [theme, color] of Object.entries(THEME_PRIMARY)) {
      const suffix = theme === 'oasis' ? '' : `--${theme}`
      writeIcon(`${slug}${suffix}`, body, color)
    }
    writeIcon(`${slug}-muted`, body, MUTED)
    // 白色版：彩色看板卡等深色底上使用（三主题共用）
    writeIcon(`${slug}-white`, body, '#ffffff')
  }
}

// 特例：品牌蓝变体（对齐 Web 端 text-info）——CSV 导出行 Table、立即同步 Refresh
const BLUE = '#2563eb'
for (const slug of ['table', 'refresh']) {
  const body = icons.get(slug)
  if (body) {
    writeIcon(`${slug}-blue`, body, BLUE)
  }
}

await Promise.all(jobs)
console.log(`已生成 ${count} 个 PNG 文件到 ${OUT}`)
