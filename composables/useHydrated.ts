// hydration 完成标记：挂载前恒为 false。
// Nuxt 对 server:false 的取数在 onBeforeMount（组件首帧渲染之前）启动，
// 依赖 pending 状态的条件分支若不 gate 此标记，SSR 与客户端首帧会不一致并产生 hydration mismatch。
export function useHydrated() {
  const hydrated = ref(false)
  onMounted(() => { hydrated.value = true })
  return hydrated
}
