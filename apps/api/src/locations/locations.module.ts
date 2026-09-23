import { Module } from '@nestjs/common'
import { SyncLogModule } from '../common/sync-log.module'
import { LocationsController } from './locations.controller'
import { LocationsService } from './locations.service'

@Module({
  imports: [SyncLogModule],
  controllers: [LocationsController],
  providers: [LocationsService],
  // items 模块复用 descendantIds 查询
  exports: [LocationsService],
})
export class LocationsModule {}
