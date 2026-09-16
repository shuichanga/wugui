import { Module } from '@nestjs/common'
import { LocationsModule } from '../locations/locations.module'
import { ItemsController } from './items.controller'
import { TagsController, RecentViewsController } from './activity.controller'
import { ItemsService } from './items.service'

@Module({
  imports: [LocationsModule], // 复用 LocationsService.descendantIds
  controllers: [ItemsController, TagsController, RecentViewsController],
  providers: [ItemsService],
})
export class ItemsModule {}
