<template>
  <!-- 嵌套路由：位置详情子路由时只渲染子页面 -->
  <template v-if="isChild">
    <NuxtPage />
  </template>
  <main v-else class="mx-auto max-w-md px-4 pt-4">
    <header class="relative -mx-4 flex items-center justify-between bg-primary px-4 py-3 text-white">
      <span class="w-12" aria-hidden="true"></span>
      <h1 class="absolute left-1/2 -translate-x-1/2 text-lg">位置</h1>
      <button type="button" class="flex items-center gap-1 text-sm text-white/90 hover:text-white" @click="formOpen = !formOpen">
        <Plus :size="16" aria-hidden="true" />
        <span>{{ formOpen ? '收起' : '新增位置' }}</span>
      </button>
    </header>

    <!-- 新增位置 -->
    <form v-if="formOpen" class="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-neutral-surface p-4" @submit.prevent="addLocation">
      <section>
        <label for="loc-name" class="mb-1 block text-sm font-medium">名称</label>
        <input id="loc-name" v-model="form.name" type="text" class="input-base" placeholder="例如：客厅、电视柜、第2抽屉" required
               @focus="nameFocused = true" @blur="nameFocused = false" />
        <div v-if="nameFocused && filteredSuggestions.length" class="mt-2 flex flex-wrap gap-1.5" @mousedown.prevent>
          <button v-for="s in filteredSuggestions" :key="s" type="button"
                  class="rounded border border-border bg-neutral-sunken px-2 py-0.5 text-xs text-text-secondary hover:border-primary hover:text-primary"
                  @click="pickSuggestion(s)">
            {{ s }}
          </button>
        </div>
      </section>
      <section>
        <label for="loc-parent" class="mb-1 block text-sm font-medium">上级位置 <span class="font-normal text-text-tertiary">（不选则为房间）</span></label>
        <select id="loc-parent" v-model="form.parentId" class="input-base">
          <option value="">无（新建房间）</option>
          <option v-for="opt in parentOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
        </select>
      </section>
      <p v-if="error" class="rounded-md border border-border bg-neutral-sunken p-2 text-sm text-error" role="alert">{{ error }}</p>
      <button type="submit" class="btn-primary" :disabled="adding">{{ adding ? '添加中…' : '添加' }}</button>
    </form>

    <!-- 位置卡片 -->
    <section class="mt-4" aria-label="位置看板">
      <p v-if="pending" class="p-4 text-sm text-text-tertiary">加载中…</p>
      <p v-else-if="!tree?.length" class="p-4 text-sm text-text-tertiary">还没有位置，点右上角"新增位置"创建第一个房间</p>
      <ul v-else class="flex flex-col gap-3">
        <li v-for="room in tree" :key="room.id">
          <RoomLocationsCard :room="room" @delete="removeLocation" />
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import type { LocationTreeNode } from '~/server/utils/locations'

// 嵌套路由：/locations/:id 时父组件只作为出口
const route = useRoute()
const isChild = computed(() => route.name === 'locations-id')

const { data: tree, pending, refresh } = await useAsyncData('location-tree', () =>
  apiFetch<LocationTreeNode[]>('/api/locations'),
{ server: false })

const formOpen = ref(false)
const nameFocused = ref(false)
const form = reactive({ name: '', parentId: '' })
const error = ref('')
const adding = ref(false)

// 上级位置候选：房间和家具（扁平化带缩进）
const parentOptions = computed(() => {
  const opts: { id: string; label: string }[] = []
  const walk = (nodes: LocationTreeNode[] | undefined, depth: number) => {
    for (const n of nodes ?? []) {
      if (n.level !== 'compartment') {
        opts.push({ id: n.id, label: `${'　'.repeat(depth)}${n.name}` })
        walk(n.children, depth + 1)
      }
    }
  }
  walk(tree.value, 0)
  return opts
})

// ── 位置名称建议 ──
const ROOT_SUGGESTIONS = ['客厅', '主卧', '次卧', '厨房', '卫生间', '阳台', '书房', '玄关', '餐厅', '衣帽间', '储物间', '洗衣房']

