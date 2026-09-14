<template>
  <main class="mx-auto max-w-md px-4">
    <!-- 页头：大标题 + 住所/计数副行 + 头像（不 sticky，滚走） -->
    <header class="flex items-center justify-between pt-4">
      <div class="min-w-0">
        <p class="font-display text-lg font-bold tracking-wide">物品</p>
        <!-- 计数依赖数据加载，hydration 前等高占位防跳动 -->
        <p class="mt-1 flex h-5 items-center text-xs text-text-tertiary">
          <template v-if="hydrated">{{ auth.currentHousehold?.name ?? '' }} · 共 {{ total }} 件</template>
          <template v-else>&nbsp;</template>
        </p>
      </div>
      <NuxtLink to="/settings" aria-label="设置">
        <UserAvatar :name="auth.user?.displayName" :email="auth.user?.email" :src="auth.user?.avatarUrl" :size="44" dot />
      </NuxtLink>
    </header>

    <!-- sticky 筛选区：搜索 + 三级 pill + 标签 chips，滚动列表时常驻 -->
    <div class="sticky top-0 z-10 bg-neutral-bg pb-2">
      <!-- 搜索（提交后写入 URL query，支持返回键回退） -->
      <form class="relative mt-2" @submit.prevent="applyKeyword">
        <Search :size="17" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
        <input v-model="keywordDraft" type="search"
               class="h-11 w-full rounded-lg border border-border bg-neutral-surface pl-10 pr-9 text-sm shadow-level-1 outline-none placeholder:text-text-tertiary focus:border-primary"
               placeholder="搜索名称、备注或标签" />
        <button v-if="keywordDraft" type="button" aria-label="清除搜索"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                @click="clearKeyword">
          <X :size="16" aria-hidden="true" />
        </button>
      </form>

      <!-- 空间筛选 pill：房间/家具/格子，前缀 + 无边框 select（级联：上级变更下级自动重置） -->
      <div class="mt-2 flex gap-2">
        <label v-for="level in locationLevels" :key="level.key"
               class="flex h-9 min-w-0 flex-1 items-center gap-0.5 rounded-md border border-border bg-neutral-surface px-3 text-xs shadow-level-1"
               :class="{ 'opacity-50': level.disabled }">
          <span class="shrink-0 text-text-secondary">{{ level.label }}：</span>
          <select class="min-w-0 flex-1 appearance-none bg-transparent font-semibold text-text-primary outline-none"
                  :aria-label="level.label" :value="level.value" :disabled="level.disabled"
                  @change="onLocationChange">
            <option value="">全部</option>
            <option v-for="opt in level.options" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
          <ChevronDown :size="11" class="shrink-0 text-text-tertiary" aria-hidden="true" />
        </label>
      </div>

      <!-- 标签筛选：热门标签，单选可取消；"全部"为复位 -->
      <div v-if="tags.length" class="mt-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:thin]">
        <button type="button" :class="!activeTag ? chipOn : chipOff" @click="setQuery({ tag: undefined })">全部</button>
        <button v-for="t in tags" :key="t.tag" type="button"
                :class="activeTag === t.tag ? chipOn : chipOff" @click="toggleTag(t.tag)">
          {{ t.tag }}
        </button>
      </div>
    </div>

    <!-- 物品网格：2 列卡 + 无限滚动 -->
    <section class="pt-3" aria-label="物品总览">
      <!-- hydration 首帧骨架屏：SSR 与客户端输出一致，规避 pending 分支的 hydration mismatch -->
      <div v-if="!hydrated" class="grid grid-cols-2 gap-2.5" aria-hidden="true">
        <div v-for="i in 6" :key="i" class="overflow-hidden rounded-2xl border border-border bg-neutral-surface">
          <div class="h-[58px] bg-neutral-sunken" />
          <div class="px-3 py-2"><div class="h-3.5 w-2/3 rounded bg-neutral-sunken" /></div>
        </div>
      </div>
      <!-- 有缓存数据时刷新不闪加载态 -->
      <p v-else-if="firstStatus === 'pending' && !list.length" class="p-4 text-sm text-text-tertiary">加载中…</p>
      <template v-else>
        <SectionTitle v-if="list.length" title="全部物品">
          <template #aux>按添加时间</template>
        </SectionTitle>

        <div v-if="list.length" class="mt-3 grid grid-cols-2 gap-2.5">
          <ItemThumbCard v-for="item in list" :key="item.id" :item="item" />
        </div>
        <div v-else class="rounded-2xl border border-border bg-neutral-surface p-6 text-center shadow-level-1">
          <Package :size="28" class="mx-auto text-text-tertiary" aria-hidden="true" />
          <p class="mt-2 text-sm text-text-secondary">{{ hasFilter ? '没有匹配的物品' : '还没有物品' }}</p>
          <button v-if="hasFilter" type="button" class="mt-2 text-sm font-medium text-primary" @click="clearFilters">清除筛选</button>
          <NuxtLink v-else to="/add" class="mt-2 inline-block text-sm font-medium text-primary">去录入第一件</NuxtLink>
        </div>

        <template v-if="list.length">
          <p v-if="loadingMore" class="py-3 text-center text-sm text-text-tertiary">加载中…</p>
          <p v-else-if="!hasMore" class="py-3 text-center text-2xs tracking-[0.2em] text-text-disabled">· 到底了 ·</p>
          <div ref="sentinel" class="h-px" aria-hidden="true"></div>
        </template>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ChevronDown, Package, Search, X } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'
