import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { appConfig } from './config'
import { DatabaseModule } from './db/database.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { AuthGuard } from './auth/auth.guard'
import { AllExceptionsFilter } from './common/http-exception.filter'
import { HouseholdsModule } from './households/households.module'
import { LocationsModule } from './locations/locations.module'
import { ItemsModule } from './items/items.module'
import { PhotosModule } from './photos/photos.module'
import { AvatarsModule } from './avatars/avatars.module'
import { TransferModule } from './transfer/transfer.module'
import { SubscriptionModule } from './subscription/subscription.module'
import { SyncModule } from './sync/sync.module'
import { AdminModule } from './admin/admin.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    HouseholdsModule,
    LocationsModule,
    ItemsModule,
    PhotosModule,
    AvatarsModule,
    TransferModule,
    SubscriptionModule,
    SyncModule,
    AdminModule,
  ],
  providers: [
    // 全局守卫：除 @Public() 外所有路由需登录
    { provide: APP_GUARD, useClass: AuthGuard },
    // 全局异常过滤器：错误响应格式化为 { statusCode, statusMessage }（兼容现有前端）
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
