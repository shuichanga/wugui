<template>
  <main class="mx-auto max-w-md px-4 md:max-w-6xl">
    <!-- 页头 -->
    <header class="mt-4 flex items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold md:text-2xl">管理后台</h1>
        <p class="mt-1 text-xs text-text-tertiary md:text-sm">物归 · 数据总览</p>
      </div>
      <nav class="flex gap-2">
        <NuxtLink to="/"
                  class="rounded-lg border border-border bg-neutral-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-strong md:text-sm">
          返回应用
        </NuxtLink>
        <NuxtLink to="/admin/users"
                  class="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 md:text-sm">
          用户管理
        </NuxtLink>
      </nav>
    </header>

    <p v-if="pending" class="mt-8 p-4 text-sm text-text-tertiary">加载中…</p>
    <p v-else-if="error" class="mt-8 rounded-2xl border border-border bg-neutral-surface p-4 text-sm text-text-secondary shadow-level-1">
      {{ error }}
    </p>

    <template v-else-if="stats">
      <!-- 总览数字卡 -->
      <section class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="数据总览">
        <div v-for="card in statCards" :key="card.label"
             class="rounded-2xl border border-border bg-neutral-surface p-3.5 shadow-level-1 md:rounded-lg md:p-4">
          <p class="text-xl font-bold leading-tight md:text-2xl">{{ card.value }}</p>
          <p class="mt-1 text-xs text-text-secondary">{{ card.label }}</p>
          <p v-if="card.sub" class="mt-0.5 text-2xs text-text-tertiary">{{ card.sub }}</p>
        </div>
      </section>

      <!-- 趋势（PC 双栏：图占主区，右列摘要） -->
      <section class="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3" aria-label="新增趋势">
        <div class="rounded-2xl border border-border bg-neutral-surface p-4 shadow-level-1 lg:col-span-2 md:rounded-lg">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold">近 30 天新增</h2>
            <div class="flex items-center gap-3 text-2xs text-text-secondary">
              <span class="inline-flex items-center gap-1"><i class="inline-block h-2 w-2 rounded-full bg-primary"></i>用户</span>
              <span class="inline-flex items-center gap-1"><i class="inline-block h-2 w-2 rounded-full bg-border-strong"></i>物品</span>
            </div>
          </div>
          <div v-if="!trend || !trend.length" class="py-10 text-center text-sm text-text-tertiary">暂无数据</div>
          <div v-else class="mt-3 flex h-44 items-end gap-1" role="img" aria-label="每日新增用户与物品柱状图">
            <div v-for="point in trend" :key="point.date" class="group relative flex h-full flex-1 flex-col justify-end">
              <div class="flex h-full items-end justify-center gap-0.5">
                <div class="w-1/2 max-w-3 rounded-t bg-primary transition-opacity group-hover:opacity-80"
                     :style="{ height: barHeight(point.users) }"></div>
                <div class="w-1/2 max-w-3 rounded-t bg-border-strong transition-opacity group-hover:opacity-80"
                     :style="{ height: barHeight(point.items) }"></div>
              </div>
              <span class="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded border border-border bg-neutral-surface px-1.5 py-0.5 text-2xs text-text-secondary shadow-level-1 group-hover:block">
                {{ point.date.slice(5) }} · 用户 {{ point.users }} / 物品 {{ point.items }}
              </span>
            </div>
          </div>
          <div v-if="trend?.length" class="mt-2 flex justify-between text-2xs text-text-tertiary">
            <span>{{ trend[0]?.date.slice(5) }}</span>
            <span>{{ trend[trend.length - 1]?.date.slice(5) }}</span>
          </div>
        </div>

        <!-- 右列：订阅与存储摘要（PC 显示，移动端堆叠在下） -->
        <div class="flex flex-col gap-3">
          <div class="rounded-2xl border border-border bg-neutral-surface p-4 shadow-level-1 md:rounded-lg">
            <h2 class="text-sm font-bold">订阅</h2>
            <p class="mt-2 flex items-baseline gap-2">
              <span class="text-2xl font-bold">{{ stats.activeSubscriptions }}</span>
              <span class="text-xs text-text-tertiary">个有效订阅</span>
            </p>
            <p class="mt-1 text-2xs text-text-tertiary">
              覆盖率 {{ coverage }} · 订阅住所全成员共享云同步
            </p>
            <NuxtLink to="/admin/users"
                      class="mt-3 inline-block rounded-md bg-tint px-3 py-1.5 text-xs font-semibold text-primary-dark hover:brightness-95">
              管理订阅 →
            </NuxtLink>
          </div>
          <div class="rounded-2xl border border-border bg-neutral-surface p-4 shadow-level-1 md:rounded-lg">
            <h2 class="text-sm font-bold">今日动态</h2>
            <ul class="mt-2 flex flex-col gap-1.5 text-xs text-text-secondary">
              <li class="flex justify-between"><span>新用户</span><span class="font-semibold">{{ stats.todayNewUsers }}</span></li>
              <li class="flex justify-between"><span>新物品</span><span class="font-semibold">{{ stats.todayNewItems }}</span></li>
              <li class="flex justify-between"><span>照片总数</span><span class="font-semibold">{{ stats.photos }}</span></li>
            </ul>
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

const coverage = computed(() => {
  if (!stats.value || !stats.value.users) return '0%'
  return `${Math.round((stats.value.activeSubscriptions / stats.value.users) * 100)}%`
})

const maxBar = computed(() => {
  if (!trend.value?.length) return 1
  return Math.max(1, ...trend.value.flatMap((p) => [p.users, p.items]))
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
