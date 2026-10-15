import { Module } from '@nestjs/common'
import { AppConfigModule } from '../app-config/app-config.module'
import { OssModule } from '../oss/oss.module'
import { SubscriptionModule } from '../subscription/subscription.module'
import { SyncController } from './sync.controller'
import { SyncService } from './sync.service'
import { SyncPurgeService } from './sync-purge.service'

@Module({
  imports: [AppConfigModule, OssModule, SubscriptionModule],
  controllers: [SyncController],
  providers: [SyncService, SyncPurgeService],
})
export class SyncModule {}
