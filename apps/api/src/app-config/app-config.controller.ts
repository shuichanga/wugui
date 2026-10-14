// 公开运营配置下发（@Public，无需登录）：广告展示给未登录用户，广告位 ID 非敏感
import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth/public.decorator'
import { AppConfigService } from './app-config.service'

@Controller('config')
export class AppConfigController {
  constructor(private readonly service: AppConfigService) {}

  /** GET /api/config —— { adUnitId }（空串 = 未配置，客户端不渲染广告） */
  @Public()
  @Get()
  async publicConfig() {
    return { adUnitId: await this.service.getAdUnitId() }
  }
}
