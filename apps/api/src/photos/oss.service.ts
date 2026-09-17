// 阿里云 OSS V1 签名（零 SDK 依赖）：PostObject 直传凭证 / 读签名 URL / 删除对象
// 文件不经服务器中转（2C2G + 3M 带宽扛不住），客户端拿凭证后直传 OSS
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'node:crypto'

@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name)
  private readonly bucket: string
  private readonly host: string // https://{bucket}.{endpoint}
  private readonly accessKeyId: string
  private readonly accessKeySecret: string

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('app.oss.bucket') ?? ''
    this.accessKeyId = config.get<string>('app.oss.accessKeyId') ?? ''
    this.accessKeySecret = config.get<string>('app.oss.accessKeySecret') ?? ''
    // 兜底剥离 .env 里可能误加的引号/反引号（含中文弯引号）和尾部斜杠
    const endpoint = (config.get<string>('app.oss.endpoint') ?? '')
      .trim()
      .replace(/^[\u2018\u2019\u201C\u201D`'"]+|[\u2018\u2019\u201C\u201D`'"]+$/g, '')
      .replace(/\/+$/, '')
    this.host =
      endpoint || `https://${this.bucket}.${config.get<string>('app.oss.region')}.aliyuncs.com`
  }

  get isConfigured(): boolean {
    return Boolean(this.bucket && this.accessKeyId && this.accessKeySecret)
  }

  /**
   * PostObject 上传凭证：key 精确绑定（服务端生成），10 分钟有效。
   * 客户端以 multipart/form-data 提交：key / policy / OSSAccessKeyId / signature / file(最后)
   */
  signUpload(key: string, maxBytes: number) {
    const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const conditions = [
      { bucket: this.bucket },
      ['eq', '$key', key],
      ['content-length-range', 1, maxBytes],
      ['starts-with', '$Content-Type', 'image/'],
    ]
    // OSS 要求 policy 为完整文档 { expiration, conditions }，只传数组会 400 InvalidPolicyDocument
    const policy = Buffer.from(JSON.stringify({ expiration, conditions })).toString('base64')
    const signature = createHmac('sha1', this.accessKeySecret).update(policy).digest('base64')
    return {
      policy,
      signature,
      accessKeyId: this.accessKeyId,
      host: this.host,
      key,
      maxBytes,
      expiration,
    }
  }

  /** 读签名 URL（私有桶 302 用），默认 1 小时有效 */
  signedGetUrl(ossKey: string, expiresSec = 3600): string {
    const expires = Math.floor(Date.now() / 1000) + expiresSec
    const resource = `/${this.bucket}/${ossKey}`
    const signature = createHmac('sha1', this.accessKeySecret)
      .update(`GET\n\n\n${expires}\n${resource}`)
      .digest('base64')
    const query = new URLSearchParams({
      OSSAccessKeyId: this.accessKeyId,
      Expires: String(expires),
      Signature: signature,
    })
    return `${this.host}${resource}?${query.toString()}`
  }

  /** 删除对象；网络失败向上抛，由调用方决定是否容忍 */
  async deleteObject(ossKey: string): Promise<void> {
    const date = new Date().toUTCString()
    const resource = `/${this.bucket}/${ossKey}`
    const signature = createHmac('sha1', this.accessKeySecret)
      .update(`DELETE\n\n\n${date}\n${resource}`)
      .digest('base64')
    const res = await fetch(`${this.host}${resource}`, {
      method: 'DELETE',
      headers: { Date: date, Authorization: `OSS ${this.accessKeyId}:${signature}` },
    })
    if (!res.ok && res.status !== 404) {
      throw new Error(`OSS delete ${ossKey} failed: ${res.status}`)
    }
  }
}
