<template>
  <main class="mx-auto max-w-md px-4 pt-4">
    <header>
      <h1 class="text-xl">添加物品</h1>
    </header>

    <form class="mt-4 flex flex-col gap-4" @submit.prevent="save(false)">
      <!-- 名称 -->
      <section>
        <label for="item-name" class="mb-1 block text-sm font-medium">名称 <span class="text-error">*</span></label>
        <input id="item-name" v-model="form.name" type="text" class="input-base" placeholder="例如：螺丝刀套装" required />
      </section>

      <!-- 位置级联 -->
      <section>
        <span class="mb-1 block text-sm font-medium">收纳位置 <span class="text-error">*</span></span>

        <!-- 最近位置：1 tap 直选 -->
        <div v-if="recentList.length" class="mb-2 flex flex-wrap gap-1.5">
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
          <button type="button" class="h-10 w-10 rounded-md border border-input-border text-lg" aria-label="减少" @click="form.quantity > 1 && form.quantity--">−</button>
          <input :value="form.quantity" type="number" min="1" class="input-base w-20 text-center"
                 @change="form.quantity = Math.max(1, Number(($event.target as HTMLInputElement).value) || 1)" />
          <button type="button" class="h-10 w-10 rounded-md border border-input-border text-lg" aria-label="增加" @click="form.quantity++">+</button>
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
          <li v-for="s in tagSuggestions" :key="s">
            <button type="button" class="rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary"
                    @click="addTagFromSuggestion(s)">+ {{ s }}</button>
          </li>
        </ul>
      </section>

      <!-- 照片：前端压缩，保存后直传 R2 -->
      <PhotoUploader v-model="form.photos" />

      <!-- 备注 -->
      <section>
        <label for="item-notes" class="mb-1 block text-sm font-medium">备注</label>
        <textarea id="item-notes" v-model="form.notes" rows="2" class="input-base" placeholder="选填"></textarea>
      </section>

      <!-- 操作 -->
      <div class="mb-4 flex gap-3">
        <button type="button" class="btn-secondary flex-1" @click="save(true)">保存并继续</button>
        <button type="submit" class="btn-primary flex-1" :disabled="saving">
          {{ saving && !keepGoing ? '保存中…' : '保存' }}
        </button>
      </div>
    </form>

    <!-- 保存提示 -->
    <p v-if="savedTip" class="mb-4 rounded-md border border-border bg-neutral-surface p-3 text-sm text-success shadow-level-1" role="status">
      {{ savedTip }}
    </p>
  </main>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { LocationTreeNode } from '~/server/utils/locations'
import type { PendingPhoto } from '~/components/PhotoUploader.vue'

const TAG_SUGGESTIONS = ['工具', '五金', '耗材', '衣物', '证件', '户外', '玩具', '文具', '厨具', '床品', '电子', '线材', '出行']
const tagSuggestions = TAG_SUGGESTIONS

// 真实位置树做级联
const { data: tree } = await useAsyncData('location-tree-add', () =>
  apiFetch<LocationTreeNode[]>('/api/locations'),
{ server: false })
const rooms = computed(() => tree.value ?? [])

const form = reactive({
  name: '',
  roomId: '',
  furnitureId: '',
  compartmentId: '',
  quantity: 1,
  tags: [] as string[],
  photos: [] as PendingPhoto[],
  notes: '',
})

const tagDraft = ref('')
const savedTip = ref('')

// 最近位置记忆
const { list: recentList, load: loadRecent, push: pushRecent } = useRecentLocations()
onMounted(() => {
  loadRecent()
  void refreshTree()
})

async function refreshTree() {
  await refreshNuxtData('location-tree-add')
}

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

// 保存成功后记录本次位置（含路径名）
function rememberLocation() {
  if (!selectedRoom.value) return
  const parts = [selectedRoom.value.name]
  let furnitureId: string | undefined
  let compartmentId: string | undefined
  if (selectedFurniture.value) {
    parts.push(selectedFurniture.value.name)
    furnitureId = selectedFurniture.value.id
  }
  if (selectedCompartment.value) {
    parts.push(selectedCompartment.value.name)
    compartmentId = selectedCompartment.value.id
  }
  pushRecent({
    id: selectedCompartment.value?.id ?? selectedFurniture.value?.id ?? selectedRoom.value.id,
    label: parts.join(' / '),
    roomId: selectedRoom.value.id,
    furnitureId,
    compartmentId,
  })
}

const selectedRoom = computed(() => rooms.value.find(r => r.id === form.roomId))
const selectedFurniture = computed(() => selectedRoom.value?.children?.find(f => f.id === form.furnitureId))
const selectedCompartment = computed(() => selectedFurniture.value?.children?.find(c => c.id === form.compartmentId))
const furnitureOptions = computed(() => selectedRoom.value?.children ?? [])
const compartmentOptions = computed(() => selectedFurniture.value?.children ?? [])

// 级联清空逻辑在模板的 @change 中处理（用户交互时触发），
// applyRecent 程序化赋值时不会互相干扰

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

// 连续录入保留位置与标签，仅清空名称与照片
const saving = ref(false)
const keepGoing = ref(false)

async function save(continueNext: boolean) {
  if (!form.roomId) {
    savedTip.value = ''
    alert('请选择收纳位置')
    return
  }
  saving.value = true
  keepGoing.value = continueNext
  try {
    const res = await apiFetch<{ id: string }>('/api/items', {
      method: 'POST',
      body: {
        name: form.name,
        locationId: form.compartmentId || form.furnitureId || form.roomId,
        quantity: form.quantity,
        tags: form.tags,
        notes: form.notes || undefined,
      },
    })
    if (form.photos.length) {
      await uploadPhotos(res.id, form.photos)
    }
    rememberLocation()
    if (continueNext) {
      savedTip.value = `已保存「${form.name}」，继续录入下一件`
      form.name = ''
      for (const p of form.photos) URL.revokeObjectURL(p.previewUrl)
      form.photos = []
    } else {
      await navigateTo(`/items/${res.id}`)
    }
  } catch (e: unknown) {
    alert((e as { data?: { statusMessage?: string } })?.data?.statusMessage ?? '保存失败')
  } finally {
    saving.value = false
  }
}

// 照片经 Worker 中转 multipart 上传（本地/生产行为一致）
async function uploadPhotos(itemId: string, photos: PendingPhoto[]) {
  for (const p of photos) {
    const fd = new FormData()
    fd.append('file', p.file)
    await apiFetch(`/api/items/${itemId}/photos`, { method: 'POST', body: fd })
  }
}
</script>
