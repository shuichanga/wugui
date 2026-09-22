<template>
  <!-- page-meta：状态栏/导航带高度写到 page 元素，标题与胶囊对齐 -->
  <page-meta :page-style="pageStyle" />
  <view class="page page-tabbar-footer" :class="themeClass" :style="topVars">
    <!-- 顶栏 -->
    <view class="topbar">
      <view class="topbar-back" @tap="goBack"><LocationIcon slug="chevron-left" :size="32" /></view>
      <text class="topbar-title">{{ isEdit ? '编辑物品' : '添加物品' }}</text>
    </view>

    <form class="form" @submit="onSubmit(false)">
      <!-- 名称 -->
      <view class="card field">
        <view class="label-row">
          <text class="label">名称</text>
          <text class="req">*</text>
        </view>
        <input v-model="name" class="input-base" placeholder="例如：螺丝刀套装" maxlength="50" />
      </view>

      <!-- 空间：三级级联（对齐 Web 端 ItemForm） -->
      <view class="card field">
        <view class="label-row">
          <text class="label">收纳空间</text>
          <text class="req">*</text>
        </view>

        <!-- 最近空间：1 tap 直选 -->
        <view v-if="recentList.length" class="recent-row">
          <view
            v-for="r in recentList"
            :key="r.id"
            class="recent-chip"
            @tap="applyRecent(r)"
          >
            <text>{{ r.label }}</text>
          </view>
        </view>

        <view class="cascade">
          <!-- 房间 -->
          <view class="cascade-cell" :class="{ filled: !!roomId }">
            <text class="cascade-label">房间</text>
            <picker mode="selector" :range="roomRange" @change="onPickRoom">
              <view class="cascade-pick">
                <text class="cascade-value" :class="{ placeholder: !selectedRoom }">
                  {{ selectedRoom?.name ?? '选择房间' }}
                </text>
                <LocationIcon slug="chevron-down" :size="24" state="muted" class="cascade-arrow" />
              </view>
            </picker>
          </view>
          <!-- 家具 -->
          <view class="cascade-cell" :class="{ filled: !!furnitureId, disabled: !selectedRoom }">
            <text class="cascade-label">家具</text>
            <picker mode="selector" :range="furnitureRange" :disabled="!selectedRoom" @change="onPickFurniture">
              <view class="cascade-pick">
                <text class="cascade-value" :class="{ placeholder: !selectedFurniture }">
                  {{ selectedFurniture?.name ?? '选择家具' }}
                </text>
                <LocationIcon slug="chevron-down" :size="24" state="muted" class="cascade-arrow" />
              </view>
            </picker>
          </view>
          <!-- 格位 -->
          <view class="cascade-cell" :class="{ filled: !!compartmentId, disabled: !selectedFurniture }">
            <text class="cascade-label">格位</text>
            <picker mode="selector" :range="compartmentRange" :disabled="!selectedFurniture" @change="onPickCompartment">
              <view class="cascade-pick">
                <text class="cascade-value" :class="{ placeholder: !selectedCompartment }">
                  {{ selectedCompartment?.name ?? '不选格位' }}
                </text>
                <LocationIcon slug="chevron-down" :size="24" state="muted" class="cascade-arrow" />
              </view>
            </picker>
          </view>
        </view>

        <!-- 内联添加空间：下拉里选了"＋ 新增"后出现（对齐 Web 端） -->
        <view v-if="addingLevel" class="inline-add">
          <input
            v-model="newLocationName"
            class="input-base add-input"
            :placeholder="`输入${addingLabel}名称`"
            maxlength="30"
            confirm-type="done"
            @confirm="confirmAdd"
          />
          <button class="btn-primary add-confirm" :disabled="creating" @tap="confirmAdd">
            {{ creating ? '添加中…' : '确认' }}
          </button>
          <button class="btn-secondary add-cancel" @tap="cancelAdd">取消</button>
        </view>
      </view>

      <!-- 数量 stepper -->
      <view class="card stepper-row">
        <text class="label">数量</text>
        <view class="stepper">
          <view class="step-btn" :class="{ disabled: quantity <= 1 }" @tap="dec">
            <text>−</text>
          </view>
          <text class="step-num">{{ quantity }}</text>
          <view class="step-btn" @tap="inc">
            <text>＋</text>
          </view>
        </view>
      </view>

      <!-- 标签 -->
      <view class="card field">
        <view class="label-row">
          <text class="label">标签</text>
          <text class="muted-hint">（选填）</text>
        </view>
        <view v-if="tags.length" class="tags">
          <view v-for="tag in tags" :key="tag" class="tag" :style="tagStyle(tag)">
            <text>{{ tag }}</text>
            <text class="tag-x" @tap.stop="removeTag(tag)">×</text>
          </view>
        </view>
        <view class="tag-input-row">
          <input v-model="tagDraft" class="input-base" placeholder="输入标签，逗号分隔批量添加" maxlength="20" @confirm="addTag" confirm-type="done" />
          <button class="btn-secondary add-btn" :disabled="!tagDraft.trim()" @tap="addTag">添加</button>
        </view>
        <view class="suggestions">
          <view
            v-for="s in TAG_SUGGESTIONS"
            :key="s"
            class="suggestion"
            :class="{ used: tags.includes(s) }"
            @tap="addTagFromSuggestion(s)"
          >
            <text>{{ s }}</text>
          </view>
        </view>
      </view>

      <!-- 照片 -->
      <view class="card field">
        <view class="label-row">
          <text class="label">照片</text>
          <text class="muted-hint">（最多 {{ MAX_PHOTOS }} 张，仅保存本机）</text>
        </view>
        <view class="photo-row">
          <view v-for="(p, i) in photos" :key="i" class="photo-item">
            <image :src="p" mode="aspectFill" class="photo-img" @tap="previewPhoto(i)" />
            <view class="photo-remove" @tap.stop="removePhoto(i)">
              <text>×</text>
            </view>
          </view>
          <view v-if="photos.length < MAX_PHOTOS" class="photo-add" @tap="addPhoto">
            <text class="photo-plus">＋</text>
          </view>
        </view>
      </view>

      <!-- 备注 -->
      <view class="card field">
        <view class="label-row">
          <text class="label">备注</text>
          <text class="muted-hint">（选填）</text>
        </view>
        <textarea v-model="notes" class="input-base notes" placeholder="选填，如：放在抽屉第二层" maxlength="200" />
      </view>

      <!-- 操作 -->
      <view class="actions">
        <button v-if="!isEdit" class="btn-secondary" @tap="onSubmit(true)">
          保存并继续
        </button>
        <button
          class="btn-primary submit"
          :loading="saving"
          :disabled="saving"
          form-type="submit"
        >
          {{ isEdit ? '保存修改' : '保存' }}
        </button>
      </view>

      <!-- 编辑态：删除 -->
      <button v-if="isEdit" class="btn-danger delete-btn" @tap="onDelete">
        删除物品
      </button>
    </form>

    <AppTabbar />
    <!-- 隐私授权弹窗：本页可选照片（wx.chooseMedia） -->
    <PrivacyPopup />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppTabbar from '../../components/AppTabbar.vue'
