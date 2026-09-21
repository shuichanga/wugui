// 统一 ID 生成：UUIDv4。
//
// 为什么不用 `uuid` 包：uuid@11 依赖 crypto.getRandomValues，
// 微信小程序运行时（mp-weixin）没有全局 crypto 对象，会抛
// "crypto.getRandomValues() not supported"，导致所有实体创建失败
// （现象：添加房间/物品 → newId() 抛错 → try/catch 显示"添加失败"）。
//
// 因此这里手写 UUID v4：
//   - Web 端有 crypto.getRandomValues 就用它（熵更均匀）
//   - 其他环境（mp-weixin、Node 老版本）回退 Math.random
//   - 生成的字符串格式与 RFC4122 v4 完全一致：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx

const HEX = '0123456789abcdef'

function rndHex(n: number): string {
  // 优先用 crypto.getRandomValues（Web / Node 18+）
  const c = (typeof globalThis !== 'undefined' ? globalThis : {}) as any
  const cg = c?.crypto?.getRandomValues
  if (typeof cg === 'function') {
    const buf = new Uint8Array(n)
    try {
      cg.call(c.crypto, buf)
      let s = ''
      for (let i = 0; i < n; i++) s += HEX[buf[i] & 15] + HEX[(buf[i] >> 4) & 15]
      return s
    } catch {
      // 忽略，回退 Math.random
    }
  }
  // 回退：Math.random
  let s = ''
  for (let i = 0; i < n * 2; i++) s += HEX[(Math.random() * 16) | 0]
  return s
}

/** 生成 RFC4122 v4 UUID（离线幂等 ID） */
export function newId(): string {
  // xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  //   y ∈ {8,9,a,b}
  const hex = rndHex(16)
  const y = (parseInt(hex[12], 16) & 0x3) | 0x8
  const yHex = HEX[y]
  return (
    hex.slice(0, 8) + '-' +
    hex.slice(8, 12) + '-' +
    '4' + hex.slice(13, 16) + '-' +
    yHex + hex.slice(17, 20) + '-' +
    hex.slice(20, 32)
  )
}

export function nowIso(): string {
  return new Date().toISOString()
}
