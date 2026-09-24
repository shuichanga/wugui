<template>
  <view class="tab-root">
    <!-- 页头：大标题居左（与"物品/空间"页头一致），关于为标题旁小链接 -->
    <view class="head">
      <text class="head-title">我的</text>
      <text class="head-link" @tap="goAbout">关于</text>
    </view>

    <!-- 当前用户卡：头像可上传/移除（对齐 Web 端 settings 用户区）；昵称可点击改名 -->
    <view class="card user-card">
      <view class="avatar-wrap" @tap="onAvatarPick">
        <view class="avatar" :class="{ 'avatar-photo': avatarPath }">
          <image v-if="avatarPath" :src="avatarPath" mode="aspectFill" class="avatar-img" />
          <text v-else>{{ initial }}</text>
        </view>
        <view class="avatar-cam">
          <LocationIcon slug="camera" :size="24" state="white" />
        </view>
      </view>
      <view class="user-info">
        <view class="name-row">
          <text v-if="!editingName" class="user-name" @tap="startEditName">{{ displayName }}</text>
          <input
            v-else
            v-model="nameDraft"
            class="name-input"
            :focus="editingName"
            maxlength="20"
            placeholder="请输入昵称"
            @confirm="submitName"
          />
          <template v-if="editingName">
            <text class="name-save" @tap="submitName">保存</text>
            <text class="name-cancel" @tap="cancelEditName">取消</text>
          </template>
        </view>
        <text class="user-email">{{ accountLabel }}</text>
      </view>
      <view v-if="avatarPath" class="avatar-remove" @tap.stop="onAvatarRemove">
        <text>移除头像</text>
      </view>
    </view>

    <!-- 我的住所：对齐 Web 端 settings 住所管理 -->
    <view class="section">
      <view class="sec-head">
        <text class="sec-title">我的住所</text>
        <text class="sec-aux">{{ households.length }} 个</text>
      </view>

      <view v-if="!households.length" class="card empty-household">
        <text>你还没有加入任何住所：创建一个自己的住所，或输入家人分享给你的邀请码加入。</text>
      </view>

      <view v-else class="household-list">
        <view v-for="h in households" :key="h.id" class="card household-card">
          <view class="household-row">
            <view class="household-name-wrap">
              <text class="household-name">{{ h.name }}</text>
              <text v-if="h.id === currentHouseholdId" class="badge badge-current">当前</text>
              <text v-else-if="h.role === 'owner'" class="badge badge-owner">我创建的</text>
            </view>
            <view
              v-if="h.id !== currentHouseholdId"
              class="switch-btn"
              @tap="onSwitch(h.id)"
            >
              <text>切换</text>
            </view>
          </view>

          <!-- 邀请码行 -->
          <view v-if="h.role === 'owner' && h.inviteCode" class="invite-row" @tap="copyCode(h.inviteCode)">
            <text class="invite-label">邀请码</text>
            <text class="invite-code">{{ h.inviteCode }}</text>
            <text class="invite-copy">复制</text>
          </view>

          <!-- 住所管理链接行 -->
          <view class="manage-row">
            <template v-if="h.role === 'owner'">
              <text class="manage-link" @tap="toggleMembers(h.id)">{{ expandedId === h.id ? '收起成员' : '管理成员' }}</text>
              <text class="manage-sep">·</text>
              <text class="manage-link" @tap="startRename(h)">改名</text>
              <text class="manage-sep">·</text>
              <text class="manage-link" @tap="onResetInvite(h)">重置邀请码</text>
            </template>
            <text v-else class="manage-link manage-link-danger" @tap="leaveHousehold(h)">退出该住所</text>
          </view>

          <!-- 改名表单 -->
          <view v-if="renamingId === h.id" class="rename-row">
            <input
              v-model="renameDraft"
              class="input-base rename-input"
              maxlength="20"
              placeholder="新名称"
            />
            <view class="btn-primary rename-save" @tap="submitRename(h)"><text>保存</text></view>
            <view class="btn-secondary rename-cancel" @tap="renamingId = ''"><text>取消</text></view>
          </view>

          <!-- 成员列表 -->
          <view v-if="expandedId === h.id" class="member-list">
            <view v-if="membersPending" class="member-loading">加载中…</view>
            <view v-for="m in members" :key="m.userId" class="member-row">
              <text class="member-name">
                {{ m.displayName ?? m.username ?? '成员' }}
                <text class="member-role">（{{ m.role === 'owner' ? '创建者' : '成员' }}）</text>
              </text>
              <text
                v-if="m.role === 'member'"
                class="member-kick"
                @tap="kickMember(h, m)"
              >移除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 创建 / 加入 -->
      <view class="create-join">
        <view class="btn-secondary cj-btn" @tap="showCreate = !showCreate"><text>创建住所</text></view>
        <view class="btn-secondary cj-btn" @tap="showJoin = !showJoin"><text>加入住所</text></view>
      </view>

      <view v-if="showCreate" class="rename-row">
        <input
          v-model="createName"
          class="input-base rename-input"
          placeholder="新住所名称"
          maxlength="20"
        />
        <view class="btn-primary rename-save" @tap="createHousehold"><text>创建</text></view>
      </view>

      <view v-if="showJoin" class="rename-row">
        <input
          v-model="joinCode"
          class="input-base rename-input"
          placeholder="输入 6 位邀请码"
          maxlength="6"
        />
        <view class="btn-primary rename-save" @tap="joinHousehold"><text>加入</text></view>
      </view>
    </view>

    <!-- 外观偏好：对齐 Web 端（行卡 rounded-lg，信息左 + 控件右） -->
    <view class="section">
      <text class="sec-title">外观偏好</text>

      <!-- 看板背景 -->
      <view class="pref-card">
        <view class="pref-info">
          <text class="pref-name">空间看板背景</text>
          <text class="pref-sub">房间卡的配色风格</text>
        </view>
        <view class="pref-toggle">
          <view
            class="toggle-item"
            :class="{ on: boardStyle === 'clean' }"
            @tap="setBoardStyle('clean')"
          ><text>简洁</text></view>
          <view
            class="toggle-item"
            :class="{ on: boardStyle === 'colorful' }"
            @tap="setBoardStyle('colorful')"
          ><text>彩色</text></view>
        </view>
      </view>

      <!-- 主题配色 -->
      <view class="pref-card pref-card-col">
        <view class="pref-info">
          <text class="pref-name">主题配色</text>
          <text class="pref-sub">整体界面的配色方案</text>
        </view>
        <view class="theme-grid">
          <view
            v-for="t in THEMES"
            :key="t.id"
            class="theme-cell"
            :class="{ on: theme === t.id }"
            @tap="setTheme(t.id)"
          >
            <view class="theme-swatches" :style="{ background: t.bg }">
              <view class="swatch" :style="{ background: t.primary }"></view>
              <view class="swatch" :style="{ background: t.tint }"></view>
              <view class="swatch" :style="{ background: t.signal }"></view>
            </view>
            <view class="theme-label-wrap">
              <view class="theme-check" :class="{ on: theme === t.id }">
                <text v-if="theme === t.id">✓</text>
              </view>
              <text class="theme-label">{{ t.label }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 云同步与会员：状态展示 + 手动同步 + 会员页入口 -->
    <view class="section">
      <text class="sec-title">云同步与会员</text>
      <view class="card list-card">
        <view class="list-row" @tap="goMembership">
          <view class="row-icon-tile row-icon-green">
            <LocationIcon slug="star" :size="36" />
          </view>
          <view class="row-body">
            <text class="row-title">{{ membership.canCloudSync ? '云同步已开启' : '云同步未开启' }}</text>
            <text class="row-sub">{{ membership.canCloudSync ? (membership.state.value.cloudSyncSource === 'self' ? '会员生效中，数据多端同步' : '家庭共享生效中，数据多端同步') : '开通会员后多设备同步' }}</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
        <view class="list-row list-row-border" @tap="manualSync">
          <view class="row-icon-tile row-icon-blue">
            <LocationIcon slug="refresh" :size="36" state="blue" />
          </view>
          <view class="row-body">
            <text class="row-title">{{ syncState.status === 'syncing' ? '同步中…' : '立即同步' }}</text>
            <text class="row-sub">{{ syncState.lastSyncAt ? `上次同步 ${formatSyncTime(syncState.lastSyncAt)}` : '尚未同步过' }}</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 数据备份 -->
    <view class="section">
      <text class="sec-title">数据备份</text>
      <view class="card list-card">
        <view class="list-row" @tap="exportJson">
          <view class="row-icon-tile row-icon-green">
            <LocationIcon slug="code2" :size="36" />
          </view>
          <view class="row-body">
            <text class="row-title">导出 JSON 备份</text>
            <text class="row-sub">完整数据，用于迁移或恢复</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
        <view class="list-row list-row-border" @tap="exportCsv">
          <view class="row-icon-tile row-icon-blue">
            <LocationIcon slug="table" :size="36" state="blue" />
          </view>
          <view class="row-body">
            <text class="row-title">导出 CSV 表格</text>
            <text class="row-sub">适合在表格软件中查看</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
        <view class="list-row list-row-border" @tap="importJson">
          <view class="row-icon-tile row-icon-green">
            <LocationIcon slug="upload" :size="36" />
          </view>
          <view class="row-body">
            <text class="row-title">导入 JSON 备份</text>
            <text class="row-sub">从聊天记录选择备份文件，合并导入</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <button class="btn-danger logout-btn" @tap="onLogout">退出登录</button>

    <!-- 底部版本号 -->
    <text class="version-text">物归 v{{ version }} · 开源项目</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import LocationIcon from '../LocationIcon.vue'
import { useAuth } from '../../composables/useAuth'
import {
  buildLocationTree, createItem, createLocation, getLocationPath, useStore,
  migrateAnonToHousehold,
  type LocationTreeNode,
} from '../../composables/useLocalData'
import { useTheme, THEMES } from '../../composables/useTheme'
import { useHomeTabs } from '../../composables/useHomeTabs'
import { useAvatar } from '../../composables/useAvatar'
import { useHouseholds, genInviteCode, type Household } from '../../composables/useHouseholds'
import { api, errMsg } from '../../utils/api'
import { syncAfterHouseholdChange, syncNow, syncState } from '../../composables/useSync'
import { useMembership } from '../../composables/useMembership'
import { pickLocalPhoto } from '../../utils/local-photo'

const { theme, setTheme, boardStyle, setBoardStyle } = useTheme()
const { switchTab } = useHomeTabs()
const { avatarPath, uploadAvatar, removeAvatar } = useAvatar()
const auth = useAuth()
const store = useStore()
const membership = useMembership()
// 版本号：构建时从 apps/miniapp/package.json 的 version 注入（vite define），发布只改那一处
const version = __APP_VERSION__

// ---- 云同步与会员 ----
function goMembership() {
  uni.navigateTo({ url: '/pages/membership/membership' })
}

async function manualSync() {
  if (syncState.value.status === 'syncing') return
  const ok = await syncNow()
  uni.showToast({ title: ok ? '同步完成' : (membership.canCloudSync ? '同步失败，请检查网络' : '开通会员后可用云同步'), icon: 'none' })
}

function formatSyncTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const initial = computed(() => (auth.state.user?.displayName ?? '物').slice(0, 1))
const displayName = computed(() => auth.state.user?.displayName ?? '微信用户')
const accountLabel = computed(() => {
  const u = auth.state.user
  if (u?.username) return `账号：${u.username}`
  return '微信登录'
})

// ---- 修改昵称 ----
const editingName = ref(false)
const nameDraft = ref('')

function startEditName() {
  nameDraft.value = auth.state.user?.displayName ?? ''
  editingName.value = true
}

function cancelEditName() {
  editingName.value = false
  nameDraft.value = ''
}

async function submitName() {
  const v = (nameDraft.value ?? '').trim()
  if (!v) {
    uni.showToast({ title: '昵称不能为空', icon: 'none' })
    return
  }
  editingName.value = false
  nameDraft.value = ''
  const ok = await auth.setDisplayName(v)
  if (!ok) {
    nameDraft.value = v
    editingName.value = true
    return
  }
  uni.showToast({ title: '昵称已更新', icon: 'success' })
}

// ---- 住所管理（useHouseholds：与首页切换下拉共用同一份本地数据源） ----
// 注意：genInviteCode 是从 useHouseholds.ts 的模块顶层 import 的，不是 useHouseholds() 返回的字段
// 之前在解构里也写了一次 genInviteCode，会被 undefined 覆盖导致"无法创建住所"（undefined is not a function）
const {
  households, currentHouseholdId, currentHousehold, switchTo, upsert,
  rename, resetInvite, remove, reload,
} = useHouseholds()

/** 手动切换住所后回首页（数据上下文已随住所切换） */
function onSwitch(id: string) {
  if (switchTo(id)) switchTab('home')
}

// ---- 成员管理（本地模拟） ----
const expandedId = ref('')
const members = ref<{ userId: string; role: string; username: string | null; displayName: string | null }[]>([])
const membersPending = ref(false)

function toggleMembers(id: string) {
  if (expandedId.value === id) {
    expandedId.value = ''
    return
  }
  expandedId.value = id
  membersPending.value = true
  // 本地模式：模拟一个 owner 成员
  setTimeout(() => {
    members.value = [{
      userId: auth.state.user?.id ?? 'me',
      role: 'owner',
      username: auth.state.user?.username ?? null,
      displayName: auth.state.user?.displayName ?? null,
    }]
    membersPending.value = false
  }, 200)
}

function kickMember(h: Household, m: { userId: string; displayName?: string | null }) {
  uni.showModal({
    title: '移除成员',
    content: `确定移除 ${m.displayName ?? '该成员'}？`,
    confirmColor: '#dc2626',
    success: (res) => {
      if (!res.confirm) return
      members.value = members.value.filter(x => x.userId !== m.userId)
      uni.showToast({ title: '已移除', icon: 'success' })
    },
  })
}

function leaveHousehold(h: Household) {
  uni.showModal({
    title: '退出住所',
    content: `确定退出「${h.name}」？`,
    confirmColor: '#dc2626',
    success: (res) => {
      if (!res.confirm) return
      remove(h.id)
      uni.showToast({ title: '已退出', icon: 'success' })
    },
  })
}

// ---- 改名 ----
const renamingId = ref('')
const renameDraft = ref('')

function startRename(h: Household) {
  renamingId.value = h.id
  renameDraft.value = h.name
}

function submitRename(h: Household) {
  const name = (renameDraft.value || '').trim()
  if (!name) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  rename(h.id, name.slice(0, 20))
  renamingId.value = ''
  uni.showToast({ title: '已改名', icon: 'success' })
}

function onResetInvite(h: Household) {
  uni.showModal({
    title: '重置邀请码',
    content: '重置后旧邀请码将失效',
    success: (res) => {
      if (!res.confirm) return
      resetInvite(h.id)
      uni.showToast({ title: '邀请码已重置', icon: 'success' })
    },
  })
}

// ---- 创建 / 加入 ----
const showCreate = ref(false)
const createName = ref('')
const showJoin = ref(false)
const joinCode = ref('')
const creating = ref(false)

function createHousehold() {
  const name = (createName.value || '').trim()
  if (!name) {
    uni.showToast({ title: '请输入住所名称', icon: 'none' })
    return
  }
  // M2：登录用户走服务端建住所（拿到服务端 id + 重签 token，可云同步）；未登录保持本地模式
  if (auth.isLogged) {
    creating.value = true
    api.post<{ id: string; name: string; role: string; token: string }>('/households', { name })
      .then(async res => {
        auth.state.token = res.token
        upsert({ id: res.id, name: res.name, role: 'owner', inviteCode: genInviteCode() })
        const migrated = migrateAnonToHousehold(res.id)
        showCreate.value = false
        createName.value = ''
        uni.showToast({ title: migrated ? `已创建，归入 ${migrated} 条暂存数据` : '已创建', icon: 'none' })
        await syncAfterHouseholdChange()
      })
      .catch(e => {
        uni.showToast({ title: errMsg(e) || '创建失败，请重试', icon: 'none' })
      })
      .finally(() => {
        creating.value = false
      })
    return
  }

  const newId = 'local-' + Date.now()
  upsert({
    id: newId,
    name: name.slice(0, 20),
    role: 'owner',
    inviteCode: genInviteCode(),
  })
  // 迁移：把用户在此前（无住所态）提前录入的房间 / 物品 / 最近查看合并到新住所下，
  // 避免"先建房间后建住所"造成的孤立数据。
  const migrated = migrateAnonToHousehold(newId)
  showCreate.value = false
  createName.value = ''
  uni.showToast({ title: migrated ? `已创建，归入 ${migrated} 条暂存数据` : '已创建', icon: 'none' })
}

function joinHousehold() {
  const code = (joinCode.value || '').trim().toUpperCase()
  if (code.length !== 6) {
    uni.showToast({ title: '请输入 6 位邀请码', icon: 'none' })
    return
  }
  // M2：登录用户走服务端加入（服务端 id + 重签 token）；未登录保持本地模拟
  if (auth.isLogged) {
    creating.value = true
    api.post<{ ok: boolean; householdId: string; name: string; token: string }>('/households/join', { inviteCode: code })
      .then(async res => {
        auth.state.token = res.token
        upsert({ id: res.householdId, name: res.name, role: 'member', inviteCode: code })
        const migrated = migrateAnonToHousehold(res.householdId)
        showJoin.value = false
        joinCode.value = ''
        uni.showToast({ title: migrated ? `已加入，归入 ${migrated} 条暂存数据` : '已加入', icon: 'none' })
        await syncAfterHouseholdChange()
      })
      .catch(e => {
        uni.showToast({ title: errMsg(e) || '加入失败，请检查邀请码', icon: 'none' })
      })
      .finally(() => {
        creating.value = false
      })
    return
  }

  // 本地模式：模拟加入
  const newId = 'joined-' + Date.now()
  upsert({
    id: newId,
    name: `邀请码 ${code}`,
    role: 'member',
    inviteCode: code,
  })
  const migrated = migrateAnonToHousehold(newId)
  showJoin.value = false
  joinCode.value = ''
  uni.showToast({ title: migrated ? `已加入，归入 ${migrated} 条暂存数据` : '已加入', icon: 'none' })
}

function copyCode(code: string) {
  uni.setClipboardData({
    data: code,
    success: () => uni.showToast({ title: '邀请码已复制', icon: 'success' }),
    // 写剪贴板是隐私接口：被隐私授权拦截或系统拒绝时走 fail，必须给提示
    fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' }),
  })
}

// ---- 数据备份（导出格式对齐 Web 端 /api/export 契约，双端备份文件互通） ----
interface ExportItem {
  name: string
  quantity: number
  notes: string | null
  tags: string[]
  locationPath: string
  ownerName: string
  createdAt: string
  updatedAt: string
}

function householdMeta(): { id: string; name: string } {
  const h = currentHousehold.value
  return { id: h?.id ?? 'local', name: h?.name ?? '我的住所' }
}

function collectExportData() {
  const tree = buildLocationTree()
  const locations: { id: string; parentId: string | null; level: string; name: string; path: string }[] = []
  const walk = (nodes: LocationTreeNode[], parentId: string | null) => {
    for (const n of nodes) {
      locations.push({ id: n.id, parentId, level: n.level, name: n.name, path: getLocationPath(n.id) })
      walk(n.children, n.id)
    }
  }
  walk(tree, null)
  const items: ExportItem[] = store.items().map(it => ({
    name: it.name,
    quantity: it.quantity,
    notes: it.notes,
    tags: it.tags,
    locationPath: it.locationId ? getLocationPath(it.locationId) : '',
    ownerName: auth.state.user?.displayName ?? '我',
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
  }))
  return { household: { ...householdMeta(), exportedAt: new Date().toISOString() }, locations, items }
}

function writeBackupFile(content: string, ext: 'json' | 'csv', done: () => void) {
  const fs = uni.getFileSystemManager()
  const filePath = `${wx.env.USER_DATA_PATH}/wugui-${ext === 'json' ? 'backup' : 'export'}-${Date.now()}.${ext}`
  try {
    fs.writeFileSync(filePath, content, 'utf8')
    uni.showModal({
      title: '导出成功',
      content: `已保存到：${filePath}\n可通过微信文件传输助手发送到电脑。`,
      showCancel: true,
      confirmText: '打开文件',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          uni.openDocument({
            filePath,
            fileType: ext,
            showMenu: true,
            fail: () => uni.showToast({ title: '打开失败', icon: 'none' }),
          })
        }
      },
    })
    done()
  } catch {
    uni.showToast({ title: '导出失败', icon: 'none' })
  }
}

