// uni storage → core KVDriver 适配
export const kvDriver = {
  get(key: string): string | null {
    const v = uni.getStorageSync(key)
    // #region debug-point E:kv-get (sync-pull-missing-items)
    if (key.includes(':sync:')) uni.request({ url: 'http://127.0.0.1:7777/event', method: 'POST', data: { sessionId: 'sync-pull-missing-items', runId: 'pre', hypothesisId: 'E', location: 'kv.ts:get', msg: '[DEBUG] kv get sync key', data: { key, value: v === '' || v === undefined || v === null ? null : String(v).slice(0, 40) }, ts: Date.now() } })
    // #endregion
    return v === '' || v === undefined || v === null ? null : (v as string)
  },
  set(key: string, value: string) {
    // #region debug-point E:kv-set (sync-pull-missing-items)
    if (key.includes(':sync:')) uni.request({ url: 'http://127.0.0.1:7777/event', method: 'POST', data: { sessionId: 'sync-pull-missing-items', runId: 'pre', hypothesisId: 'E', location: 'kv.ts:set', msg: '[DEBUG] kv set sync key', data: { key, value: String(value).slice(0, 40) }, ts: Date.now() } })
    // #endregion
    uni.setStorageSync(key, value)
  },
  remove(key: string) {
    uni.removeStorageSync(key)
  },
}
