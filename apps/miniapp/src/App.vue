<script setup lang="ts">
// 全局生命周期：只放与页面无关的一次性初始化，登录跳转守卫仍在各页 onShow 里处理
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { registerPrivacyListener } from './composables/usePrivacy'
import { initSync, syncOnForeground } from './composables/useSync'

onLaunch(() => {
  // 微信隐私授权监听是全局单例，必须在这里注册一次，各页 PrivacyPopup 才会被唤起
  registerPrivacyListener()
  // M2 云同步：注册"写后防抖同步"钩子 + 网络恢复监听（幂等，仅执行一次）
  initSync()
})

// 每次回前台：刷新会员态并尝试同步（push Outbox / pull 增量）
onShow(() => {
  void syncOnForeground()
})
</script>

<style>
/*
 * 物归 · 全局样式（对齐 Web 端"清新绿洲"主题）
 * 单位：rpx（1px ≈ 2rpx），颜色/圆角/字号 token 与 assets/css/main.css 保持一致
 *
 * 主题切换：各页根元素 .page 上挂 theme-* 类，CSS 变量沿 DOM 继承到子组件
 * （含 AppTabbar / footer-bar），新增配色 = 新增一组变量覆盖，零组件改动。
 */

/* 导航条高度 token：底部固定栏与页面 padding 共用 */
page {
  --tabbar-height: 128rpx;
  background: #f3f6f2;
  color: #182720;
  font-size: 28rpx;
  line-height: 1.5;
  font-family: -apple-system, 'PingFang SC', 'HarmonyOS Sans SC',
    'Noto Sans CJK SC', 'Microsoft YaHei UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ── 默认主题：清新绿洲 ── */
.page {
  --color-primary: #16a34a;
  --color-primary-dark: #0f7a38;
  --color-primary-soft: #d3efdd;
  --color-tint: #e7f4ec;
  --color-tint-2: #f0f8f3;
  --color-signal: #16a34a;
  --color-bg: #f3f6f2;
  --color-surface: #ffffff;
  --color-sunken: #f0f2f0;
  --color-surface-tint: #f6faf7;
  --color-border: #e4eae5;
  --color-border-strong: #d8e1da;
  --color-border-tint: #e4efe7;
  --color-text: #182720;
  --color-text-secondary: #51605a;
  --color-text-tertiary: #8a978f;
  --color-text-disabled: #aebbb2;
  --color-error: #dc2626;
  --shadow-primary: 0 20rpx 44rpx rgba(22, 163, 74, 0.3);
  /* 标题展示字体（问候语/页面大标题/小节标题/房间名）：默认黑体 */
  --font-display: 'PingFang SC', 'HarmonyOS Sans SC', 'Noto Sans CJK SC', 'Source Han Sans SC', 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif;
}

/* ── 暖木收纳 ── */
.page.theme-timber {
  --color-primary: #33604a;
  --color-primary-dark: #274c39;
  --color-primary-soft: #e3ece6;
  --color-tint: #f0e7d4;
  --color-tint-2: #f7f1e3;
  --color-signal: #33604a;
  --color-bg: #f6f1e7;
  --color-surface: #fffcf6;
  --color-sunken: #efe7d8;
  --color-surface-tint: #fbf7ee;
  --color-border: #eae1cd;
  --color-border-strong: #ddd2b8;
  --color-border-tint: #eae0c9;
  --color-text: #2a2419;
  --color-text-secondary: #5d5344;
  --color-text-tertiary: #8d8371;
  --color-text-disabled: #b3a894;
  --shadow-primary: 0 20rpx 44rpx rgba(51, 96, 74, 0.26);
  /* 暖木主题：标题用宋体带出"家"的温度（对齐 Web 端 main.css） */
  --font-display: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'SimSun', serif;
}

/* ── 现代墨石 ── */
.page.theme-inkstone {
  --color-primary: #17191b;
  --color-primary-dark: #0b0d0e;
  --color-primary-soft: #e4e6e6;
  --color-tint: #f2f2f0;
  --color-tint-2: #f7f7f5;
  --color-signal: #0e9f6e;
  --color-bg: #f2f2f0;
  --color-surface: #ffffff;
  --color-sunken: #e9e9e6;
  --color-surface-tint: #f7f7f5;
  --color-border: #e6e6e3;
  --color-border-strong: #d7d7d3;
  --color-border-tint: #e9e9e6;
  --color-text: #17191b;
  --color-text-secondary: #4b4f52;
  --color-text-tertiary: #86898c;
  --color-text-disabled: #adb0b3;
  --shadow-primary: 0 20rpx 44rpx rgba(23, 25, 27, 0.24);
}

/* 语义色工具类（对应 Web 端 tailwind token） */
.text-primary { color: var(--color-primary); }
.text-primary-dark { color: var(--color-primary-dark); }
.text-secondary { color: var(--color-text-secondary); }
.text-tertiary { color: var(--color-text-tertiary); }
.text-disabled { color: var(--color-text-disabled); }
.text-error { color: var(--color-error); }
.text-warning { color: #b45309; }
.text-white { color: #ffffff; }

/* 卡片：白底 + 1px 边框 + 16px 圆角（Web rounded-2xl）+ 软阴影（level-1） */
.card {
  background: var(--color-surface);
  border: 1rpx solid var(--color-border);
  border-radius: 32rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(24, 39, 32, 0.04), 0 16rpx 48rpx rgba(24, 39, 32, 0.05);
}

/* 输入框：1.5px 边框 + 24rpx 圆角 + 16rpx 24rpx 内边距 + 32rpx 字号（对齐 Web 端 .input-base） */
.input-base {
  background: var(--color-surface);
  border: 3rpx solid var(--color-border-strong);
  border-radius: 24rpx;
  padding: 20rpx 24rpx;
  font-size: 32rpx;
  color: var(--color-text);
  width: 100%;
  box-sizing: border-box;
  line-height: 1.5;
  min-height: 96rpx;
}
.input-base:focus {
  border-color: var(--color-primary);
  outline: 4rpx solid rgba(22, 163, 74, 0.15);
  outline-offset: -2rpx;
}

/* 主按钮：主色底 + 品牌投影 + 32rpx 圆角（对齐 Web 端 .btn-primary） */
.btn-primary {
  background: var(--color-primary);
  color: #ffffff;
  border: 0;
  border-radius: 32rpx;
  padding: 24rpx 32rpx;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  box-shadow: var(--shadow-primary);
  line-height: 1.4;
}
.btn-primary::after { border: none; }
.btn-primary[disabled] {
  opacity: 0.6;
  box-shadow: none;
}

/* 次按钮：白底描边 */
.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border: 3rpx solid var(--color-border-strong);
  border-radius: 32rpx;
  padding: 22rpx 32rpx;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
}
.btn-secondary::after { border: none; }

/* 危险软按钮：红软底红字（对齐 Web 端 .btn-danger-soft） */
.btn-danger-soft {
  background: #fdeded;
  color: var(--color-error);
  border: 0;
  border-radius: 32rpx;
  padding: 22rpx 32rpx;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
}
.btn-danger-soft::after { border: none; }

/* 危险主按钮：白底红描边（用于"退出登录"这类主操作） */
.btn-danger {
  background: var(--color-surface);
  color: var(--color-error);
  border: 3rpx solid var(--color-error);
  border-radius: 32rpx;
  padding: 22rpx 32rpx;
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
}
.btn-danger::after { border: none; }

/* 文本尺寸工具类 */
.text-2xs { font-size: 22rpx; }
.text-xs { font-size: 24rpx; }
.text-sm { font-size: 28rpx; }
.text-base { font-size: 32rpx; }
.text-lg { font-size: 40rpx; }
.text-xl { font-size: 48rpx; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 通用图标/占位圆 */
.dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 9999rpx;
  background: var(--color-primary);
  display: inline-block;
}

/* 区块标题（对齐 Web 端 SectionTitle） */
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-title-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-family: var(--font-display);
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  color: var(--color-text);
}
.section-title-aux {
  font-size: 24rpx;
  color: var(--color-text-tertiary);
}

/* 图标方块（对齐 Web 端 RoomCard 30px icon slot） */
.icon-tile {
  width: 60rpx;
  height: 60rpx;
  border-radius: 20rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-tint);
  color: var(--color-primary);
  font-size: 30rpx;
}
.icon-tile-muted {
  background: var(--color-sunken);
  color: var(--color-text-disabled);
}