function exportJson() {
  const data = collectExportData()
  writeBackupFile(JSON.stringify(data, null, 2), 'json', () => {
    uni.showToast({ title: `已导出 ${data.items.length} 件物品`, icon: 'none' })
  })
}

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function exportCsv() {
  const data = collectExportData()
  if (!data.items.length) {
    uni.showToast({ title: '暂无物品可导出', icon: 'none' })
    return
  }
  // 列结构与 Web 端 toCsv 一致
  const header = ['物品名称', '数量', '标签', '收纳空间', '录入人', '备注', '创建时间', '更新时间']
  const rows = data.items.map(it => [
    it.name,
    String(it.quantity),
    it.tags.join('、'),
    it.locationPath,
    it.ownerName,
    it.notes ?? '',
    it.createdAt,
    it.updatedAt,
  ].map(csvCell).join(','))
  // BOM 让 Excel 正确识别 UTF-8 中文
  const csv = '\uFEFF' + [header.map(csvCell).join(','), ...rows].join('\r\n')
  writeBackupFile(csv, 'csv', () => {
    uni.showToast({ title: `已导出 ${data.items.length} 件物品`, icon: 'none' })
  })
}

// ---- 合并导入（对齐 Web 端 /api/import：空间按完整路径逐级 find-or-create，物品按空间+名称去重） ----
function importJson() {
  // #ifdef MP-WEIXIN
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['json'],
    success: (res) => {
      const file = res.tempFiles?.[0]
      if (!file) return
      readAndImport(file.path, file.name)
    },
  })
  // #endif
}

