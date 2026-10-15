import { Module } from '@nestjs/common'
import { AppConfigModule } from '../app-config/app-config.module'
import { SubscriptionController } from './subscription.controller'
import { SubscriptionService } from './subscription.service'

@Module({
  imports: [AppConfigModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
