// 拖拽排序期间的滚动锁（模块级 ref，容器页与 tab 组件共享同一份状态）
// 背景：tab 内容在 scroll-view 里滚动，长按拖卡时 touchmove 会冒泡给 scroll-view，
// 内容跟着手势滚动、在悬浮卡下方移动，表现为页面抖动；拖拽期间锁定滚动即可消除
import { ref } from 'vue'

const locked = ref(false)

export function useDragLock() {
  function setDragLock(value: boolean) {
    locked.value = value
  }
  return { dragLocked: locked, setDragLock }
}
