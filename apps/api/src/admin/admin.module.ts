import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { OssModule } from '../oss/oss.module'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  // AuthModule：AdminService 注入 SessionService（hashPassword/genInviteCode）
  imports: [AuthModule, SubscriptionModule, OssModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