function readAndImport(filePath: string, fileName: string) {
  const fs = uni.getFileSystemManager()
  fs.readFile({
    filePath,
    encoding: 'utf8',
    success: (res) => {
      let data: {
        household?: { name?: string }
        locations?: { path?: unknown }[]
        items?: { name?: unknown; quantity?: unknown; notes?: unknown; tags?: unknown; locationPath?: unknown }[]
      }
      try {
        data = JSON.parse(res.data as string)
      } catch {
        uni.showToast({ title: '文件不是有效的 JSON', icon: 'none' })
        return
      }
      const locCount = Array.isArray(data?.locations) ? data.locations.length : 0
      const itemCount = Array.isArray(data?.items) ? data.items.length : 0
      if (!locCount && !itemCount) {
        uni.showToast({ title: '文件中没有可导入的数据', icon: 'none' })
        return
      }
      uni.showModal({
        title: '合并导入',
        content: `从「${data?.household?.name ?? fileName}」导入 ${locCount} 个空间、${itemCount} 件物品？已存在的物品将跳过，不会删除现有数据。`,
        confirmText: '导入',
        success: (r) => {
          if (r.confirm) runImport(data.locations ?? [], data.items ?? [])
        },
      })
    },
    fail: () => uni.showToast({ title: '读取文件失败', icon: 'none' }),
  })
}