const FURNITURE_BY_ROOM: Record<string, string[]> = {
  '客厅': ['沙发', '茶几', '电视柜', '书架', '鞋柜', '边几'],
  '主卧': ['衣柜', '床头柜', '书桌', '梳妆台', '沙发', '书柜'],
  '次卧': ['衣柜', '床头柜', '书桌', '电脑桌', '书架'],
  '厨房': ['橱柜', '冰箱', '微波炉', '调料架', '碗柜', '水槽柜'],
  '卫生间': ['洗手台', '镜柜', '浴室柜', '收纳架', '鞋柜'],
  '阳台': ['洗衣机', '晾晒架', '花架', '收纳柜', '置物架'],
  '书房': ['书桌', '书柜', '电脑桌', '收纳柜', '文件柜'],
  '玄关': ['鞋柜', '衣帽架', '换鞋凳', '钥匙盒', '收纳柜'],
  '餐厅': ['餐桌', '餐边柜', '酒柜', '收纳柜', '冰箱'],
  '衣帽间': ['衣架', '抽屉柜', '鞋架', '收纳盒', '首饰柜'],
  '储物间': ['架子', '收纳箱', '储物柜', '货架'],
  '洗衣房': ['洗衣机', '烘干机', '收纳架', '清洁柜', '拖把架'],
}

const ROOM_KEYWORD_MAP: Record<string, string> = {
  '客厅': '客厅', '起居': '客厅',
  '卧': '主卧', '睡': '主卧', '床': '主卧',
  '厨': '厨房', '灶': '厨房',
  '卫': '卫生间', '浴': '卫生间', '厕': '卫生间',
  '阳': '阳台', '露': '阳台',
  '书': '书房',
  '门': '玄关', '玄': '玄关',
  '餐': '餐厅', '饭': '餐厅',
  '衣帽': '衣帽间', '衣': '衣帽间',
  '储': '储物间', '藏': '储物间', '仓': '储物间',
  '洗': '洗衣房',
}

const FALLBACK_FURNITURE = ['抽屉', '柜子', '箱子', '收纳盒', '架子', '置物架']

// 根据上级位置推断房间类型
function getParentName(parentId: string): string {
  if (!parentId) return ''
  const walk = (nodes: LocationTreeNode[] | undefined): string | undefined => {
    for (const n of nodes ?? []) {
      if (n.id === parentId) return n.name
      const found = walk(n.children)
      if (found) return found
    }
    return undefined
  }
  return walk(tree.value) ?? ''
}

// 计算当前层级可用的建议名称
const rawSuggestions = computed(() => {
  if (!form.parentId) return ROOT_SUGGESTIONS
  const parentName = getParentName(form.parentId)
  let roomKey: string | undefined
  for (const [kw, mapped] of Object.entries(ROOM_KEYWORD_MAP)) {
    if (parentName.includes(kw)) { roomKey = mapped; break }
  }
  return (roomKey && FURNITURE_BY_ROOM[roomKey]) || FALLBACK_FURNITURE
})

// 根据输入内容过滤建议
const filteredSuggestions = computed(() => {
  const kw = form.name.trim().toLowerCase()
  if (!kw) return rawSuggestions.value
  return rawSuggestions.value.filter(s => s.toLowerCase().includes(kw))
})

function pickSuggestion(name: string) {
  form.name = name
  nameFocused.value = false
}

async function addLocation() {
  error.value = ''
  adding.value = true
  try {
    await apiFetch('/api/locations', {
      method: 'POST',
      body: { name: form.name, parentId: form.parentId || undefined },
    })
    form.name = ''
    form.parentId = ''
    await refresh()
  } catch (e: unknown) {
    error.value = (e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '添加失败'
  } finally {
    adding.value = false
  }
}

const { confirmDialog, alertDialog } = useDialog()

async function removeLocation(id: string) {
  if (!(await confirmDialog({
    title: '删除位置',
    message: '确定删除该位置？',
    confirmText: '删除',
    danger: true,
  }))) return
  try {
    await apiFetch(`/api/locations/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (e: unknown) {
    await alertDialog('删除失败', (e as { data?: { statusMessage?: string } })?.data?.statusMessage)
  }
}
</script>
