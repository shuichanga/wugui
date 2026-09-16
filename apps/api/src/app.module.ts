import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { appConfig } from './config'
import { DatabaseModule } from './db/database.module'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { AuthGuard } from './auth/auth.guard'
import { AllExceptionsFilter } from './common/http-exception.filter'

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
  ],
  providers: [
    // 全局守卫：除 @Public() 外所有路由需登录
    { provide: APP_GUARD, useClass: AuthGuard },
    // 全局异常过滤器：错误响应格式化为 { statusCode, statusMessage }（兼容现有前端）
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
