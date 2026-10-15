// 云端数据限期清理：住所内全体成员失去订阅（退款/取消/到期）超过宽限天数后，
// 清空该住所的云端同步数据（locations/items/photos/syncChanges + OSS 照片对象）。
//
// 家庭共享语义——清理单位是「住所」而非用户：
//   · 资格判定 = householdHasCloudSync（住所内任一成员有有效订阅即解锁），
//     退款只影响该用户，住所内其他成员仍有订阅则永不清理；
//   · syncLostAt 由本任务扫描时统一判定维护（成员退出/被移除等边缘情况自然覆盖），
//     宽限期内任一成员重新开通 → 字段清空、清理取消；
//   · 保留 households/householdMembers（住所壳与邀请关系），重新开通后同步恢复。
//
// 清理语义——静默清空，不广播删除墓碑：客户端引擎（packages/core sync-engine）会把
// delete 变更应用到所有设备，广播会清掉用户本地数据（Offline-First 本地主权）。
// 静默清空行 + 清空 syncChanges 后：存量设备 pull 增量为 0 条、本地数据原样保留；
// 重新开通订阅后，活跃设备的后续编辑经 LWW 自然重建云端。
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'
import { households, itemPhotos, itemTags, items, locations, syncChanges } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import { OssService } from '../oss/oss.service'
import { SubscriptionService } from '../subscription/subscription.service'
import { AppConfigService } from '../app-config/app-config.service'

const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000

@Injectable()
export class SyncPurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncPurgeService.name)
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly subscription: SubscriptionService,
    private readonly oss: OssService,
    private readonly appConfig: AppConfigService,
  ) {}

  onModuleInit() {
    // 启动即跑一次（补上停机期间到期的清理），之后每 6 小时一轮
    void this.runOnce()
    this.timer = setInterval(() => void this.runOnce(), SCAN_INTERVAL_MS)
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer)
  }

  /** 扫描全部住所：维护 syncLostAt/syncPurgedAt 状态并对超期住所执行清理（幂等） */
  async runOnce(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const graceDays = await this.appConfig.getPurgeGraceDays()
      const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000)
      const rows = await this.drizzle.db.select().from(households)
      for (const h of rows) {
        if (await this.subscription.householdHasCloudSync(h.id)) {
          // 有资格（重新开通/从未失去）：复位清理状态
          if (h.syncLostAt || h.syncPurgedAt) {
            await this.drizzle.db
              .update(households)
              .set({ syncLostAt: null, syncPurgedAt: null, updatedAt: new Date() })
              .where(eq(households.id, h.id))
          }
          continue
        }
        if (!h.syncLostAt) {
          // 首次失去资格：记宽限期起点（本轮不清理）
          await this.drizzle.db
            .update(households)
            .set({ syncLostAt: new Date(), updatedAt: new Date() })
            .where(eq(households.id, h.id))
          continue
        }
        if (h.syncPurgedAt || h.syncLostAt > cutoff) continue
        await this.purgeHousehold(h.id)
      }
    } catch (e) {
      this.logger.warn(`云端数据清理扫描失败: ${String(e)}`)
    } finally {
      this.running = false
    }
  }

  /** 清空住所云端数据（幂等）：OSS 照片对象 → 照片/标签/物品/空间/变更日志；住所壳与成员关系保留 */
  private async purgeHousehold(householdId: string): Promise<void> {
    const db = this.drizzle.db
    const itemIds = (await db.select({ id: items.id }).from(items).where(eq(items.householdId, householdId))).map(r => r.id)

    let photoCount = 0
    if (itemIds.length) {
      const photos = await db
        .select({ ossKey: itemPhotos.ossKey })
        .from(itemPhotos)
        .where(inArray(itemPhotos.itemId, itemIds))
      for (const p of photos) {
        await this.oss.deleteObject(p.ossKey).catch((e: unknown) => {
          // 单个对象删除失败不中断清理（行会被删，残留对象待后续人工清理）
          this.logger.warn(`清理 OSS 对象失败 ${p.ossKey}: ${String(e)}`)
        })
        photoCount++
      }
      await db.delete(itemPhotos).where(inArray(itemPhotos.itemId, itemIds))
      await db.delete(itemTags).where(inArray(itemTags.itemId, itemIds))
    }
    await db.delete(items).where(eq(items.householdId, householdId))
    await db.delete(locations).where(eq(locations.householdId, householdId))
    await db.delete(syncChanges).where(eq(syncChanges.householdId, householdId))

    await db
      .update(households)
      .set({ syncPurgedAt: new Date(), updatedAt: new Date() })
      .where(eq(households.id, householdId))
    this.logger.log(`住所云端数据已清理: ${householdId} items=${itemIds.length} photos=${photoCount}`)
  }
}
