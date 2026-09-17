import { Module } from '@nestjs/common'
import { OssModule } from '../oss/oss.module'
import { AvatarsProxyController, MeAvatarController } from './avatars.controller'
import { AvatarsService } from './avatars.service'

@Module({
  imports: [OssModule],
  controllers: [MeAvatarController, AvatarsProxyController],
  providers: [AvatarsService],
})
export class AvatarsModule {}