import LocationIcon from '../../components/LocationIcon.vue'
import PrivacyPopup from '../../components/PrivacyPopup.vue'
import { useAuth } from '../../composables/useAuth'
import {
  buildLocationTree, createItem, createLocation, deleteItem, getItem, updateItem,
  type LocationTreeNode,
} from '../../composables/useLocalData'
import { errMsg } from '../../utils/api'
import { MAX_PHOTOS, pickLocalPhoto, removeLocalPhotos, tagStyle } from '../../utils/local-photo'
import { useTheme } from '../../composables/useTheme'
import { useSafeArea } from '../../composables/useSafeArea'

const { themeClass } = useTheme()
const { topVars, pageStyle } = useSafeArea()

const TAG_SUGGESTIONS = ['工具', '五金', '耗材', '衣物', '证件', '户外', '玩具', '文具', '厨具', '床品', '电子', '线材']

const auth = useAuth()

const id = ref('')
const isEdit = computed(() => !!id.value)
const name = ref('')
const quantity = ref(1)
const tags = ref<string[]>([])
const tagDraft = ref('')
const notes = ref('')
const photos = ref<string[]>([])
const saving = ref(false)

// ── 三级级联空间选择（对齐 Web 端 ItemForm：房间 / 家具 / 格位） ──
const tree = ref<LocationTreeNode[]>([])
const roomId = ref('')
const furnitureId = ref('')
const compartmentId = ref('')

