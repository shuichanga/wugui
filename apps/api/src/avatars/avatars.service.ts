// 用户头像业务：直传凭证签发 / 上传确认（替换旧头像）/ 删除 / 读取授权
// 流程与物品照片一致：sign → 客户端直传 OSS → confirm（落库 users.avatar_key）→ GET /api/avatars/:uid（302 签名 URL）
// 复用 OssService（同一私有桶，key 前缀区分：items/... vs avatars/{userId}/...）
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'
import { householdMembers, users } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { OssService } from '../oss/oss.service'

// 头像比物品照片小（客户端通常还会压缩），1MB 足够
const MAX_BYTES = 1024 * 1024

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

@Injectable()
export class AvatarsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly oss: OssService,
  ) {}

  /** 签发头像直传凭证（key 精确绑定当前用户） */
  sign(userId: string, contentType?: string) {
    const mime = (contentType ?? '').split(';')[0].trim().toLowerCase()
    const ext = (mime && EXT_BY_TYPE[mime]) || 'jpg'
    const key = `avatars/${userId}/${crypto.randomUUID()}.${ext}`
    return { ok: true, ...this.oss.signUpload(key, MAX_BYTES) }
  }

  /** 直传成功后落库：校验 key 归属，替换旧头像（旧 OSS 对象尽力删除，失败只告警） */
  async confirm(userId: string, key: string) {
    if (!key) throw new BadRequestException('缺少 key')
    const prefix = `avatars/${userId}/`
    if (!key.startsWith(prefix)) {
      throw new BadRequestException('key 与用户不匹配')
    }

    const db = this.drizzle.db
    const found = await db
      .select({ avatarKey: users.avatarKey })
      .from(users)
      .where(eq(users.id, userId))
    if (!found.length) throw new NotFoundException('用户不存在')

    const oldKey = found[0].avatarKey
    await db
      .update(users)
      .set({ avatarKey: key, updatedAt: new Date() })
      .where(eq(users.id, userId))

    // 旧头像对象异步兜底清理（confirm 同步删，避免堆积孤儿对象）
    if (oldKey && oldKey !== key) {
      try {
        await this.oss.deleteObject(oldKey)
      } catch (e) {
        console.warn(`[avatars] 旧头像 OSS 删除失败 ${oldKey}:`, e)
      }
    }
    return { ok: true, avatarUrl: `/api/avatars/${userId}` }
  }

  /** 删除头像：清 DB 引用，再删 OSS 对象（OSS 失败只告警） */
  async remove(userId: string) {
    const db = this.drizzle.db
    const found = await db
      .select({ avatarKey: users.avatarKey })
      .from(users)
      .where(eq(users.id, userId))
    if (!found.length) throw new NotFoundException('用户不存在')
    const oldKey = found[0].avatarKey
    if (!oldKey) throw new NotFoundException('未设置头像')

    await db
      .update(users)
      .set({ avatarKey: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
    try {
      await this.oss.deleteObject(oldKey)
    } catch (e) {
      console.warn(`[avatars] 头像 OSS 删除失败 ${oldKey}:`, e)
    }
    return { ok: true }
  }

  /** 读取授权：查看者必须与头像主人在同一住所 → 返回签名 URL（302 用） */
  async signedUrlFor(viewerId: string, targetUserId: string): Promise<string> {
    const db = this.drizzle.db

    const target = await db
      .select({ avatarKey: users.avatarKey })
      .from(users)
      .where(eq(users.id, targetUserId))
    if (!target.length) throw new NotFoundException('用户不存在')
    if (!target[0].avatarKey) throw new NotFoundException('该用户未设置头像')

    // 同住权限：目标用户的住所 ∩ 查看者的住所 非空（自己查看自己天然满足）
    const viewerRows = await db
      .select({ householdId: householdMembers.householdId })
      .from(householdMembers)
      .where(eq(householdMembers.userId, viewerId))
    if (!viewerRows.length) throw new ForbiddenException('无权查看该头像')
    const shared = await db
      .select({ householdId: householdMembers.householdId })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.userId, targetUserId),
          inArray(householdMembers.householdId, viewerRows.map((r) => r.householdId)),
        ),
      )
    if (!shared.length) throw new ForbiddenException('无权查看该头像')

    return this.oss.signedGetUrl(target[0].avatarKey)
  }
}
