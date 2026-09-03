// API 鉴权守卫：/api/auth/register、/api/auth/login 开放，其余 /api/* 需登录
export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api')) return
  const openPaths = ['/api/auth/register', '/api/auth/login']
  if (openPaths.some(p => path.startsWith(p))) return
  await requireUser(event)
})