function runImport(
  locationsIn: { path?: unknown }[],
  itemsIn: { name?: unknown; quantity?: unknown; notes?: unknown; tags?: unknown; locationPath?: unknown }[],
) {
  // 空间：现有空间按完整路径建索引，逐级 find-or-create（路径含 " / " 分段）
  const pathIdMap = new Map<string, string>()
  for (const l of store.locations()) pathIdMap.set(getLocationPath(l.id), l.id)

  let createdLocations = 0
  const ensurePath = (path: string): string | null => {
    const known = pathIdMap.get(path)
    if (known) return known
    const parts = path.split(' / ').map(s => s.trim()).filter(Boolean)
    if (!parts.length) return null
    let parentId: string | null = null
    let cur = ''
    // 最多三级：房间 / 家具 / 格位
    for (let i = 0; i < parts.length && i < 3; i++) {
      cur = cur ? `${cur} / ${parts[i]}` : parts[i]
      const mapped = pathIdMap.get(cur)
      if (mapped) {
        parentId = mapped
        continue
      }
      const id = createLocation(String(parts[i]).slice(0, 30), parentId)
      pathIdMap.set(cur, id)
      createdLocations++
      parentId = id
    }
    return parentId
  }

  // 先建浅层路径，保证父级存在
  const allPaths = new Set<string>()
  for (const l of locationsIn) if (typeof l?.path === 'string' && l.path.trim()) allPaths.add(l.path.trim())
  for (const it of itemsIn) if (typeof it?.locationPath === 'string' && it.locationPath.trim()) allPaths.add(it.locationPath.trim())
  const sortedPaths = [...allPaths].sort((a, b) => a.split(' / ').length - b.split(' / ').length)
  for (const p of sortedPaths) ensurePath(p)

  // 物品：按（空间 + 名称）去重，只新增不删除
  const itemKey = (locationId: string, name: string) => `${locationId}::${name}`
  const itemSet = new Set(store.items().map(i => itemKey(i.locationId, i.name)))
  let createdItems = 0
  let skippedItems = 0

  for (const it of itemsIn) {
    const name = String(it?.name ?? '').trim()
    if (!name) {
      skippedItems++
      continue
    }
    const locationId = typeof it.locationPath === 'string' ? ensurePath(it.locationPath) : null
    if (!locationId) {
      skippedItems++
      continue
    }
    const key = itemKey(locationId, name)
    if (itemSet.has(key)) {
      skippedItems++
      continue
    }
    itemSet.add(key)
    createItem({
      name: name.slice(0, 100),
      quantity: Math.min(9999, Math.max(1, Math.round(Number(it.quantity) || 1))),
      notes: typeof it.notes === 'string' ? it.notes.slice(0, 500) : null,
      locationId,
      tags: Array.isArray(it.tags)
        ? it.tags.slice(0, 10).map(t => String(t).trim().slice(0, 20)).filter(Boolean)
        : [],
      photoPaths: [],
    })
    createdItems++
  }

  uni.showModal({
    title: '导入完成',
    content: `新增 ${createdLocations} 个空间、${createdItems} 件物品，跳过 ${skippedItems} 件已存在物品。`,
    showCancel: false,
  })
}

