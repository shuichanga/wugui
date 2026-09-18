import { Module } from '@nestjs/common'
import { LocationsModule } from '../locations/locations.module'
import { OssModule } from '../oss/oss.module'
import { ItemsController } from './items.controller'
import { TagsController, RecentViewsController } from './activity.controller'
import { ItemsService } from './items.service'

@Module({
  // OssModule：删除物品时级联清理 OSS 上的照片对象
  imports: [LocationsModule, OssModule],
  controllers: [ItemsController, TagsController, RecentViewsController],
  providers: [ItemsService],
})
export class ItemsModule {}