import type { LocationTreeNode } from '~/server/utils/locations'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// hydration 完成标记：首帧渲染与服务端一致，规避 pending 分支 mismatch
const hydrated = useHydrated()

// 每页条数：2 列网格取偶数
const LIMIT = 20

// 筛选状态以 URL query 为准（/items?keyword=&location_id=&tag=），跳转/返回/刷新天然一致
const keyword = computed(() => String(route.query.keyword ?? '').trim())
const locationId = computed(() => String(route.query.location_id ?? '').trim())
const activeTag = computed(() => String(route.query.tag ?? '').trim())
const hasFilter = computed(() => Boolean(keyword.value || locationId.value || activeTag.value))

// 动态缓存 key：每种筛选组合独立走 SWR 缓存
const cacheKey = computed(() => `items-overview:${keyword.value}:${locationId.value}:${activeTag.value}`)

interface ItemsPage { items: ItemSummary[]; total: number }

function buildParams(limit: number, offset: number): URLSearchParams {
  const p = new URLSearchParams()
  if (keyword.value) p.set('keyword', keyword.value)
  if (locationId.value) p.set('location_id', locationId.value)
  if (activeTag.value) p.set('tag', activeTag.value)
  p.set('limit', String(limit))
  p.set('offset', String(offset))
  return p
}

// 首页数据走 SWR；后续页手动追加（避免分页 key 爆炸）
const { data: firstPage, status: firstStatus, refresh: refreshFirst } = await useAsyncData<ItemsPage>(
  cacheKey,
  () => apiFetch<ItemsPage>(`/api/items?${buildParams(LIMIT, 0).toString()}`),
  { server: false, default: () => ({ items: [], total: 0 }), getCachedData: swrCache },
)

const list = ref<ItemSummary[]>([])
const total = ref(0)
const hasMore = ref(false)
const loadingMore = ref(false)

// 首页数据（含缓存命中/刷新）到达后重置列表与分页游标
watch(firstPage, (page) => {
  list.value = page.items
  total.value = page.total
  hasMore.value = page.items.length < LIMIT && page.items.length < page.total
}, { immediate: true })

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const res = await apiFetch<ItemsPage>(`/api/items?${buildParams(LIMIT, list.value.length).toString()}`)
    // 按 id 去重：offset 分页期间有新增时避免重复渲染
    const seen = new Set(list.value.map(x => x.id))
    list.value = [...list.value, ...res.items.filter(x => !seen.has(x.id))]
    total.value = res.total
    hasMore.value = list.value.length < res.total
  } finally {
    loadingMore.value = false
  }
}

