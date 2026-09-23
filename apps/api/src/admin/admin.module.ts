import { Module } from '@nestjs/common'
import { SubscriptionModule } from '../subscription/subscription.module'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  imports: [SubscriptionModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