const selectedRoom = computed(() => tree.value.find(r => r.id === roomId.value))
const furnitureOptions = computed(() => selectedRoom.value?.children ?? [])
const selectedFurniture = computed(() => furnitureOptions.value.find(f => f.id === furnitureId.value))
const compartmentOptions = computed(() => selectedFurniture.value?.children ?? [])
const selectedCompartment = computed(() => compartmentOptions.value.find(c => c.id === compartmentId.value))
// 实际落库的空间：格位 > 家具 > 房间（对齐 Web 端）
const locationId = computed(() => compartmentId.value || furnitureId.value || roomId.value)

// 选项末尾挂"＋ 新增"（对齐 Web 端 <option value="__add">）
const roomRange = computed(() => [...tree.value.map(n => n.name), '＋ 新增房间'])
const furnitureRange = computed(() => [...furnitureOptions.value.map(n => n.name), '＋ 新增家具'])
const compartmentRange = computed(() => [...compartmentOptions.value.map(n => n.name), '＋ 新增格位'])

function onPickRoom(e: { detail: { value: number | string } }) {
  const i = Number(e.detail.value)
  if (i >= tree.value.length) {
    startAdd('room')
    return
  }
  roomId.value = tree.value[i]?.id ?? ''
  furnitureId.value = ''
  compartmentId.value = ''
}
function onPickFurniture(e: { detail: { value: number | string } }) {
  const i = Number(e.detail.value)
  if (i >= furnitureOptions.value.length) {
    startAdd('furniture')
    return
  }
  furnitureId.value = furnitureOptions.value[i]?.id ?? ''
  compartmentId.value = ''
}
function onPickCompartment(e: { detail: { value: number | string } }) {
  const i = Number(e.detail.value)
  if (i >= compartmentOptions.value.length) {
    startAdd('compartment')
    return
  }
  compartmentId.value = compartmentOptions.value[i]?.id ?? ''
}

// ---- 内联添加空间 ----
const addingLevel = ref<'room' | 'furniture' | 'compartment' | null>(null)
const newLocationName = ref('')
const creating = ref(false)
const addingLabel = computed(() =>
  ({ room: '房间', furniture: '家具', compartment: '格位' })[addingLevel.value ?? 'room'] ?? '',
)

function startAdd(level: 'room' | 'furniture' | 'compartment') {
  addingLevel.value = level
  newLocationName.value = ''
}
function cancelAdd() {
  addingLevel.value = null
  newLocationName.value = ''
}
function confirmAdd() {
  const n = newLocationName.value.trim()
  if (!n) {
    uni.showToast({ title: `请输入${addingLabel.value}名称`, icon: 'none' })
    return
  }
  const parent = addingLevel.value === 'furniture'
    ? roomId.value
    : addingLevel.value === 'compartment' ? furnitureId.value : undefined
  creating.value = true
  try {
    const newId = createLocation(n, parent)
    refreshLocations()
    if (addingLevel.value === 'room') {
      roomId.value = newId
      furnitureId.value = ''
      compartmentId.value = ''
    } else if (addingLevel.value === 'furniture') {
      furnitureId.value = newId
      compartmentId.value = ''
    } else {
      compartmentId.value = newId
    }
    addingLevel.value = null
    newLocationName.value = ''
    uni.showToast({ title: '已添加', icon: 'success' })
  } catch {
    uni.showToast({ title: '添加失败，请重试', icon: 'none' })
  } finally {
    creating.value = false
  }
}

