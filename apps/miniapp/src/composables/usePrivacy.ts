// 微信隐私授权（触发式）：用户首次触发隐私接口（选照片 / 选聊天文件 / 写剪贴板）时，
// 微信回调 wx.onNeedPrivacyAuthorization，我们在当前页弹出 PrivacyPopup 提示阅读
// 《用户隐私保护指引》；用户点「同意并继续」后必须把 resolve 回执给平台，
// 原先被拦下的那个隐私接口才会继续执行（否则它既不成功也不失败）。
import { ref } from 'vue'

type PrivacyResolve = (res: { buttonId?: string; event: 'agree' | 'disagree' }) => void

/** @dcloudio/types 未必覆盖这三个接口，在此收敛类型 */
interface WxPrivacy {
  onNeedPrivacyAuthorization(cb: (resolve: PrivacyResolve) => void): void
  getPrivacySetting(opt: { success?: (res: { privacyContractName?: string }) => void; fail?: () => void }): void
  openPrivacyContract(opt?: { success?: () => void; fail?: () => void }): void
}

function privacyApi(): Partial<WxPrivacy> {
  // #ifdef MP-WEIXIN
  return wx as unknown as Partial<WxPrivacy>
  // #endif
  // #ifndef MP-WEIXIN
  return {}
  // #endif
}

/** 平台侧待回执的 resolve；只在当前这次弹窗期间有效 */
let pendingResolve: PrivacyResolve | null = null
/** 指引名称由后台配置，弹窗里展示真实标题（未配置时用兜底文案） */
const contractName = ref('《用户隐私保护指引》')
const visible = ref(false)

let registered = false

/** App.vue onLaunch 注册一次：全局监听只能保留最后一个，重复注册会顶掉前一个 */
export function registerPrivacyListener() {
  if (registered) return
  registered = true
  const api = privacyApi()
  if (typeof api.onNeedPrivacyAuthorization !== 'function') return

  api.onNeedPrivacyAuthorization(resolve => {
    pendingResolve = resolve
    visible.value = true
  })
  api.getPrivacySetting?.({
    success: res => {
      if (res?.privacyContractName) contractName.value = `《${res.privacyContractName}》`
    },
    fail: () => {},
  })
}

export function usePrivacy() {
  /** 「同意并继续」：同意动作由 button 的 open-type 上报，这里只补回执 */
  function agree(buttonId: string) {
    pendingResolve?.({ buttonId, event: 'agree' })
    pendingResolve = null
    visible.value = false
  }

  /** 「不同意」：回执后被拦下的隐私接口会走 fail 分支，调用方已有失败提示 */
  function disagree() {
    pendingResolve?.({ event: 'disagree' })
    pendingResolve = null
    visible.value = false
  }

  /** 看指引全文：打开微信托管的正式页面，内容与后台配置一致 */
  function openContract() {
    privacyApi().openPrivacyContract?.({ fail: () => {} })
  }

  return { visible, contractName, agree, disagree, openContract }
}