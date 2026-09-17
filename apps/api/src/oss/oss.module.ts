// 阿里云 OSS 共享模块：物品照片 / 用户头像等直传与签名能力统一从这里取
import { Module } from '@nestjs/common'
import { OssService } from './oss.service'

@Module({
  providers: [OssService],
  exports: [OssService],
})
export class OssModule {}
