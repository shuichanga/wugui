// 用户头像（本地模式）：头像图持久化到小程序本地目录，路径存 Storage
// 对齐 Web 端 UserAvatar：有图显示图片，无图显示昵称首字
import { ref } from 'vue'

const KEY = 'wugui:avatar-path'

const avatarPath = ref<string>(uni.getStorageSync(KEY) || '')

export function useAvatar() {
  function setAvatar(path: string) {
    avatarPath.value = path
    uni.setStorageSync(KEY, path)
  }

  function clearAvatar() {
    avatarPath.value = ''
    uni.removeStorageSync(KEY)
  }

  return { avatarPath, setAvatar, clearAvatar }
}