function goAbout() {
  uni.navigateTo({ url: '/pages/about/about' })
}

// ---- 头像（登录用户双端一致：选图 → 上传服务端；未登录仅本地） ----
async function onAvatarPick() {
  try {
    uni.showLoading({ title: '处理中…' })
    const path = await pickLocalPhoto(1)
    await uploadAvatar(path)
    uni.hideLoading()
    uni.showToast({ title: '头像已更新', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    const msg = e instanceof Error ? e.message : ''
    if (msg && msg !== '已达上限') {
      uni.showToast({ title: msg || '更换头像失败', icon: 'none' })
    }
  }
}

function onAvatarRemove() {
  uni.showModal({
    title: '移除头像',
    content: '确定移除当前头像？',
    success: (res) => {
      if (!res.confirm) return
      void removeAvatar()
        .then(() => uni.showToast({ title: '已移除', icon: 'success' }))
        .catch(() => uni.showToast({ title: '移除失败', icon: 'none' }))
    },
  })
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？本机数据会保留。',
    confirmText: '退出',
    confirmColor: '#dc2626',
    success: (res) => {
      if (res.confirm) auth.logout()
    },
  })
}

defineExpose({ refresh: reload })
</script>

<style scoped>
.tab-root {
  padding-top: 0;
}

/* 页头：占满导航带高度，与右上角胶囊垂直居中（与"物品/空间"页头一致），关于为标题旁小链接 */
.head {
  display: flex;
  align-items: center;
  gap: 20rpx;
  min-height: var(--nav-bar-height, 88rpx);
  padding: 8rpx 4rpx;
}
.head-title {
  font-family: var(--font-display);
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: var(--color-text);
}
.head-link {
  padding: 4rpx 16rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #0f7a38;
}