/* 头像（对齐 Web 端 UserAvatar 44px） */
.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 999rpx;
  background: var(--color-primary);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: var(--shadow-primary);
}

/* 数量 pill */
.qty-pill {
  background: var(--color-sunken);
  color: var(--color-text-secondary);
  border-radius: 999rpx;
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  font-weight: 600;
}

/* 进度条轨道 */
.track {
  height: 6rpx;
  background: var(--color-tint);
  border-radius: 999rpx;
  position: relative;
}
.track-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: var(--color-signal);
  border-radius: 999rpx;
}
.track-dot {
  position: absolute;
  top: 50%;
  width: 16rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: var(--color-signal);
  border: 4rpx solid var(--color-surface);
  transform: translate(-50%, -50%);
}

/* 底部固定操作栏（详情页）：抬到底部导航条之上，避免遮挡 */
.footer-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
  padding: 20rpx 32rpx;
  background: var(--color-bg);
  border-top: 1rpx solid var(--color-border);
  display: flex;
  gap: 20rpx;
  z-index: 90;
}
.footer-bar .btn-primary,
.footer-bar .btn-danger-soft {
  flex: 1;
  padding: 22rpx 24rpx;
  font-size: 30rpx;
}

/* 内页顶栏（编辑/详情用）：高度 = 胶囊导航带，标题与右上角胶囊垂直居中对齐 */
.topbar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--nav-bar-height, 88rpx);
  padding: 0 32rpx;
  position: relative;
}
.topbar-back {
  position: absolute;
  left: 24rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background: var(--color-surface);
  border: 1rpx solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  font-size: 32rpx;
}
.topbar-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--color-text);
}

/* 页面通用 padding（顶部让出真实状态栏高度：--status-bar-height 由 useSafeArea 在各页根节点覆盖，
   内页标题带紧跟其后（.topbar 高度 = --nav-bar-height），与胶囊垂直居中对齐） */
.page {
  min-height: 100vh;
  padding: var(--status-bar-height, 0px) 32rpx 40rpx;
  box-sizing: border-box;
  background: var(--color-bg);
  color: var(--color-text);
}
/* 带底部导航条：预留 tabbar 高度 + 安全区 */
.page-tabbar {
  padding-bottom: calc(var(--tabbar-height) + 48rpx + env(safe-area-inset-bottom));
}
/* 同时带底部导航条与固定操作栏 */
.page-tabbar-footer {
  padding-bottom: calc(var(--tabbar-height) + 200rpx + env(safe-area-inset-bottom));
}
</style>
