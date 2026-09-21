<template>
  <view class="page home-page" :class="themeClass">
    <swiper
      class="home-swiper"
      :current="activeTab"
      :duration="260"
      @change="onSwiperChange"
    >
      <!-- 首页 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <TabHome v-if="mounted[0]" ref="homeRef" />
        </scroll-view>
      </swiper-item>
      <!-- 物品 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <TabItems v-if="mounted[1]" ref="itemsRef" />
        </scroll-view>
      </swiper-item>
      <!-- 空间 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <TabLocations v-if="mounted[2]" ref="locationsRef" />
        </scroll-view>
      </swiper-item>
      <!-- 我的 -->
      <swiper-item>
        <scroll-view scroll-y class="tab-scroll">
          <TabSettings v-if="mounted[3]" ref="settingsRef" />
        </scroll-view>
      </swiper-item>
    </swiper>

    <AppTabbar />
    <!-- 隐私授权弹窗：本页含选照片/导入备份/复制邀请码等隐私接口 -->
    <PrivacyPopup />
  </view>
</template>

<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppTabbar from '../../components/AppTabbar.vue'
import PrivacyPopup from '../../components/PrivacyPopup.vue'
import TabHome from '../../components/tabs/TabHome.vue'
import TabItems from '../../components/tabs/TabItems.vue'
import TabLocations from '../../components/tabs/TabLocations.vue'
import TabSettings from '../../components/tabs/TabSettings.vue'
import { useAuth } from '../../composables/useAuth'
import { useTheme } from '../../composables/useTheme'
import { useHomeTabs } from '../../composables/useHomeTabs'

const { themeClass } = useTheme()
const { activeTab } = useHomeTabs()
const auth = useAuth()

// 懒挂载：首次切到某 tab 才挂载组件，之后常驻（滑动瞬时、滚动位置保留）
const mounted = reactive([true, false, false, false])
const homeRef = ref()
const itemsRef = ref()
const locationsRef = ref()
const settingsRef = ref()
const tabRefs = [homeRef, itemsRef, locationsRef, settingsRef]

function onSwiperChange(e: any) {
  const i = Number(e?.detail?.current ?? 0)
  activeTab.value = i
  mounted[i] = true
  // 始终刷新目标 tab：本地存储读取开销极低，保证数据不滞后
  nextTick(() => tabRefs[i]?.value?.refresh())
}

onShow(() => {
  if (!auth.isLogged) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  // 从编辑/详情页返回：刷新当前 tab 数据
  const i = activeTab.value
  mounted[i] = true
  nextTick(() => tabRefs[i]?.value?.refresh())
})
</script>

<style scoped>
/* 容器：占满全屏，swiper 撑满剩余高度；状态栏高度由顶部 padding 让出 */
.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: calc(var(--status-bar-height, 0px) + 16rpx) 0 0;
  overflow: hidden;
}
.home-swiper {
  flex: 1;
  min-height: 0;
}
/* 每个 tab 的滚动区：左右留白 + 底部让出 tabbar */
.tab-scroll {
  height: 100%;
  box-sizing: border-box;
  padding: 0 32rpx calc(var(--tabbar-height) + 48rpx + env(safe-area-inset-bottom));
}
</style>
