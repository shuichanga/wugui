import { Module } from '@nestjs/common'
import { OssModule } from '../oss/oss.module'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  imports: [SubscriptionModule, OssModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
