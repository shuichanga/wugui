import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from '~/drizzle/schema'

export type DB = ReturnType<typeof drizzle<typeof schema>>

export function getDB(event: H3Event): DB {
  const env = (event.context.cloudflare as { env?: { DB?: D1Database } } | undefined)?.env
  if (!env?.DB) {
    throw createError({ statusCode: 500, statusMessage: 'D1 binding (DB) 不可用' })
  }
  return drizzle(env.DB, { schema })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getR2(event: H3Event): any {
  const env = (event.context.cloudflare as { env?: { PHOTOS?: unknown } } | undefined)?.env
  if (!env?.PHOTOS) {
    throw createError({ statusCode: 500, statusMessage: 'R2 binding (PHOTOS) 不可用' })
  }
  return env.PHOTOS
}
