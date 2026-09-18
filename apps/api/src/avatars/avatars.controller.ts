// 头像路由：multipart 上传 / 删除（me 前缀）+ 读取流式响应（avatars 前缀）
import { BadRequestException, Controller, Delete, Get, Param, Post, Req, Res } from '@nestjs/common'
import { createReadStream } from 'node:fs'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthedRequest, SessionUser } from '../auth/session.types'
import { AvatarsService } from './avatars.service'

@Controller('me')
export class MeAvatarController {
  constructor(private readonly service: AvatarsService) {}

  /**
   * POST /api/me/avatar —— multipart 上传头像（字段名 file，≤1MB，jpg/png/webp）。
   * 头像小而低频，直接过服务器落盘，不需要物品照片那套 OSS 三步直传。
   */
  @Post('avatar')
  async upload(@Req() request: FastifyRequest & AuthedRequest, @CurrentUser() user: SessionUser) {
    // req.file() 由 @fastify/multipart 提供（main.ts 已注册，fileSize 上限 1MB）
    const part = await request.file()
    if (!part) throw new BadRequestException('请以 multipart/form-data 上传，文件字段名 file')
    let buffer: Buffer
    try {
      buffer = await part.toBuffer()
    } catch {
      throw new BadRequestException('头像不能超过 1MB')
    }
    return this.service.save(user.id, { mimeType: part.mimetype, buffer })
  }

  /** DELETE /api/me/avatar —— 删除头像（DB 引用 + 磁盘文件） */
  @Delete('avatar')
  remove(@CurrentUser() user: SessionUser) {
    return this.service.remove(user.id)
  }
}

@Controller('avatars')
export class AvatarsProxyController {
  constructor(private readonly service: AvatarsService) {}

  /**
   * GET /api/avatars/:userId —— 校验同住权限后流式返回头像文件。
   * 契约来源：/api/auth/me 返回的 user.avatarUrl = /api/avatars/{userId}?v={文件名}，
   * 文件名每次上传都换，配合 immutable 缓存头：浏览器仅在头像更换后重新下载。
   */
  @Get(':userId')
  async get(
    @Param('userId') userId: string,
    @CurrentUser() user: SessionUser,
    @Res() reply: FastifyReply,
  ) {
    const file = await this.service.getForView(user.id, userId)
    reply.header('cache-control', 'private, max-age=31536000, immutable')
    return reply.type(file.mimeType).send(createReadStream(file.filePath))
  }
}
