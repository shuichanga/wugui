<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <!-- sticky：页头（主题色）与筛选区（页面底色）上下分离，滚动列表时常驻 -->
    <div class="sticky top-0 z-10 -mx-4">
      <!-- 头部形态与空间/我的页统一：左占位 + 绝对居中标题 + 右侧计数 -->
      <header class="relative flex items-center justify-between bg-primary px-4 py-3 text-white">
        <span class="w-12" aria-hidden="true"></span>
        <h1 class="absolute left-1/2 -translate-x-1/2 text-lg">物品</h1>
        <span class="shrink-0 text-xs text-white/80">共 {{ total }} 件</span>
      </header>

      <!-- 筛选区：搜索 + 三级空间下拉 + 标签 chips -->
      <div class="border-b border-border bg-neutral-bg px-4 py-2">
        <!-- 搜索（提交后写入 URL query，支持返回键回退） -->
        <form class="relative" @submit.prevent="applyKeyword">
          <Search :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <input v-model="keywordDraft" type="search" class="input-base pl-9 pr-9"
                 placeholder="搜索物品名称、标签、备注" />
          <button v-if="keywordDraft" type="button" aria-label="清除搜索"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                  @click="clearKeyword">
            <X :size="16" aria-hidden="true" />
          </button>
        </form>

        <!-- 空间筛选：房间/家具/格位三级级联下拉（与添加页一致），选中任意层级含其后代物品 -->
        <div class="mt-2 grid grid-cols-3 gap-2">
          <select class="input-base" aria-label="房间" :value="locationChain.room?.id ?? ''" @change="onLocationChange">
            <option value="">全部房间</option>
            <option v-for="room in tree" :key="room.id" :value="room.id">{{ room.name }}</option>
          </select>
          <select class="input-base" aria-label="家具" :value="locationChain.furniture?.id ?? ''"
                  :disabled="!locationChain.room" @change="onLocationChange">
            <option value="">全部家具</option>
            <option v-for="f in furnitureOptions" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
          <select class="input-base" aria-label="格位" :value="locationChain.compartment?.id ?? ''"
                  :disabled="!locationChain.furniture" @change="onLocationChange">
            <option value="">全部格位</option>
            <option v-for="c in compartmentOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <!-- 标签筛选：热门标签前 20，单选可取消 -->
        <div v-if="tags.length" class="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
          <span class="shrink-0 text-xs text-text-tertiary">标签</span>
          <button v-for="t in tags" :key="t.tag" type="button"
                  class="shrink-0 rounded-md border px-2 py-1 text-xs"
                  :class="activeTag === t.tag ? 'border-primary bg-primary font-medium text-white' : 'border-border bg-neutral-surface text-text-secondary hover:border-primary hover:text-primary'"
                  @click="toggleTag(t.tag)">
            {{ t.tag }}
          </button>
        </div>
      </div>
    </div>

    <!-- 物品网格：3 列小竖卡 + 无限滚动 -->
    <section class="pt-3" aria-label="物品总览">
      <!-- hydration 首帧骨架屏：SSR 与客户端输出一致，规避 pending 分支的 hydration mismatch -->
      <div v-if="!hydrated" class="grid grid-cols-3 gap-2" aria-hidden="true">
        <div v-for="i in 6" :key="i" class="aspect-[3/4] rounded-lg bg-neutral-sunken" />
      </div>
      <!-- 有缓存数据时刷新不闪加载态 -->
      <p v-else-if="firstStatus === 'pending' && !list.length" class="p-4 text-sm text-text-tertiary">加载中…</p>
      <template v-else>
        <div v-if="list.length" class="grid grid-cols-3 gap-2">
          <ItemThumbCard v-for="item in list" :key="item.id" :item="item" />
        </div>
        <div v-else class="rounded-lg border border-border bg-neutral-surface p-4 text-center">
          <p class="text-sm text-text-secondary">{{ hasFilter ? '没有匹配的物品' : '还没有物品' }}</p>
          <button v-if="hasFilter" type="button" class="mt-2 text-sm font-medium text-primary" @click="clearFilters">清除筛选</button>
          <NuxtLink v-else to="/add" class="mt-2 inline-block text-sm font-medium text-primary">去录入第一件</NuxtLink>
        </div>

        <template v-if="list.length">
          <p v-if="loadingMore" class="py-3 text-center text-sm text-text-tertiary">加载中…</p>
          <p v-else-if="!hasMore" class="py-3 text-center text-xs text-text-tertiary">到底了</p>
          <div ref="sentinel" class="h-px" aria-hidden="true"></div>
        </template>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'
import type { ItemSummary } from '~/server/utils/items'
import type { LocationTreeNode } from '~/server/utils/locations'

const route = useRoute()
const router = useRouter()

// hydration 完成标记：首帧渲染与服务端一致，规避 pending 分支 mismatch
const hydrated = useHydrated()

// 每页条数：3 列网格取 3 的倍数
const LIMIT = 21

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

// 从树中定位当前 location_id 的层级链 [房间, 家具, 格位]，驱动三级下拉的选中值与级联选项
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
const furnitureOptions = computed(() => locationChain.value.room?.children ?? [])
const compartmentOptions = computed(() => locationChain.value.furniture?.children ?? [])

// 标签筛选数据源：热门标签
const { data: tagsRes, refresh: refreshTags } = await useAsyncData('hot-tags', () =>
  apiFetch<{ tags: { tag: string; count: number }[] }>('/api/tags'),
{ server: false, default: () => ({ tags: [] }), getCachedData: swrCache })
const tags = computed(() => tagsRes.value.tags)

// ---- 筛选操作 ----
const keywordDraft = ref('')

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
// 三级下拉共用：写入当前层级 id；上级变更时下级选中值随链路自动重置
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
