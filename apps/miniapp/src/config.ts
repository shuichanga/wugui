// 环境配置：API 根地址（不含 /api 后缀），由 Vite 环境文件注入
//   .env.development → 本机 NestJS（开发者工具需勾选「不校验合法域名」）
//   .env.production  → 线上 HTTPS 域名（须在微信后台登记为 request 合法域名）
const raw = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:3000'

/** 去掉末尾斜杠：避免客户端拼出 //api/... 这种路径 */
export const API_BASE = raw.replace(/\/+$/, '')

// 真机与体验版只能请求 HTTPS 合法域名，构建期暴露配置错误（否则只能在用户手机上才炸）
if (import.meta.env.PROD && !API_BASE.startsWith('https://')) {
  console.error(`[物归] 生产环境 VITE_API_BASE 必须是 HTTPS 域名，当前为「${API_BASE}」，请检查 .env.production`)
}