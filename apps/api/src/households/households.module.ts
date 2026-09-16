import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { HouseholdsController } from './households.controller'
import { HouseholdsService } from './households.service'

@Module({
  imports: [AuthModule], // SessionService / AuthGuard（AuthModule 已 export）
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
})
export class HouseholdsModule {}