/* 用户卡 */
.user-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 24rpx;
}
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 999rpx;
  background: #16a34a;
  color: #ffffff;
  font-size: 48rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(22, 163, 74, 0.25);
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 999rpx;
}
/* 已上传照片：去掉绿底与绿色投影，透明 PNG 不透出背景色 */
.avatar-photo {
  background: transparent;
  box-shadow: none;
}
.avatar-cam {
  position: absolute;
  right: -6rpx;
  bottom: -6rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 999rpx;
  background: #16a34a;
  border: 4rpx solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-remove {
  padding: 12rpx 24rpx;
  background: #e7f4ec;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.avatar-remove > text {
  font-size: 24rpx;
  font-weight: 600;
  color: #0f7a38;
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
  flex: 1;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}
.user-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.name-input {
  flex: 1;
  min-width: 0;
  height: 56rpx;
  padding: 0 20rpx;
  background: #f3f6f2;
  border: 1rpx solid #cdd6cf;
  border-radius: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #182720;
  box-sizing: border-box;
}
.name-save,
.name-cancel {
  font-size: 24rpx;
  font-weight: 600;
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.name-save {
  background: #16a34a;
  color: #ffffff;
}
.name-cancel {
  background: #f3f6f2;
  color: #51605a;
}
.user-email {
  font-size: 24rpx;
  color: #8a978f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 区块 */
.section {
  margin-top: 32rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4rpx 12rpx;
}
.sec-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #51605a;
  display: block;
  padding: 0 4rpx 12rpx;
}
.sec-aux {
  font-size: 24rpx;
  color: #8a978f;
}

/* 住所管理 */
.empty-household {
  padding: 32rpx 24rpx;
  font-size: 26rpx;
  color: #8a978f;
  line-height: 1.6;
}
.household-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.household-card {
  padding: 24rpx;
}
.household-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}
.household-name-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
  flex: 1;
}
.household-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge {
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.badge-current {
  background: #e3f3ea;
  color: #16a34a;
}
.badge-owner {
  border: 1rpx solid #e4eae5;
  color: #8a978f;
}
.switch-btn {
  padding: 8rpx 20rpx;
  background: #e3f3ea;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.switch-btn > text {
  font-size: 24rpx;
  font-weight: 600;
  color: #16a34a;
}

/* 邀请码 */
.invite-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 20rpx;
  padding: 16rpx 20rpx;
  border: 1rpx solid #e3f3ea;
  background: #f3faf5;
  border-radius: 12rpx;
}
.invite-label {
  font-size: 22rpx;
  color: #8a978f;
  flex-shrink: 0;
}
.invite-code {
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
  color: #182720;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.invite-copy {
  font-size: 22rpx;
  color: #16a34a;
  font-weight: 600;
  flex-shrink: 0;
}