// 无限滚动：哨兵进入视口（含 240px 预载）时追加下一页
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let observedEl: HTMLElement | null = null

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) loadMore()
  }, { rootMargin: '240px' })
  observedEl = sentinel.value
  if (observedEl) observer.observe(observedEl)

  // SWR 策略：先用缓存渲染，进入页面后再拉最新
  refreshFirst()
  refreshTree()
  refreshTags()
  // 从 URL 恢复搜索草稿，保持输入框与结果一致
  keywordDraft.value = keyword.value
})

watch(sentinel, (el) => {
  if (observedEl && observer) observer.unobserve(observedEl)
  observedEl = el
  if (el && observer) observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

// 房间筛选数据源：复用空间树的缓存 key（与空间页/添加表单共享，参数保持一致）
const { data: tree, refresh: refreshTree } = await useAsyncData('location-tree', () =>
  apiFetch<LocationTreeNode[]>('/api/locations'),
{ server: false, default: () => [], getCachedData: swrCache })

// 从树中定位当前 location_id 的层级链 [房间, 家具, 格位]，驱动三级 pill 的选中值与级联选项
const locationChain = computed(() => {
  const target = locationId.value
  if (!target) return {} as { room?: LocationTreeNode; furniture?: LocationTreeNode; compartment?: LocationTreeNode }
  const walk = (nodes: LocationTreeNode[], chain: LocationTreeNode[]): LocationTreeNode[] | null => {
    for (const n of nodes) {
      const next = [...chain, n]
      if (n.id === target) return next
      const hit = walk(n.children ?? [], next)
      if (hit) return hit
    }
    return null
  }
  const [room, furniture, compartment] = walk(tree.value, []) ?? []
  return { room, furniture, compartment }
})

// 三级 pill 配置：前缀/选中值/选项/禁用（家具需先选房间，格子需先选家具）
const locationLevels = computed(() => [
  {
    key: 'room', label: '房间', value: locationChain.value.room?.id ?? '',
    options: tree.value, disabled: false,
  },
  {
    key: 'furniture', label: '家具', value: locationChain.value.furniture?.id ?? '',
    options: locationChain.value.room?.children ?? [], disabled: !locationChain.value.room,
  },
  {
    key: 'compartment', label: '格子', value: locationChain.value.compartment?.id ?? '',
    options: locationChain.value.furniture?.children ?? [], disabled: !locationChain.value.furniture,
  },
])

// 标签筛选数据源：热门标签
const { data: tagsRes, refresh: refreshTags } = await useAsyncData('hot-tags', () =>
  apiFetch<{ tags: { tag: string; count: number }[] }>('/api/tags'),
{ server: false, default: () => ({ tags: [] }), getCachedData: swrCache })
const tags = computed(() => tagsRes.value.tags)

// ---- 筛选操作 ----
const keywordDraft = ref('')

// 标签 chip 两态样式：选中用品牌 tint 药丸（与全站 tag 语言一致）
const chipOn = 'inline-flex h-[30px] shrink-0 items-center rounded-full border border-transparent bg-tint px-3 text-xs font-semibold text-primary-dark'
const chipOff = 'inline-flex h-[30px] shrink-0 items-center rounded-full border border-border-strong bg-neutral-surface px-3 text-xs font-medium text-text-secondary hover:border-text-tertiary'

function setQuery(patch: Record<string, string | undefined>, mode: 'replace' | 'push' = 'replace') {
  const query = { ...route.query }
  for (const [k, v] of Object.entries(patch)) {
    if (v) query[k] = v
    else delete query[k]
  }
  router[mode]({ path: '/items', query })
}

// 搜索提交用 push（可后退到未筛选态），chips 用 replace（避免历史堆积）
function applyKeyword() {
  setQuery({ keyword: keywordDraft.value.trim() || undefined }, 'push')
}
function clearKeyword() {
  keywordDraft.value = ''
  setQuery({ keyword: undefined })
}
// 三级 pill 共用：写入当前层级 id；上级变更时下级选中值随链路自动重置
function onLocationChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  setQuery({ location_id: v || undefined })
}
function toggleTag(t: string) {
  setQuery({ tag: activeTag.value === t ? undefined : t })
}
function clearFilters() {
  keywordDraft.value = ''
  setQuery({ keyword: undefined, location_id: undefined, tag: undefined })
}
</script>
