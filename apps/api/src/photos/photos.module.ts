import { Module } from '@nestjs/common'
import { ItemPhotosController, PhotosProxyController } from './photos.controller'
import { PhotosService } from './photos.service'
import { OssService } from './oss.service'

@Module({
  controllers: [ItemPhotosController, PhotosProxyController],
  providers: [PhotosService, OssService],
  // 头像模块（/api/me/avatar、/api/avatars/:userId）后续复用 OssService
  exports: [OssService],
})
export class PhotosModule {}
