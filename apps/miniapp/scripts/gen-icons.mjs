// 从 LocationIcon.vue 中的 ICON_PATHS 表批量生成静态 SVG 文件到 src/static/icons/
// 用法：node apps/miniapp/scripts/gen-icons.mjs
//
// 产物命名（与 LocationIcon.vue 的 src 计算保持一致）：
//   <slug>.svg              默认主题（清新绿洲）主色
//   <slug>--timber.svg      暖木收纳主色
//   <slug>--inkstone.svg    现代墨石主色
//   <slug>-muted.svg        灰版（三主题共用，用于无物品/占位）
//   tab-<slug>-active.svg / tab-<slug>-active--<theme>.svg   选中态
//   tab-<slug>-inactive.svg                                   未选中态（三主题共用）
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

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

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const writeIcon = (name, body, color) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" preserveAspectRatio="none" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>\n`
  writeFileSync(join(OUT, `${name}.svg`), svg)
}

let count = 0
for (const [slug, body] of icons) {
  const isTab = slug.startsWith('tab-')
  if (isTab) {
    for (const [theme, color] of Object.entries(THEME_PRIMARY)) {
      const suffix = theme === 'oasis' ? '' : `--${theme}`
      writeIcon(`${slug}-active${suffix}`, body, color)
      count++
    }
    writeIcon(`${slug}-inactive`, body, MUTED)
    count++
  } else {
    for (const [theme, color] of Object.entries(THEME_PRIMARY)) {
      const suffix = theme === 'oasis' ? '' : `--${theme}`
      writeIcon(`${slug}${suffix}`, body, color)
      count++
    }
    writeIcon(`${slug}-muted`, body, MUTED)
    count++
    // 白色版：彩色看板卡等深色底上使用（三主题共用）
    writeIcon(`${slug}-white`, body, '#ffffff')
    count++
  }
}

// 特例：CSV 导出行的蓝色 Table 图标（对齐 Web 端 text-info）
const tableBody = icons.get('table')
if (tableBody) {
  writeIcon('table-blue', tableBody, '#2563eb')
  count++
}
console.log(`已生成 ${count} 个 SVG 文件到 ${OUT}`)
