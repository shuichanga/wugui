<template>
  <form class="mt-4 flex flex-col gap-4" @submit.prevent="onSubmit(false)">
    <!-- 名称 -->
    <section>
      <label for="item-name" class="mb-1 block text-sm font-medium">名称 <span class="text-error">*</span></label>
      <input id="item-name" v-model="form.name" type="text" class="input-base" placeholder="例如：螺丝刀套装" required />
    </section>

    <!-- 位置级联 -->
    <section>
      <span class="mb-1 block text-sm font-medium">收纳位置 <span class="text-error">*</span></span>

      <!-- 最近位置：1 tap 直选 -->
      <div v-if="showRecent && recentList.length" class="mb-2 flex flex-wrap gap-1.5">
        <button v-for="r in recentList" :key="r.id" type="button"
                class="rounded-full border border-primary bg-primary px-2.5 py-1 text-xs text-white"
                @click="applyRecent(r)">
          {{ r.label }}
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <select v-model="form.roomId" class="input-base" aria-label="房间"
                @change="form.furnitureId = ''; form.compartmentId = ''">
          <option value="" disabled>房间</option>
          <option v-for="room in rooms" :key="room.id" :value="room.id">{{ room.name }}</option>
        </select>
        <select v-model="form.furnitureId" class="input-base" aria-label="家具"
                :disabled="!selectedRoom"
                @change="form.compartmentId = ''">
          <option value="" disabled>家具</option>
          <option v-for="f in furnitureOptions" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
        <select v-model="form.compartmentId" class="input-base" aria-label="格位" :disabled="!selectedFurniture">
          <option value="">不选格位</option>
          <option v-for="c in compartmentOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </section>

    <!-- 数量 -->
    <section>
      <span class="mb-1 block text-sm font-medium">数量</span>
      <div class="flex items-center gap-3">
        <button type="button" class="h-10 w-10 rounded-md border border-input-border text-lg" aria-label="减少"
                @click="form.quantity > 1 && form.quantity--">−</button>
        <input :value="form.quantity" type="number" min="1" class="input-base w-20 text-center"
               @change="form.quantity = Math.max(1, Number(($event.target as HTMLInputElement).value) || 1)" />
        <button type="button" class="h-10 w-10 rounded-md border border-input-border text-lg" aria-label="增加"
                @click="form.quantity++">+</button>
      </div>
    </section>

    <!-- 标签 -->
    <section>
      <label for="item-tag" class="mb-1 block text-sm font-medium">标签</label>
      <ul v-if="form.tags.length" class="mb-2 flex flex-wrap gap-1.5">
        <li v-for="tag in form.tags" :key="tag"
            class="flex items-center gap-1 rounded border border-border bg-neutral-sunken px-2 py-0.5 text-xs">
          {{ tag }}
          <button type="button" aria-label="移除标签" @click="removeTag(tag)">
            <X :size="12" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <input id="item-tag" v-model="tagDraft" type="text" class="input-base" placeholder="输入后回车添加"
             @keydown.enter.prevent="addTag" />
      <ul class="mt-2 flex flex-wrap gap-1.5">
        <li v-for="s in TAG_SUGGESTIONS" :key="s">
          <button type="button" class="rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary"
                  @click="addTagFromSuggestion(s)">+ {{ s }}</button>
        </li>
      </ul>
    </section>

    <!-- 扩展区：父组件放置照片上传等 -->
    <slot />

    <!-- 备注 -->
    <section>
      <label for="item-notes" class="mb-1 block text-sm font-medium">备注</label>
      <textarea id="item-notes" v-model="form.notes" rows="2" class="input-base" placeholder="选填"></textarea>
    </section>

    <!-- 操作 -->
    <div class="mb-4 flex gap-3">
      <button v-if="showKeepGoing" type="button" class="btn-secondary flex-1" @click="onSubmit(true)">
        保存并继续
      </button>
      <button type="submit" class="btn-primary flex-1" :disabled="submitting">
        {{ submitting ? '保存中…' : submitLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { LocationTreeNode } from '~/server/utils/locations'

export interface ItemFormPayload {
  name: string
  locationId: string
  quantity: number
  tags: string[]
  notes: string
}

export interface ItemFormInitial {
  name?: string
  quantity?: number
  tags?: string[]
  notes?: string | null
  locationId?: string
}

const TAG_SUGGESTIONS = ['工具', '五金', '耗材', '衣物', '证件', '户外', '玩具', '文具', '厨具', '床品', '电子', '线材', '出行']

const props = withDefaults(defineProps<{
  initial?: ItemFormInitial
  showRecent?: boolean
  showKeepGoing?: boolean
  submitting?: boolean
  submitLabel?: string
}>(), {
  showRecent: true,
  showKeepGoing: false,
  submitting: false,
  submitLabel: '保存',
})

const emit = defineEmits<{ save: [payload: ItemFormPayload, keepGoing: boolean] }>()

// 真实位置树做级联
const { data: tree } = await useAsyncData('location-tree', () =>
  apiFetch<LocationTreeNode[]>('/api/locations'),
{ server: false })
const rooms = computed(() => tree.value ?? [])

const form = reactive({
  name: props.initial?.name ?? '',
  roomId: '',
  furnitureId: '',
  compartmentId: '',
  quantity: props.initial?.quantity ?? 1,
  tags: [...(props.initial?.tags ?? [])],
  notes: props.initial?.notes ?? '',
})
const tagDraft = ref('')

const selectedRoom = computed(() => rooms.value.find(r => r.id === form.roomId))
const selectedFurniture = computed(() => selectedRoom.value?.children?.find(f => f.id === form.furnitureId))
const furnitureOptions = computed(() => selectedRoom.value?.children ?? [])
const compartmentOptions = computed(() => selectedFurniture.value?.children ?? [])

// 编辑模式：树加载后按 initial.locationId 反查整条链回填
const initialApplied = ref(false)
watch([tree, () => props.initial?.locationId], () => {
  const locId = props.initial?.locationId
  if (!locId || initialApplied.value || !tree.value?.length) return
  const chain = findChain(rooms.value, locId)
  if (chain) {
    form.roomId = chain[0]!.id
    form.furnitureId = chain[1]?.id ?? ''
    form.compartmentId = chain[2]?.id ?? ''
    initialApplied.value = true
  }
}, { immediate: true })

function findChain(nodes: LocationTreeNode[], id: string, acc: LocationTreeNode[] = []): LocationTreeNode[] | null {
  for (const n of nodes) {
    const next = [...acc, n]
    if (n.id === id) return next
    const hit = findChain(n.children ?? [], id, next)
    if (hit) return hit
  }
  return null
}

// ---- 最近位置记忆 ----
const { list: recentList, load: loadRecent, push: pushRecent } = useRecentLocations()
onMounted(() => loadRecent())

// 应用最近位置前先校验仍存在于树中，失效则忽略
function applyRecent(r: { id: string; roomId: string; furnitureId?: string; compartmentId?: string }) {
  const room = rooms.value.find(x => x.id === r.roomId)
  if (!room) return
  const furniture = r.furnitureId ? room.children?.find(x => x.id === r.furnitureId) : undefined
  if (r.furnitureId && !furniture) return
  const compartment = r.compartmentId ? furniture?.children?.find(x => x.id === r.compartmentId) : undefined
  if (r.compartmentId && !compartment) return
  form.roomId = room.id
  form.furnitureId = furniture?.id ?? ''
  form.compartmentId = compartment?.id ?? ''
}

function rememberLocation() {
  if (!selectedRoom.value) return
  const parts = [selectedRoom.value.name]
  let furnitureId: string | undefined
  let compartmentId: string | undefined
  if (selectedFurniture.value) {
    parts.push(selectedFurniture.value.name)
    furnitureId = selectedFurniture.value.id
  }
  const compartment = selectedFurniture.value?.children?.find(c => c.id === form.compartmentId)
  if (compartment) {
    parts.push(compartment.name)
    compartmentId = compartment.id
  }
  pushRecent({
    id: compartmentId ?? furnitureId ?? selectedRoom.value.id,
    label: parts.join(' / '),
    roomId: selectedRoom.value.id,
    furnitureId,
    compartmentId,
  })
}

// ---- 标签 ----
function addTag() {
  const t = tagDraft.value.trim()
  if (t && !form.tags.includes(t)) form.tags.push(t)
  tagDraft.value = ''
}
function addTagFromSuggestion(t: string) {
  if (!form.tags.includes(t)) form.tags.push(t)
}
function removeTag(t: string) {
  form.tags = form.tags.filter(x => x !== t)
}

// ---- 提交 ----
async function onSubmit(keepGoing: boolean) {
  if (!form.roomId) {
    await useDialog().alertDialog('请选择收纳位置')
    return
  }
  rememberLocation()
  emit('save', {
    name: form.name.trim(),
    locationId: form.compartmentId || form.furnitureId || form.roomId,
    quantity: form.quantity,
    tags: [...form.tags],
    notes: form.notes,
  }, keepGoing)
  // 连续录入：只清名称，位置/标签保留（照片由父组件清理）
  if (keepGoing) form.name = ''
}
</script>
