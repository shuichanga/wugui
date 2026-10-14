// 运营配置存取（app_config 表 key-value）：管理后台可改、/api/config 公开下发
// 目前仅微信流量主广告位 ID；读取失败（如迁移未执行）静默降级为空，不影响主流程
import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { appConfigTable } from '../db/schema'
import { DrizzleService } from '../db/database.service'

const AD_UNIT_KEY = 'wechat_ad_unit_id'

@Injectable()
export class AppConfigService {
  constructor(private readonly drizzle: DrizzleService) {}

  async getAdUnitId(): Promise<string> {
    try {
      const rows = await this.drizzle.db
        .select()
        .from(appConfigTable)
        .where(eq(appConfigTable.configKey, AD_UNIT_KEY))
      return rows[0]?.configValue ?? ''
    } catch {
      // 表不存在等异常：降级为未配置（不渲染广告），不阻塞调用方
      return ''
    }
  }

  /** 保存广告位 ID；空串 = 删除配置（关闭广告） */
  async setAdUnitId(value: string): Promise<string> {
    const v = value.trim().slice(0, 128)
    if (v) {
      await this.drizzle.db
        .insert(appConfigTable)
        .values({ configKey: AD_UNIT_KEY, configValue: v, updatedAt: new Date() })
        .onDuplicateKeyUpdate({ set: { configValue: v, updatedAt: new Date() } })
    } else {
      await this.drizzle.db.delete(appConfigTable).where(eq(appConfigTable.configKey, AD_UNIT_KEY))
    }
    return v
  }
}
