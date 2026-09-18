import { Module } from '@nestjs/common'
import { TransferController } from './transfer.controller'
import { TransferService } from './transfer.service'

// 数据备份/迁移（export JSON 契约 + 合并导入）
@Module({
  controllers: [TransferController],
  providers: [TransferService],
})
export class TransferModule {}
