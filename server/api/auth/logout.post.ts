export default defineEventHandler(async (event) => {
  await clearAuthCookies(event)
  return { ok: true }
})
