import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { type SQL } from 'drizzle-orm'
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

export type DB = MySql2Database<typeof schema>

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name)
  private pool: mysql.Pool | null = null
  private _db: DB | null = null

  constructor(private readonly config: ConfigService) {}

  /** 惰性初始化连接池，第一次调用时才连库 */
  get db(): DB {
    if (!this._db) {
      const url = this.config.get<string>('app.databaseUrl')!
      this.pool = mysql.createPool({
        uri: url,
        connectionLimit: 5,
        waitForConnections: true,
        queueLimit: 0,
      })
      this._db = drizzle(this.pool, { schema, mode: 'default' })
    }
    return this._db
  }

  /** 原生 SQL 查询（递归 CTE 等），返回行数组 */
  async rawQuery<T extends Record<string, unknown>>(query: SQL): Promise<T[]> {
    // mysql2 execute 返回 [rows, fields] 元组；drizzle 的条件类型在此场景下有歧义，直接断言
    const [rows] = (await this.db.execute<T>(query)) as unknown as [T[], mysql.FieldPacket[]]
    return rows
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end()
      this.logger.log('MySQL pool closed')
    }
  }
}
