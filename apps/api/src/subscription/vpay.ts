// 微信小程序虚拟支付（道具直购）纯工具：签名 / signData 构造 / 消息推送 XML 解析
// 签名规则参考官方文档《虚拟支付：个人》5.5 节
import { createHash, createHmac, randomInt } from 'node:crypto'

/**
 * 支付签名 paySig = HMAC-SHA256(AppKey, uri + '&' + postBody)
 * uri 规则：C 端下单固定 `requestVirtualPayment`；B 端为实际接口路径（如 /xpay/query_order）
 * postBody 必须与实际发出的请求体逐字节一致（不格式化、不改键序）
 */
export function calcPaySig(appKey: string, uri: string, postBody: string): string {
  return createHmac('sha256', appKey).update(`${uri}&${postBody}`).digest('hex')
}

/** 用户态签名 signature = HMAC-SHA256(sessionKey, signData)；sessionKey 来自 code2Session */
export function calcUserSignature(sessionKey: string, signData: string): string {
  return createHmac('sha256', sessionKey).update(signData).digest('hex')
}

/** 业务单号：8-32 位、字母数字、不以 _ 开头、每次下单重新生成不可复用 */
export function genOutTradeNo(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz'
  let rand = ''
  for (let i = 0; i < 8; i++) rand += alphabet[randomInt(alphabet.length)]
  return `W${Date.now()}${rand}`
}

export interface SignDataParams {
  offerId: string
  productId: string
  goodsPrice: number
  outTradeNo: string
  attach: string
}

/** 构造 signData：键序固定（与官方示例一致），签名与回传客户端共用同一字符串 */
export function buildSignData(p: SignDataParams): string {
  return JSON.stringify({
    offerId: p.offerId,
    buyQuantity: 1,
    env: 0,
    currencyType: 'CNY',
    productId: p.productId,
    goodsPrice: p.goodsPrice,
    outTradeNo: p.outTradeNo,
    attach: p.attach,
  })
}

/** 消息推送验签（明文模式）：sha1(sort(token, timestamp, nonce))，GET 验证与 POST 推送共用 */
export function verifyPushSignature(token: string, timestamp: string, nonce: string, signature: string): boolean {
  if (!token || !timestamp || !nonce || !signature) return false
  const hash = createHash('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex')
  return hash === signature.toLowerCase()
}

/** 推送受理成功响应（等价 ErrCode=0，官方明示接受） */
export const NOTIFY_OK = 'success'

/** 推送处理失败响应：微信收到非 0 会重试（最多 15 次） */
export function xmlNotifyError(msg: string): string {
  return `<xml><ErrCode>1</ErrCode><ErrMsg><![CDATA[${msg}]]></ErrMsg></xml>`
}

export function jsonNotifyError(msg: string): string {
  return JSON.stringify({ ErrCode: 1, ErrMsg: msg })
}

export interface XmlValue {
  [key: string]: string | XmlValue
}

/**
 * 解析微信消息推送 XML（无属性、无自闭合、浅层嵌套）：
 * - 叶子：`<Tag>value</Tag>` / `<Tag><![CDATA[value]]></Tag>` / 空值 `<Tag></Tag>`
 * - 嵌套：`<WeChatPayInfo><MchOrderNo>..</MchOrderNo></WeChatPayInfo>` → 对象
 */
export function parseWechatXml(xml: string): XmlValue {
  const root: XmlValue = {}
  const stack: Array<{ name: string; obj: XmlValue }> = [{ name: '', obj: root }]
  const re = /<(\/?)([A-Za-z0-9_]+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const [, closing, name, cdata, text] = m
    if (closing) {
      // 闭标签：仅当与栈顶同名（嵌套对象）时出栈；叶子的闭标签已在取值时被消费/跳过
      if (stack.length > 1 && stack[stack.length - 1].name === name) stack.pop()
      continue
    }
    const hasValue = cdata !== undefined || (text ?? '') !== ''
    if (!hasValue) {
      // 无值开标签：紧跟同名闭标签 → 空叶子；否则为嵌套对象入栈
      const closeTag = `</${name}>`
      if (xml.startsWith(closeTag, re.lastIndex)) {
        stack[stack.length - 1].obj[name] = ''
        re.lastIndex += closeTag.length
        continue
      }
      const child: XmlValue = {}
      stack[stack.length - 1].obj[name] = child
      stack.push({ name, obj: child })
      continue
    }
    // 叶子取值；其闭标签由下一次迭代的 closing 分支跳过（栈顶不匹配，自动忽略）
    stack[stack.length - 1].obj[name] = cdata ?? text ?? ''
  }
  return root
}
