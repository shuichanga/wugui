import { Module } from '@nestjs/common'
import { AvatarsProxyController, MeAvatarController } from './avatars.controller'
import { AvatarsService } from './avatars.service'

// 头像存服务器磁盘（不走 OSS），无外部依赖
@Module({
  controllers: [MeAvatarController, AvatarsProxyController],
  providers: [AvatarsService],
})
export class AvatarsModule {}
