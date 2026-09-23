<template>
  <main class="mx-auto max-w-4xl px-4">
    <AppTopbar title="管理后台" fallback="/">
      <template #right>
        <NuxtLink to="/admin/users" class="text-sm font-medium text-primary-dark hover:text-primary">
          用户管理
        </NuxtLink>
      </template>
    </AppTopbar>

    <p v-if="pending" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>
    <p v-else-if="error" class="mt-8 rounded-2xl border border-border bg-neutral-surface p-4 text-sm text-text-secondary shadow-level-1">
      {{ error }}
    </p>

    <template v-else-if="stats">
      <!-- 总览数字卡 -->
      <section class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="数据总览">
        <div v-for="card in statCards" :key="card.label"
             class="rounded-lg border border-border bg-neutral-surface p-4 shadow-level-1">
          <p class="text-2xl font-bold leading-tight">{{ card.value }}</p>
          <p class="mt-1 text-xs text-text-secondary">{{ card.label }}</p>
          <p v-if="card.sub" class="mt-0.5 text-2xs text-text-tertiary">{{ card.sub }}</p>
        </div>
      </section>

      <!-- 趋势条形图（纯 CSS，不引图表库） -->
      <section class="mt-6" aria-label="新增趋势">
        <SectionTitle title="近 30 天新增">
          <template #aux>
            <span class="inline-flex items-center gap-1"><i class="inline-block h-2 w-2 rounded-full bg-primary"></i>用户</span>
            <span class="inline-flex items-center gap-1"><i class="inline-block h-2 w-2 rounded-full bg-border-strong"></i>物品</span>
          </template>
        </SectionTitle>

        <div class="mt-3 rounded-lg border border-border bg-neutral-surface p-4 shadow-level-1">
          <div v-if="!trend || !trend.length" class="py-6 text-center text-sm text-text-tertiary">暂无数据</div>
          <div v-else class="flex h-40 items-end gap-1" role="img" aria-label="每日新增用户与物品柱状图">
            <div v-for="point in trend" :key="point.date" class="group relative flex h-full flex-1 flex-col justify-end gap-0.5">
              <div class="flex h-full items-end justify-center gap-0.5">
                <div class="w-1/2 max-w-3 rounded-t bg-primary" :style="{ height: barHeight(point.users) }"></div>
                <div class="w-1/2 max-w-3 rounded-t bg-border-strong" :style="{ height: barHeight(point.items) }"></div>
              </div>
              <span class="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded border border-border bg-neutral-surface px-1.5 py-0.5 text-2xs text-text-secondary group-hover:block">
                {{ point.date.slice(5) }} · 用户 {{ point.users }} / 物品 {{ point.items }}
              </span>
            </div>
          </div>
          <div class="mt-2 flex justify-between text-2xs text-text-tertiary">
            <span>{{ trend[0]?.date.slice(5) }}</span>
            <span>{{ trend[trend.length - 1]?.date.slice(5) }}</span>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
interface AdminStats {
  users: number
  households: number
  items: number
  locations: number
  photos: number
  activeSubscriptions: number
  todayNewUsers: number
  todayNewItems: number
}
interface TrendPoint { date: string; users: number; items: number }

const auth = useAuthStore()

const stats = ref<AdminStats | null>(null)
const trend = ref<TrendPoint[] | null>(null)
const pending = ref(true)
const error = ref('')

const statCards = computed(() => {
  if (!stats.value) return []
  const s = stats.value
  return [
    { label: '用户总数', value: s.users, sub: `今日 +${s.todayNewUsers}` },
    { label: '物品总数', value: s.items, sub: `今日 +${s.todayNewItems}` },
    { label: '住所总数', value: s.households },
    { label: '空间总数', value: s.locations },
    { label: '照片总数', value: s.photos },
    { label: '有效订阅', value: s.activeSubscriptions },
  ]
})

const maxBar = computed(() => {
  if (!trend.value?.length) return 1
  return Math.max(1, ...trend.value.flatMap(p => [p.users, p.items]))
})
function barHeight(n: number): string {
  return `${Math.max(2, Math.round((n / maxBar.value) * 100))}%`
}

onMounted(async () => {
  // 服务端兜底：非管理员直接回首页
  if (!auth.loaded) await auth.fetchMe()
  if (!auth.isAdmin) {
    await navigateTo('/')
    return
  }
  try {
    const [s, t] = await Promise.all([
      apiFetch<AdminStats>('/api/admin/stats'),
      apiFetch<TrendPoint[]>('/api/admin/stats/trend?days=30'),
    ])
    stats.value = s
    trend.value = t
  } catch (e) {
    error.value = errMsg(e) || '加载失败'
  } finally {
    pending.value = false
  }
})
</script>
