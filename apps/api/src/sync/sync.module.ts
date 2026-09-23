import { Module } from '@nestjs/common'
import { OssModule } from '../oss/oss.module'
import { SubscriptionModule } from '../subscription/subscription.module'
import { SyncController } from './sync.controller'
import { SyncService } from './sync.service'

@Module({
  imports: [OssModule, SubscriptionModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
