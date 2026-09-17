import { Module } from '@nestjs/common'
import { OssModule } from '../oss/oss.module'
import { ItemPhotosController, PhotosProxyController } from './photos.controller'
import { PhotosService } from './photos.service'

@Module({
  imports: [OssModule],
  controllers: [ItemPhotosController, PhotosProxyController],
  providers: [PhotosService],
})
export class PhotosModule {}
