// 用户头像业务：multipart 上传落盘 / 删除 / 读取授权
// 头像小（≤1MB）低频，存服务器磁盘（avatarDir，容器内 volume 持久化）而不走 OSS：
//   1. 免费：物品照片才值得花 OSS 的直传+流量费，头像量小不值得
//   2. 可缓存：URL 带 ?v=文件名（每次上传换 uuid 文件名），配合 immutable 缓存头，
//      浏览器只在头像更换后重新下载；OSS 302 签名 URL 每次都变，无法利用缓存
// 契约：POST /api/me/avatar（multipart 单文件）→ GET /api/avatars/:userId → DELETE /api/me/avatar
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { and, eq, inArray } from 'drizzle-orm'
import { createReadStream } from 'node:fs'
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { householdMembers, users } from '../db/schema'
import { DrizzleService } from '../db/database.service'

const MAX_BYTES = 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/** controller 从 multipart part 解出的文件内容 */
export interface AvatarUpload {
  mimeType: string
  buffer: Buffer
}

@Injectable()
export class AvatarsService {
  private readonly dir: string

  constructor(
    private readonly drizzle: DrizzleService,
    config: ConfigService,
  ) {
    this.dir = config.get<string>('app.avatarDir') ?? 'data/avatars'
  }

  /** 保存头像：写盘（每次上传新 uuid 文件名）+ 落库，旧文件尽力删除 */
  async save(userId: string, upload: AvatarUpload) {
    const ext = EXT_BY_MIME[(upload.mimeType ?? '').toLowerCase()]
    if (!ext) throw new BadRequestException('头像仅支持 jpg/png/webp')
    if (upload.buffer.length === 0) throw new BadRequestException('文件为空')
    if (upload.buffer.length > MAX_BYTES) throw new BadRequestException('头像不能超过 1MB')

    const db = this.drizzle.db
    const found = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
    if (!found.length) throw new NotFoundException('用户不存在')

    await mkdir(join(this.dir, userId), { recursive: true })
    const filename = `${crypto.randomUUID()}.${ext}`
    await writeFile(join(this.dir, userId, filename), upload.buffer)

    const foundKey = await db
      .select({ avatarKey: users.avatarKey })
      .from(users)
      .where(eq(users.id, userId))
    await db
      .update(users)
      .set({ avatarKey: filename, updatedAt: new Date() })
      .where(eq(users.id, userId))

    const oldKey = foundKey[0]?.avatarKey
    if (oldKey && oldKey !== filename) await this.deleteFile(userId, oldKey)

    return { ok: true, avatarUrl: `/api/avatars/${userId}?v=${filename}` }
  }

  /** 删除头像：清 DB 引用，再删文件（失败只告警，不留死引用） */
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
    await this.deleteFile(userId, oldKey)
    return { ok: true }
  }

  /** 读取授权：查看者必须与头像主人在同一住所 → 返回磁盘文件信息（流式响应用） */
  async getForView(viewerId: string, targetUserId: string) {
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

    // avatarKey 由本服务自己写入（uuid.ext），basename 兜底防路径穿越
    const key = basename(target[0].avatarKey)
    const ext = key.split('.').pop() ?? ''
    const filePath = join(this.dir, targetUserId, key)
    try {
      await stat(filePath)
    } catch {
      throw new NotFoundException('头像文件不存在')
    }
    return { filePath, mimeType: MIME_BY_EXT[ext] ?? 'image/jpeg' }
  }

  /** 删除磁盘文件；ENOENT 视为已删，其他失败只告警（孤儿文件由清理任务兜底） */
  private async deleteFile(userId: string, filename: string) {
    try {
      await unlink(join(this.dir, userId, basename(filename)))
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') {
        console.warn(`[avatars] 头像文件删除失败 ${userId}/${filename}:`, e)
      }
    }
  }
}
