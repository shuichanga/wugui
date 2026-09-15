import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

// 通过环境变量指定目标数据库，默认本地开发用 mysql://wugui:wugui@localhost:3306/wugui
export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'mysql://wugui:wugui@localhost:3306/wugui',
  },
})