// ---- 最近空间记忆（对齐 Web 端 useRecentLocations） ----
interface RecentLoc {
  id: string
  label: string
  roomId: string
  furnitureId?: string
  compartmentId?: string
}
const RECENT_KEY = 'wugui:recent-locations'
const recentList = ref<RecentLoc[]>([])

function loadRecent() {
  try {
    const raw = uni.getStorageSync(RECENT_KEY)
    recentList.value = raw ? JSON.parse(raw) : []
  } catch {
    recentList.value = []
  }
}
function pushRecent(r: RecentLoc) {
  recentList.value = [r, ...recentList.value.filter(x => x.id !== r.id)].slice(0, 6)
  uni.setStorageSync(RECENT_KEY, JSON.stringify(recentList.value))
}
function rememberLocation() {
  if (!selectedRoom.value) return
  const parts = [selectedRoom.value.name]
  let furnitureId_: string | undefined
  let compartmentId_: string | undefined
  if (selectedFurniture.value) {
    parts.push(selectedFurniture.value.name)
    furnitureId_ = selectedFurniture.value.id
  }
  if (selectedCompartment.value) {
    parts.push(selectedCompartment.value.name)
    compartmentId_ = selectedCompartment.value.id
  }
  pushRecent({
    id: compartmentId_ ?? furnitureId_ ?? selectedRoom.value.id,
    label: parts.join(' / '),
    roomId: selectedRoom.value.id,
    furnitureId: furnitureId_,
    compartmentId: compartmentId_,
  })
}
// 应用最近空间前校验仍存在于树中，失效则忽略（对齐 Web 端）
function applyRecent(r: RecentLoc) {
  const room = tree.value.find(x => x.id === r.roomId)
  if (!room) return
  const furniture = r.furnitureId ? room.children.find(x => x.id === r.furnitureId) : undefined
  if (r.furnitureId && !furniture) return
  const compartment = r.compartmentId ? furniture?.children.find(x => x.id === r.compartmentId) : undefined
  if (r.compartmentId && !compartment) return
  roomId.value = room.id
  furnitureId.value = furniture?.id ?? ''
  compartmentId.value = compartment?.id ?? ''
}

// ---- 空间树维护 ----
function refreshLocations() {
  tree.value = buildLocationTree()
}

// 编辑模式：按 locationId 反查整条链回填（对齐 Web 端 findChain）
function findChain(nodes: LocationTreeNode[], targetId: string, acc: LocationTreeNode[] = []): LocationTreeNode[] | null {
  for (const n of nodes) {
    const next = [...acc, n]
    if (n.id === targetId) return next
    const hit = findChain(n.children, targetId, next)
    if (hit) return hit
  }
  return null
}
function applyLocationId(locId: string) {
  const chain = findChain(tree.value, locId)
  if (chain) {
    roomId.value = chain[0]?.id ?? ''
    furnitureId.value = chain[1]?.id ?? ''
    compartmentId.value = chain[2]?.id ?? ''
  }
}

function dec() { if (quantity.value > 1) quantity.value-- }
function inc() { if (quantity.value < 999) quantity.value++ }

function addTag() {
  const parts = tagDraft.value.split(/[,，、]/).map(t => t.trim()).filter(Boolean)
  for (const t of parts) {
    if (!tags.value.includes(t)) tags.value.push(t)
  }
  tagDraft.value = ''
}
function addTagFromSuggestion(t: string) {
  if (!tags.value.includes(t)) tags.value.push(t)
}
function removeTag(t: string) {
  tags.value = tags.value.filter(x => x !== t)
}