/* 管理链接行 */
.manage-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 20rpx;
  flex-wrap: wrap;
}
.manage-link {
  font-size: 24rpx;
  font-weight: 500;
  color: #16a34a;
}
.manage-link-danger {
  color: #dc2626;
}
.manage-sep {
  font-size: 24rpx;
  color: #cdd6cf;
}

/* 改名 / 创建 / 加入 表单 */
.rename-row {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
  align-items: center;
}
.rename-input {
  flex: 1;
  min-width: 0;
}
.rename-save, .rename-cancel {
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  flex-shrink: 0;
}

/* 成员列表 */
.member-list {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.member-loading {
  font-size: 24rpx;
  color: #8a978f;
  padding: 8rpx 0;
}
.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  background: #f3f6f2;
  border-radius: 8rpx;
}
.member-name {
  font-size: 24rpx;
  color: #182720;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.member-role {
  font-size: 22rpx;
  color: #8a978f;
}
.member-kick {
  font-size: 24rpx;
  color: #dc2626;
  font-weight: 600;
  flex-shrink: 0;
  padding-left: 12rpx;
}

/* 创建 / 加入 按钮 */
.create-join {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}
.cj-btn {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
}

/* 外观偏好：行卡对齐 Web 端 rounded-lg（14px） */
.pref-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  background: var(--color-surface, #ffffff);
  border: 1rpx solid #e4eae5;
  border-radius: 28rpx;
  padding: 24rpx;
  margin-top: 16rpx;
  box-sizing: border-box;
  width: 100%;
}
.pref-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.pref-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #182720;
}
.pref-sub {
  font-size: 24rpx;
  color: #8a978f;
}

