// 同步变更日志：REST 写路径（Web 端）与 sync push（小程序离线）统一记录，
// 其他设备通过 GET /api/sync/pull 增量拉取。所有写路径都必须记录，否则多端数据不一致。
import { Injectable } from '@nestjs/common'
import { syncChanges } from '../db/schema'
import { DrizzleService } from '../db/database.service'
import type { SyncEntity } from '../sync/sync.types'

export interface AppendChangeInput {
  householdId: string
  userId: string
  entity: SyncEntity
  entityId: string
  op: 'create' | 'update' | 'delete'
  /** delete 时传 null */
  data?: Record<string, unknown> | null
  /** 客户端时间戳（sync push 传入）；REST 写路径缺省 = 服务端 now */
  clientTimestamp?: Date
}

@Injectable()
export class SyncLogService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** 记录一条变更到 sync_changes 表（syncedAt = 服务端 now，pull 游标基准） */
  async appendChange(input: AppendChangeInput): Promise<void> {
    const now = new Date()
    await this.drizzle.db.insert(syncChanges).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      householdId: input.householdId,
      entity: input.entity,
      entityId: input.entityId,
      op: input.op,
      dataJson: input.data ? JSON.stringify(input.data) : null,
      clientTimestamp: input.clientTimestamp ?? now,
      syncedAt: now,
    })
  }
}
