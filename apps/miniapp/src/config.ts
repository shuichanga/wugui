// 环境配置：API 根地址（不含 /api 后缀）
// 真机调试时改成局域网 IP 或线上域名；开发者工具勾选「不校验合法域名」即可用 localhost
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:3000'
