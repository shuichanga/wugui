// 物品照片业务：直传凭证签发 / 上传确认 / 删除 / 读取授权（M2：写路径记同步日志 + url JSON 接口）
// 流程：sign（拿凭证）→ 客户端直传 OSS → confirm（落库）→ GET /api/photos/:id（302 签名 URL）
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { itemPhotos, items } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { SyncLogService } from '../common/sync-log.service'
import { OssService } from '../oss/oss.service'
import type { SessionUser } from '../auth/session.types'

const MAX_PHOTOS = 3
const MAX_BYTES = 2 * 1024 * 1024

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

@Injectable()
export class PhotosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly oss: OssService,
    private readonly syncLog: SyncLogService,
  ) {}

  /** 签发单张直传凭证（key 精确绑定到该物品） */
  async sign(householdId: string, itemId: string, contentType?: string) {
    await this.requireItem(householdId, itemId)
    await this.assertNotFull(itemId)

    const key = this.buildKey(householdId, itemId, contentType)
    return { ok: true, ...this.oss.signUpload(key, MAX_BYTES) }
  }

  /** 上传成功后落库（校验 key 属于该物品） */
  async confirm(user: SessionUser, householdId: string, itemId: string, key: string) {
    if (!key) throw new BadRequestException('缺少 key')
    await this.requireItem(householdId, itemId)

    const prefix = `items/${householdId}/${itemId}/`
    if (!key.startsWith(prefix)) {
      throw new BadRequestException('key 与物品不匹配')
    }

    const existing = await this.listPhotoIds(itemId)
    if (existing.length >= MAX_PHOTOS) {
      throw new ConflictException(`最多只能上传 ${MAX_PHOTOS} 张照片`)
    }

    const photoId = crypto.randomUUID()
    const sortOrder = existing.length
    await this.drizzle.db.insert(itemPhotos).values({
      id: photoId,
      itemId,
      ossKey: key,
      sortOrder,
      createdAt: new Date(),
    })

    // 同步日志：其他设备经 pull 获取新照片（M2.5 客户端据此回填 photoRefs）
    await this.syncLog.appendChange({
      householdId,
      userId: user.id,
      entity: 'item_photos',
      entityId: photoId,
      op: 'create',
      data: { itemId, ossKey: key, sortOrder },
    })

    return { ok: true, photoId, sortOrder, url: `/api/photos/${photoId}` }
  }

  /** 删除：先删 DB 记录，再删 OSS 对象（OSS 失败只告警，不留死记录） */
  async remove(user: SessionUser, householdId: string, itemId: string, photoId: string) {
    const found = await this.drizzle.db
      .select({ id: itemPhotos.id, ossKey: itemPhotos.ossKey })
      .from(itemPhotos)
      .where(and(eq(itemPhotos.id, photoId), eq(itemPhotos.itemId, itemId)))
    if (!found.length) throw new NotFoundException('照片不存在')

    await this.drizzle.db.delete(itemPhotos).where(eq(itemPhotos.id, photoId))

    await this.syncLog.appendChange({
      householdId,
      userId: user.id,
      entity: 'item_photos',
      entityId: photoId,
      op: 'delete',
      data: { itemId },
    })

    try {
      await this.oss.deleteObject(found[0].ossKey)
    } catch (e) {
      // 孤儿对象后续用清理任务兜底
      console.warn(`[photos] OSS 删除失败 ${found[0].ossKey}:`, e)
    }
    return { ok: true }
  }

  /** 读取授权：照片所属物品必须属于当前住所 → 返回签名 URL（302 用） */
  async signedUrlFor(householdId: string, photoId: string): Promise<string> {
    const rows = await this.drizzle.db
      .select({ ossKey: itemPhotos.ossKey })
      .from(itemPhotos)
      .innerJoin(items, eq(items.id, itemPhotos.itemId))
      .where(and(eq(itemPhotos.id, photoId), eq(items.householdId, householdId)))
      .limit(1)
    if (!rows.length) throw new NotFoundException('照片不存在')
    return this.oss.signedGetUrl(rows[0].ossKey)
  }

  // ---- helpers ----

  private async requireItem(householdId: string, itemId: string) {
    const found = await this.drizzle.db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.householdId, householdId)))
    if (!found.length) throw new NotFoundException('物品不存在')
  }

  private listPhotoIds(itemId: string) {
    return this.drizzle.db
      .select({ id: itemPhotos.id })
      .from(itemPhotos)
      .where(eq(itemPhotos.itemId, itemId))
  }

  private async assertNotFull(itemId: string) {
    const existing = await this.listPhotoIds(itemId)
    if (existing.length >= MAX_PHOTOS) {
      throw new ConflictException(`最多只能上传 ${MAX_PHOTOS} 张照片`)
    }
  }

  private buildKey(householdId: string, itemId: string, contentType?: string): string {
    const mime = (contentType ?? '').split(';')[0].trim().toLowerCase()
    const ext = (mime && EXT_BY_TYPE[mime]) || 'jpg'
    return `items/${householdId}/${itemId}/${crypto.randomUUID()}.${ext}`
  }
}
