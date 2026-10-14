import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { OssModule } from '../oss/oss.module'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AppConfigModule } from '../app-config/app-config.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  // AuthModule：AdminService 注入 SessionService（hashPassword/genInviteCode）
  // AppConfigModule：AdminController 注入 AppConfigService（运营配置读写）
  imports: [AuthModule, SubscriptionModule, OssModule, AppConfigModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
