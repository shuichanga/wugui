// 运营配置存取（app_config 表 key-value）：管理后台可改、/api/config 公开下发
// 易变运营项优先放这里（广告位/广告开关/会员价格），避免改代码重新部署
// 读取失败（如迁移未执行）静默降级为空，不影响主流程
import { Injectable } from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'
import { appConfigTable } from '../db/schema'
import { DrizzleService } from '../db/database.service'

const KEY_AD_UNIT = 'wechat_ad_unit_id'
const KEY_AD_ENABLED = 'wechat_ad_enabled'
const KEY_PRICE_CURRENT = 'membership_price_current'
const KEY_PRICE_ORIGINAL = 'membership_price_original'

/** 运营配置（管理后台可改项） */
export interface OpsConfig {
  adUnitId: string
  /** 广告总开关：关 = 小程序端不渲染广告（临时停广告无需清空广告位 ID） */
  adEnabled: boolean
  /** 会员现价（分）：须与 MP 后台「道具管理」道具价格一致；null = 未设置（下单回退内置默认价） */
  priceCurrent: number | null
  /** 会员原价（分，划线价，可空）：现价低于原价时客户端展示优惠文案 */
  priceOriginal: number | null
}

/** 金额转分：非正数/非法输入返回 null（用于清除配置） */
export function parseFen(v: unknown): number | null {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? n : null
}

@Injectable()
export class AppConfigService {
  constructor(private readonly drizzle: DrizzleService) {}

  private async getValues(keys: string[]): Promise<Map<string, string>> {
    try {
      const rows = await this.drizzle.db
        .select()
        .from(appConfigTable)
        .where(inArray(appConfigTable.configKey, keys))
      return new Map(rows.map(r => [r.configKey, r.configValue]))
    } catch {
      // 表不存在等异常：全部降级为未配置，不阻塞调用方
      return new Map()
    }
  }

  /** value 为 null/空串时删除该配置项 */
  private async setValue(key: string, value: string | null): Promise<void> {
    if (value) {
      await this.drizzle.db
        .insert(appConfigTable)
        .values({ configKey: key, configValue: value, updatedAt: new Date() })
        .onDuplicateKeyUpdate({ set: { configValue: value, updatedAt: new Date() } })
    } else {
      await this.drizzle.db.delete(appConfigTable).where(eq(appConfigTable.configKey, key))
    }
  }

  async getAdUnitId(): Promise<string> {
    return (await this.getValues([KEY_AD_UNIT])).get(KEY_AD_UNIT) ?? ''
  }

  /** 广告开关（默认开；未配置/旧数据视为开） */
  async getAdEnabled(): Promise<boolean> {
    return (await this.getValues([KEY_AD_ENABLED])).get(KEY_AD_ENABLED) !== '0'
  }

  /** 会员现价（分）：未配置返回 null（调用方回退内置默认价） */
  async getPriceCurrent(): Promise<number | null> {
    return parseFen((await this.getValues([KEY_PRICE_CURRENT])).get(KEY_PRICE_CURRENT))
  }

  /** 会员原价（分，划线价）：未配置返回 null */
  async getPriceOriginal(): Promise<number | null> {
    return parseFen((await this.getValues([KEY_PRICE_ORIGINAL])).get(KEY_PRICE_ORIGINAL))
  }

  async getOpsConfig(): Promise<OpsConfig> {
    const kv = await this.getValues([KEY_AD_UNIT, KEY_AD_ENABLED, KEY_PRICE_CURRENT, KEY_PRICE_ORIGINAL])
    return {
      adUnitId: kv.get(KEY_AD_UNIT) ?? '',
      adEnabled: kv.get(KEY_AD_ENABLED) !== '0',
      priceCurrent: parseFen(kv.get(KEY_PRICE_CURRENT)),
      priceOriginal: parseFen(kv.get(KEY_PRICE_ORIGINAL)),
    }
  }

  /** 部分更新：undefined = 不改动，null = 清除该项；返回更新后的完整配置 */
  async setOpsConfig(patch: {
    adUnitId?: string
    adEnabled?: boolean
    priceCurrent?: number | null
    priceOriginal?: number | null
  }): Promise<OpsConfig> {
    if (patch.adUnitId !== undefined) await this.setValue(KEY_AD_UNIT, patch.adUnitId.trim().slice(0, 128))
    if (patch.adEnabled !== undefined) await this.setValue(KEY_AD_ENABLED, patch.adEnabled ? '1' : '0')
    if (patch.priceCurrent !== undefined) await this.setValue(KEY_PRICE_CURRENT, patch.priceCurrent == null ? null : String(Math.round(patch.priceCurrent)))
    if (patch.priceOriginal !== undefined) await this.setValue(KEY_PRICE_ORIGINAL, patch.priceOriginal == null ? null : String(Math.round(patch.priceOriginal)))
    return this.getOpsConfig()
  }
}