.pref-card-col {
  flex-direction: column;
  align-items: stretch;
}

/* 看板背景 toggle：右侧紧凑开关（对齐 Web 端） */
.pref-toggle {
  display: flex;
  background: #f0f2f0;
  border-radius: 28rpx;
  padding: 8rpx;
  flex-shrink: 0;
}
.toggle-item {
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
}
.toggle-item > text {
  font-size: 24rpx;
  font-weight: 500;
  color: #51605a;
}
.toggle-item.on {
  background: #ffffff;
  box-shadow: 0 2rpx 4rpx rgba(24, 39, 32, 0.04), 0 16rpx 48rpx rgba(24, 39, 32, 0.05);
}
.toggle-item.on > text {
  color: #16a34a;
}

/* 主题配色 */
.theme-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12rpx;
  margin-top: 16rpx;
}
.theme-cell {
  border: 1rpx solid #e4eae5;
  border-radius: 28rpx;
  padding: 16rpx;
}
.theme-cell.on {
  border-color: #16a34a;
}
.theme-swatches {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 8rpx;
  border-radius: 8rpx;
  padding: 12rpx 8rpx;
}
.swatch {
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}
.theme-label-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 12rpx;
}
.theme-check {
  width: 32rpx;
  height: 32rpx;
  border-radius: 999rpx;
  border: 1rpx solid #cdd6cf;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20rpx;
  color: #ffffff;
}
.theme-check.on {
  background: #16a34a;
  border-color: #16a34a;
}
.theme-label {
  font-size: 22rpx;
  color: #8a978f;
}
.theme-cell.on .theme-label {
  color: #16a34a;
  font-weight: 600;
}

/* 列表卡 */
.list-card {
  padding: 0;
  overflow: hidden;
  margin-top: 16rpx;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
}
.list-row-border {
  border-top: 1rpx solid #e4eae5;
}
.row-icon-tile {
  width: 68rpx;
  height: 68rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.row-icon-green {
  background: #e7f4ec;
}
.row-icon-blue {
  background: #e7f0f4;
}
.row-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.row-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #182720;
}
.row-sub {
  font-size: 22rpx;
  color: #8a978f;
}
.row-arrow {
  color: #aebbb2;
  font-size: 36rpx;
  line-height: 1;
  flex-shrink: 0;
}

/* 退出 */
.logout-btn {
  margin-top: 48rpx;
}
.version-text {
  display: block;
  margin-top: 24rpx;
  text-align: center;
  font-size: 22rpx;
  color: #aebbb2;
  letter-spacing: 2rpx;
}
</style>
