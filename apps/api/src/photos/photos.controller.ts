// 照片路由：直传凭证 / 上传确认 / 删除（items 前缀）+ 读取 302（photos 前缀）
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { CurrentHouseholdId } from '../auth/current-user.decorator'
import { PhotosService } from './photos.service'

@Controller('items')
export class ItemPhotosController {
  constructor(private readonly service: PhotosService) {}

  /** POST /api/items/:id/photos/sign —— 签发单张直传凭证 */
  @HttpCode(200)
  @Post(':id/photos/sign')
  sign(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.sign(householdId, id, body?.contentType ? String(body.contentType) : undefined)
  }

  /** POST /api/items/:id/photos/confirm —— 客户端直传成功后落库 */
  @HttpCode(200)
  @Post(':id/photos/confirm')
  confirm(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.confirm(householdId, id, String(body?.key ?? ''))
  }

  /** DELETE /api/items/:id/photos/:photoId —— 删除照片（DB + OSS） */
  @Delete(':id/photos/:photoId')
  remove(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentHouseholdId() householdId: string,
  ) {
    return this.service.remove(householdId, id, photoId)
  }
}

@Controller('photos')
export class PhotosProxyController {
  constructor(private readonly service: PhotosService) {}

  /**
   * GET /api/photos/:photoId —— 校验归属后 302 到 OSS 签名 URL。
   * 保持旧契约：前端 <img src="/api/photos/:id"> 无需改动。
   * 注意：这里用 @Res() 手动模式（reply.redirect 自行发送响应），
   * 与 @Res({ passthrough: true }) + return 的错误用法不同，不会挂起连接。
   */
  @Get(':photoId')
  async get(
    @Param('photoId') photoId: string,
    @CurrentHouseholdId() householdId: string,
    @Res() reply: FastifyReply,
  ) {
    const url = await this.service.signedUrlFor(householdId, photoId)
    return reply.redirect(url, 302)
  }
}
