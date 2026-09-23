import { Module } from '@nestjs/common'
import { SyncLogService } from './sync-log.service'

// DatabaseModule 是 @Global，无需重复 import
@Module({
  providers: [SyncLogService],
  exports: [SyncLogService],
})
export class SyncLogModule {}
