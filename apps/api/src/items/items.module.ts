import { Module } from '@nestjs/common'
import { LocationsModule } from '../locations/locations.module'
import { SyncLogModule } from '../common/sync-log.module'
import { ItemsController } from './items.controller'
import { TagsController, RecentViewsController } from './activity.controller'
import { ItemsService } from './items.service'

@Module({
  // SyncLogModule：写路径记同步日志（小程序 pull 增量获取 Web 端写入）
  imports: [LocationsModule, SyncLogModule],
  controllers: [ItemsController, TagsController, RecentViewsController],
  providers: [ItemsService],
})
export class ItemsModule {}
