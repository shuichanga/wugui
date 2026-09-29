// uni storage → core KVDriver 适配
export const kvDriver = {
  get(key: string): string | null {
    const v = uni.getStorageSync(key)
    return v === '' || v === undefined || v === null ? null : (v as string)
  },
  set(key: string, value: string) {
    uni.setStorageSync(key, value)
  },
  remove(key: string) {
    uni.removeStorageSync(key)
  },
}
