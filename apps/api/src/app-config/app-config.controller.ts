// 公开运营配置下发（@Public，无需登录）：广告展示给未登录用户，配置非敏感
import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth/public.decorator'
import { AppConfigService } from './app-config.service'

@Controller('config')
export class AppConfigController {
  constructor(private readonly service: AppConfigService) {}

  /**
   * GET /api/config —— { adUnitId, adEnabled }。
   * adUnitId 空串或 adEnabled=false = 客户端不渲染广告；
   * 会员价格不在此下发（随 /api/subscription/status 的 product 字段，登录后可见）
   */
  @Public()
  @Get()
  async publicConfig() {
    const [adUnitId, adEnabled] = await Promise.all([this.service.getAdUnitId(), this.service.getAdEnabled()])
    return { adUnitId, adEnabled }
  }
}