async function addPhoto() {
  try {
    const p = await pickLocalPhoto(MAX_PHOTOS - photos.value.length)
    photos.value.push(p)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg && msg !== '已达上限') {
      uni.showToast({ title: msg || '添加照片失败', icon: 'none' })
    }
  }
}
function removePhoto(i: number) {
  const [removed] = photos.value.splice(i, 1)
  removeLocalPhotos([removed])
}
function previewPhoto(i: number) {
  uni.previewImage({ current: photos.value[i], urls: photos.value })
}

function goBack() {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/home/home' })
}

onLoad((query) => {
  if (!auth.isLogged) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  loadRecent()
  refreshLocations()
  const editId = String(query?.id ?? '')
  // 从空间详情"去录入"进入：预选空间
  const presetLocId = String(query?.locationId ?? '')
  if (presetLocId) applyLocationId(presetLocId)
  if (!editId) return
  id.value = editId
  const item = getItem(editId)
  if (!item) {
    uni.navigateBack()
    return
  }
  name.value = item.name
  quantity.value = item.quantity
  notes.value = item.notes ?? ''
  tags.value = [...item.tags]
  photos.value = [...(item.photoPaths ?? [])]
  if (item.locationId) applyLocationId(item.locationId)
})

onShow(() => {
  refreshLocations()
  // 校验已选链仍有效（空间可能被删除）
  if (roomId.value && !selectedRoom.value) {
    roomId.value = ''
    furnitureId.value = ''
    compartmentId.value = ''
  } else if (furnitureId.value && !selectedFurniture.value) {
    furnitureId.value = ''
    compartmentId.value = ''
  } else if (compartmentId.value && !selectedCompartment.value) {
    compartmentId.value = ''
  }
})

