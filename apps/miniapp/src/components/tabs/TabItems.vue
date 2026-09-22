<template>
  <view class="tab-root">
    <!-- 页头：大标题 + 住所/计数副行（无头像，对齐 Web 端） -->
    <view class="head">
      <text class="head-title">物品</text>
      <text class="head-sub">{{ householdName ? householdName + ' · ' : '' }}共 {{ items.length }} 件</text>
    </view>

    <!-- 搜索：名称 / 备注 / 标签 -->
    <view class="search-box">
      <LocationIcon slug="search" :size="32" state="muted" class="search-icon" />
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索名称、备注或标签"
        confirm-type="search"
      />
      <text v-if="keyword" class="search-clear" @tap="keyword = ''">×</text>
    </view>

    <!-- 空间筛选：房间/家具/格子 级联（上级变更下级自动重置） -->
    <view class="loc-filters">
      <picker
        v-for="lvl in locationLevels"
        :key="lvl.key"
        mode="selector"
        :range="lvl.range"
        :disabled="lvl.disabled"
        @change="(e: any) => onPickLevel(lvl.key, e)"
      >
        <view class="loc-pill" :class="{ disabled: lvl.disabled }">
          <text class="loc-pill-label">{{ lvl.label }}：</text>
          <text class="loc-pill-value">{{ lvl.valueLabel }}</text>
          <LocationIcon slug="chevron-down" :size="22" state="muted" class="loc-pill-arrow" />
        </view>
      </picker>
    </view>

    <!-- 标签筛选：单选可取消，"全部"复位 -->
    <scroll-view v-if="tagOptions.length" scroll-x class="tag-scroll" :show-scrollbar="false">
      <view class="tag-row">
        <view class="tag-chip" :class="{ on: !activeTag }" @tap="activeTag = ''">
          <text>全部</text>
        </view>
        <view
          v-for="t in tagOptions"
          :key="t"
          class="tag-chip"
          :class="{ on: activeTag === t }"
          @tap="activeTag = activeTag === t ? '' : t"
        >
          <text>{{ t }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 物品网格：2 列卡 -->
    <view class="section">
      <!-- 注意：不要在 section-title 上挂 @tap.self="exitSelectMode"。
           uni-app 编译到微信小程序时 .self 修饰符失效成 bindtap，
           导致点"多选"按钮时事件冒泡到 section-title 触发 exitSelectMode，
           抵消了刚设置的 selectMode=true，看起来"点击无反应"。
           多选模式只能通过"取消"按钮、底部 sel-bar 的"取消"按钮退出。 -->
      <view class="section-title">
        <view class="section-title-left">
          <text class="dot"></text>
          <text>全部物品</text>
        </view>
        <!-- 多选模式：左边"取消"（退出模式），右边"全选/取消全选" -->
        <template v-if="selectMode">
          <view class="section-title-aux section-title-aux-cancel" @tap="exitSelectMode">
            <text>取消</text>
          </view>
          <view class="section-title-aux section-title-aux-select" @tap="toggleSelectAll">
            <text>{{ allSelected ? '取消全选' : '全选' }}</text>
          </view>
        </template>
        <view v-else class="select-entry" @tap="enterSelectMode">
          <text>多选</text>
        </view>
      </view>

      <view v-if="!filtered.length" class="card empty-card">
        <LocationIcon slug="package" :size="56" state="muted" />
        <text class="empty-text">{{ hasFilter ? '没有匹配的物品' : '还没有物品' }}</text>
        <text v-if="hasFilter" class="empty-link" @tap="clearFilters">清除筛选</text>
        <text v-else class="empty-link" @tap="goAdd">去录入第一件</text>
      </view>

      <!-- 注意：不要在 grid-2 上挂 @tap.self="exitSelectMode"。
           uni-app 编译到微信小程序时 .self 修饰符会失效成普通 bindtap，
           点击 item-card 会冒泡到 grid-2 触发 exitSelectMode，导致"打勾同时退出多选"。
           取消多选只能通过 section-title 的"取消"按钮、底部 sel-bar 的"取消"按钮。 -->
      <view class="grid-2">
        <view
          v-for="it in filtered"
          :key="it.id"
          class="item-card"
          :class="{ 'item-card-selected': selected.has(it.id) }"
          @tap="onCardTap(it.id)"
          @longpress="onCardLongPress(it.id)"
        >
          <view class="item-photo-wrap">
            <image v-if="it.photoPaths[0]" :src="it.photoPaths[0]" mode="aspectFill" class="item-photo" />
            <view v-else class="item-photo item-photo-empty">
              <LocationIcon slug="package" :size="52" class="item-ph-icon" />
            </view>
            <!-- 多选模式下给图片区加深色蒙版，让白色圆圈在照片上也清晰可辨 -->
            <view v-if="selectMode" class="sel-overlay"></view>
            <!-- 勾选圆圈：位于图片右上角，仅多选模式显示 -->
            <view v-if="selectMode" class="sel-check" :class="{ on: selected.has(it.id) }">
              <LocationIcon v-if="selected.has(it.id)" slug="check" :size="24" state="white" />
            </view>
          </view>
          <view class="item-body">
            <view class="item-name truncate">{{ it.name }}</view>
            <view class="item-path truncate">{{ shortPath(it) }}</view>
            <TagRow v-if="it.tags.length" :tags="it.tags" />
          </view>
        </view>
      </view>

      <text v-if="filtered.length" class="list-end">· 到底了 ·</text>
    </view>

    <!-- 多选操作条：进入多选模式后固定底部 -->
    <view v-if="selectMode" class="sel-bar">
      <view class="sel-bar-count">
        <text>已选 {{ selected.size }} 件</text>
      </view>
      <view class="sel-bar-actions">
        <view class="btn-secondary sel-bar-cancel" @tap="exitSelectMode">
          <text>取消</text>
        </view>
        <view
          class="btn-danger sel-bar-del"
          :class="{ 'btn-disabled': selected.size === 0 }"
          @tap="confirmDeleteSelected"
        >
          <text>删除</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LocationIcon from '../LocationIcon.vue'
import TagRow from '../TagRow.vue'
import {
  buildLocationTree, deleteItem, getLocationPath, useStore,
  type LocalItem, type LocationTreeNode,
} from '../../composables/useLocalData'
import { useHouseholds } from '../../composables/useHouseholds'
import { useHomeTabs } from '../../composables/useHomeTabs'

const store = useStore()
const items = ref<LocalItem[]>([])
const tree = ref<LocationTreeNode[]>([])

// ---- 筛选状态 ----
const keyword = ref('')
const activeTag = ref('')
const selRoomId = ref('')
const selFurnitureId = ref('')
const selCompartmentId = ref('')

function refresh() {
  items.value = store.items()
  tree.value = buildLocationTree()
  // 首页空间看板跳转过来：按该空间（含下属层级）过滤
  if (pendingItemRoom.value) {
    selRoomId.value = pendingItemRoom.value
    selFurnitureId.value = ''
    selCompartmentId.value = ''
    pendingItemRoom.value = ''
  }
  // 级联选中失效校验（空间可能被删除）
  if (selRoomId.value && !tree.value.some(r => r.id === selRoomId.value)) {
    selRoomId.value = ''
    selFurnitureId.value = ''
    selCompartmentId.value = ''
  } else if (selFurnitureId.value && !furnitureOptions.value.some(f => f.id === selFurnitureId.value)) {
    selFurnitureId.value = ''
    selCompartmentId.value = ''
  } else if (selCompartmentId.value && !compartmentOptions.value.some(c => c.id === selCompartmentId.value)) {
    selCompartmentId.value = ''
  }
}

// ---- 空间级联筛选 ----
const { pendingItemRoom } = useHomeTabs()
const { householdName } = useHouseholds()
const selRoom = computed(() => tree.value.find(r => r.id === selRoomId.value))
const furnitureOptions = computed(() => selRoom.value?.children ?? [])
const selFurniture = computed(() => furnitureOptions.value.find(f => f.id === selFurnitureId.value))
const compartmentOptions = computed(() => selFurniture.value?.children ?? [])

const locationLevels = computed(() => ([
  { key: 'room', label: '房间', options: tree.value, selId: selRoomId.value, disabled: false },
  { key: 'furniture', label: '家具', options: furnitureOptions.value, selId: selFurnitureId.value, disabled: !selRoom.value },
  { key: 'compartment', label: '格子', options: compartmentOptions.value, selId: selCompartmentId.value, disabled: !selFurniture.value },
]).map(l => ({
  key: l.key,
  label: l.label,
  disabled: l.disabled,
  range: ['全部', ...l.options.map(o => o.name)],
  valueLabel: l.options.find(o => o.id === l.selId)?.name ?? '全部',
})))

function onPickLevel(key: string, e: { detail: { value: number | string } }) {
  const i = Number(e.detail.value)
  if (key === 'room') {
    selRoomId.value = i === 0 ? '' : tree.value[i - 1]?.id ?? ''
    selFurnitureId.value = ''
    selCompartmentId.value = ''
  } else if (key === 'furniture') {
    selFurnitureId.value = i === 0 ? '' : furnitureOptions.value[i - 1]?.id ?? ''
    selCompartmentId.value = ''
  } else {
    selCompartmentId.value = i === 0 ? '' : compartmentOptions.value[i - 1]?.id ?? ''
  }
}

// 当前生效的筛选空间：格子 > 家具 > 房间
const filterLocId = computed(() => selCompartmentId.value || selFurnitureId.value || selRoomId.value)

function inSubtree(locationId: string): boolean {
  if (!filterLocId.value) return true
  const find = (nodes: LocationTreeNode[]): LocationTreeNode | null => {
    for (const n of nodes) {
      if (n.id === filterLocId.value) return n
      const hit = find(n.children)
      if (hit) return hit
    }
    return null
  }
  const node = find(tree.value)
  if (!node) return true
  let hit = false
  const walk = (n: LocationTreeNode) => {
    if (n.id === locationId) hit = true
    n.children.forEach(walk)
  }
  walk(node)
  return hit
}

// ---- 标签候选：按出现次数排序取前 10 ----
const tagOptions = computed(() => {
  const count = new Map<string, number>()
  for (const it of items.value) {
    for (const t of it.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1)
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t)
})

// ---- 过滤结果：按添加时间倒序（对齐 Web 端"按添加时间"） ----
const filtered = computed<LocalItem[]>(() => {
  let list = [...items.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(it =>
      it.name.toLowerCase().includes(kw)
      || (it.notes ?? '').toLowerCase().includes(kw)
      || (it.tags ?? []).some(t => t.toLowerCase().includes(kw)),
    )
  }
  if (filterLocId.value) list = list.filter(it => inSubtree(it.locationId))
  if (activeTag.value) list = list.filter(it => (it.tags ?? []).includes(activeTag.value))
  return list
})

const hasFilter = computed(() => Boolean(keyword.value.trim() || filterLocId.value || activeTag.value))

function clearFilters() {
  keyword.value = ''
  activeTag.value = ''
  selRoomId.value = ''
  selFurnitureId.value = ''
  selCompartmentId.value = ''
}

// ---- 多选删除 ----
const selectMode = ref(false)
// 用 ref 包 Set 保证模板对 .size / .has 的响应式更新
const selected = ref(new Set<string>())

function enterSelectMode() {
  selectMode.value = true
  selected.value = new Set()
}
function exitSelectMode() {
  selectMode.value = false
  selected.value = new Set()
}
function toggleSelect(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
function onCardTap(id: string) {
  if (selectMode.value) toggleSelect(id)
  else goDetail(id)
}
/** 长按进入多选模式并直接勾选该卡（对齐 Web 端长按/右键交互） */
function onCardLongPress(id: string) {
  if (!selectMode.value) {
    selectMode.value = true
    selected.value = new Set()
  }
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
const allSelected = computed(() => filtered.value.length > 0 && filtered.value.every(it => selected.value.has(it.id)))
function toggleSelectAll() {
  if (allSelected.value) selected.value = new Set()
  else selected.value = new Set(filtered.value.map(it => it.id))
}
function confirmDeleteSelected() {
  const ids = [...selected.value]
  if (!ids.length) return
  uni.showModal({
    title: '批量删除',
    content: `确定删除 ${ids.length} 件物品？删除后不可恢复。`,
    confirmText: '删除',
    confirmColor: '#dc2626',
    success: (res) => {
      if (!res.confirm) return
      for (const id of ids) deleteItem(id)
      selected.value = new Set()
      selectMode.value = false
      refresh()
      uni.showToast({ title: `已删除 ${ids.length} 件`, icon: 'success' })
    },
  })
}

// 位置路径显示前两段（房间 · 格位），对齐 Web 端 ItemThumbCard
function shortPath(it: LocalItem): string {
  if (!it.locationId) return '未放置'
  const segs = getLocationPath(it.locationId).split('/').map(s => s.trim()).filter(Boolean)
  return segs.slice(0, 2).join(' · ') || '未放置'
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/item-detail/item-detail?id=${id}` })
}
function goAdd() {
  uni.navigateTo({ url: '/pages/item-edit/item-edit' })
}

onMounted(refresh)

defineExpose({ refresh })
</script>

<style scoped>
.tab-root {
  padding-top: 0;
}

/* 页头：占满导航带高度，与右上角胶囊垂直居中 */
.head {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6rpx;
  min-height: var(--nav-bar-height, 88rpx);
  padding: 8rpx 4rpx;
}
.head-title {
  font-family: var(--font-display);
  font-size: 40rpx;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 2rpx;
}
.head-sub {
  font-size: 24rpx;
  color: #8a978f;
  min-height: 34rpx;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: var(--color-surface, #ffffff);
  border: 1rpx solid #e4eae5;
  border-radius: 28rpx;
  padding: 0 24rpx;
  height: 88rpx;
  box-shadow: 0 2rpx 4rpx rgba(24, 39, 32, 0.04), 0 16rpx 48rpx rgba(24, 39, 32, 0.05);
}
.search-icon {
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  color: #182720;
}
.search-clear {
  font-size: 36rpx;
  line-height: 1;
  color: #8a978f;
  padding: 8rpx;
  flex-shrink: 0;
}

/* 空间筛选 pill：三列级联 */
.loc-filters {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.loc-filters > picker {
  flex: 1;
  min-width: 0;
}
.loc-pill {
  display: flex;
  align-items: center;
  gap: 4rpx;
  height: 72rpx;
  padding: 0 16rpx;
  background: var(--color-surface, #ffffff);
  border: 1rpx solid #e4eae5;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(24, 39, 32, 0.04);
  min-width: 0;
}
.loc-pill.disabled {
  opacity: 0.5;
}
.loc-pill-label {
  font-size: 22rpx;
  color: #51605a;
  flex-shrink: 0;
}
.loc-pill-value {
  flex: 1;
  min-width: 0;
  font-size: 22rpx;
  font-weight: 600;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.loc-pill-arrow {
  flex-shrink: 0;
}

/* 标签筛选：横滑 chips */
.tag-scroll {
  margin-top: 16rpx;
  white-space: nowrap;
}
.tag-row {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  height: 60rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  border: 1rpx solid #d8e1da;
  background: #ffffff;
  flex-shrink: 0;
}
.tag-chip > text {
  font-size: 24rpx;
  font-weight: 500;
  color: #51605a;
}
.tag-chip.on {
  border-color: transparent;
  background: #e7f4ec;
}
.tag-chip.on > text {
  font-weight: 600;
  color: #0f7a38;
}

/* 列表区 */
.section {
  margin-top: 28rpx;
}

/* 空态 */
.empty-card {
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #51605a;
}
.empty-link {
  font-size: 28rpx;
  font-weight: 600;
  color: #16a34a;
  padding: 8rpx 16rpx;
}

/* 物品网格：2 列缩略卡（对齐 Web 端 ItemThumbCard） */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  margin-top: 20rpx;
}
.item-card {
  background: #ffffff;
  border: 1rpx solid #e4eae5;
  border-radius: 36rpx;
  box-shadow: 0 2rpx 4rpx rgba(24, 39, 32, 0.04), 0 16rpx 48rpx rgba(24, 39, 32, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.item-photo-wrap {
  position: relative;
  width: 100%;
  height: 116rpx;
  overflow: hidden;
}
.item-photo {
  width: 100%;
  height: 100%;
  background: #f0f2f0;
}
.item-photo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e7f4ec, #d3efdd);
}
.item-ph-icon {
  opacity: 0.6;
}
/* 多选模式下给图片区一层半透明黑罩，让白色勾选圈更醒目 */
.sel-overlay {
  position: absolute;
  inset: 0;
  background: rgba(24, 39, 32, 0.18);
  pointer-events: none;
}
.item-body {
  padding: 16rpx 24rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6rpx;
}
.item-name {
  width: 100%;
  box-sizing: border-box;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-text);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-path {
  width: 100%;
  box-sizing: border-box;
  font-size: 22rpx;
  line-height: 1.4;
  color: #8a978f;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 多选模式 */
.item-card {
  position: relative;
}
.item-card-selected {
  border-color: #16a34a;
  box-shadow: 0 2rpx 4rpx rgba(24, 39, 32, 0.04), 0 0 0 3rpx rgba(22, 163, 74, 0.18);
}
/* 勾选圆圈：右上角白圈，选中变绿。加大尺寸与对比度，确保在照片上也清晰可见 */
.sel-check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  border: 3rpx solid #ffffff;
  background: rgba(255, 255, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.35);
}
.sel-check.on {
  background: #16a34a;
  border-color: #16a34a;
  box-shadow: 0 2rpx 8rpx rgba(22, 163, 74, 0.6);
}
.section-title-aux-select {
  color: #16a34a;
  font-weight: 600;
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: #e7f4ec;
}
.section-title-aux-cancel {
  color: #51605a;
  font-weight: 600;
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
}
/* 右上角"多选"入口：view 元素才能渲染背景/圆角/padding（text 在微信小程序里只渲染文字样式） */
.select-entry {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 28rpx;
  background: #16a34a;
  color: #ffffff;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.4;
}
.select-entry:active {
  background: #0f7a38;
}
.sel-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1rpx solid #e4eae5;
  box-shadow: 0 -4rpx 16rpx rgba(24, 39, 32, 0.06);
  z-index: 50;
}
.sel-bar-count {
  font-size: 26rpx;
  color: #182720;
}
.sel-bar-actions {
  display: flex;
  gap: 16rpx;
}
.sel-bar-cancel,
.sel-bar-del {
  padding: 16rpx 36rpx;
  font-size: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  line-height: 1.4;
}
.sel-bar-del.btn-disabled {
  opacity: 0.4;
}

/* 页脚 */
.list-end {
  display: block;
  padding: 24rpx 0 8rpx;
  text-align: center;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: #aebbb2;
}
</style>