async function onSubmit(keepGoing: boolean) {
  if (!name.value.trim()) {
    uni.showToast({ title: '请填写物品名称', icon: 'none' })
    return
  }
  if (!roomId.value) {
    uni.showToast({ title: '请选择收纳空间', icon: 'none' })
    return
  }
  saving.value = true
  try {
    const payload = {
      name: name.value.trim(),
      quantity: Math.max(1, quantity.value),
      notes: notes.value.trim() || null,
      locationId: locationId.value,
      tags: tags.value.slice(0, 10),
      photoPaths: photos.value.slice(0, MAX_PHOTOS),
    }
    if (isEdit.value) updateItem(id.value, payload)
    else createItem(payload)
    if (!isEdit.value) rememberLocation()
    if (keepGoing && !isEdit.value) {
      // 连续录入：只清名称与照片，空间/标签/数量保留（对齐 Web 端）
      name.value = ''
      photos.value = []
      uni.showToast({ title: '已保存，继续录入', icon: 'success' })
    } else {
      uni.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => {
        uni.navigateBack()
      }, 400)
    }
  } catch (e) {
    uni.showToast({ title: errMsg(e) || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function onDelete() {
  uni.showModal({
    title: '删除物品',
    content: `确定删除「${name.value}」？删除后无法恢复。`,
    confirmText: '删除',
    confirmColor: '#dc2626',
    success: (res) => {
      if (!res.confirm) return
      removeLocalPhotos([...(photos.value ?? [])])
      deleteItem(id.value)
      uni.navigateBack()
    },
  })
}
</script>

<style scoped>
/*
 * 表单布局：微信端 <form> 是原生组件，flex/gap 不生效，
 * 卡片间距由各卡片自身的 margin 提供（对齐 Web 端 gap-2.5 = 10px）
 */
.field {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 20rpx;
}
.label-row {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.label {
  font-size: 24rpx;
  font-weight: 600;
  color: #8a978f;
}
.req {
  color: #dc2626;
  font-size: 24rpx;
}
.muted-hint {
  color: #aebbb2;
  font-size: 22rpx;
  font-weight: 400;
}

/* 最近空间快选（对齐 Web 端） */
.recent-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.recent-chip {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  background: #e7f4ec;
}
.recent-chip > text {
  font-size: 22rpx;
  font-weight: 500;
  color: #0f7a38;
}

/* 三级级联 */
.cascade {
  display: flex;
  gap: 12rpx;
}
.cascade-cell {
  flex: 1;
  min-width: 0;
  border: 3rpx solid #d8e1da;
  border-radius: 24rpx;
  padding: 12rpx 16rpx;
  background: #ffffff;
}
.cascade-cell.filled {
  border-color: #16a34a;
  background: #f0f8f3;
}
.cascade-cell.disabled {
  opacity: 0.5;
}
.cascade-label {
  display: block;
  font-size: 20rpx;
  color: #8a978f;
}
.cascade-pick {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  margin-top: 4rpx;
}
.cascade-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cascade-value.placeholder {
  color: #aebbb2;
  font-weight: 500;
}
.cascade-arrow {
  flex-shrink: 0;
}

/* 内联添加空间 */
.inline-add {
  display: flex;
  gap: 12rpx;
  align-items: center;
}
.add-input {
  flex: 1;
  min-width: 0;
}
.add-confirm,
.add-cancel {
  margin: 0;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  flex-shrink: 0;
  line-height: 1.4;
}

/* stepper */
.stepper-row {
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.step-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 24rpx;
  border: 3rpx solid #d8e1da;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #51605a;
  font-size: 40rpx;
  line-height: 1;
  font-weight: 600;
}
.step-btn.disabled {
  color: #aebbb2;
  opacity: 0.5;
}
.step-num {
  min-width: 60rpx;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #182720;
}

/* 照片 */
.photo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.photo-item {
  position: relative;
}
.photo-img {
  width: 152rpx;
  height: 152rpx;
  border-radius: 20rpx;
  background: #f0f2f0;
}
.photo-remove {
  position: absolute;
  right: -10rpx;
  top: -10rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  background: #182720;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  line-height: 1;
  border: 4rpx solid #ffffff;
}
.photo-add {
  width: 152rpx;
  height: 152rpx;
  border-radius: 20rpx;
  border: 3rpx dashed #d8e1da;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aebbb2;
}
.photo-plus {
  font-size: 48rpx;
  line-height: 1;
}

/* 标签 */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.tag {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}
.tag-x {
  font-size: 24rpx;
  line-height: 1;
  opacity: 0.7;
  margin-left: 4rpx;
}
.tag-input-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.tag-input-row .input-base {
  flex: 1;
  min-width: 0;
}
/* 标签"添加"按钮：与内联添加空间的按钮同尺寸（小号胶囊），
   复用 .btn-secondary 的主题视觉（背景/描边/圆角/字重），
   只覆盖紧凑 padding 与字号以对齐旁边的输入框 */
.add-btn {
  margin: 0;
  padding: 16rpx 24rpx;
  font-size: 26rpx;
  flex-shrink: 0;
  line-height: 1.4;
  min-width: 140rpx;
}
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.suggestion {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #ffffff;
  border: 1rpx solid #e4eae5;
  font-size: 22rpx;
  color: #51605a;
}
.suggestion.used {
  opacity: 0.4;
}

/* 备注 */
.notes {
  height: 180rpx;
  min-height: 180rpx;
  padding-top: 20rpx;
  padding-bottom: 20rpx;
  line-height: 1.5;
}

/* 操作 */
.actions {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}
.actions .btn-primary,
.actions .btn-secondary {
  flex: 1;
  padding: 26rpx 24rpx;
  font-size: 32rpx;
}
.submit {
  flex: 1.4;
}
.delete-btn {
  margin-top: 16rpx;
  padding: 24rpx;
  font-size: 30rpx;
}
</style>
