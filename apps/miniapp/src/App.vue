<script setup lang="ts">
// 全局生命周期占位：登录跳转守卫在各自页面的 onShow 里处理
</script>

<style>
/* 全站基础样式（App.vue 的 style 为全局生效） */
page {
  background: #f3f6f2;
  color: #111827;
  font-size: 28rpx;
}
.card {
  background: #ffffff;
  border: 1rpx solid #e5e7eb;
  border-radius: 16rpx;
  padding: 24rpx;
}
.input-base {
  background: #ffffff;
  border: 1rpx solid #d1d5db;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
}
.btn-primary {
  background: #16a34a;
  color: #ffffff;
  border-radius: 12rpx;
  padding: 22rpx 0;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
}
.btn-primary[disabled] {
  opacity: 0.6;
}
.btn-secondary {
  background: #ffffff;
  color: #16a34a;
  border: 1rpx solid #16a34a;
  border-radius: 12rpx;
  padding: 20rpx 0;
  font-size: 28rpx;
  font-weight: 500;
  text-align: center;
}
.btn-danger {
  background: #ffffff;
  color: #dc2626;
  border: 1rpx solid #dc2626;
  border-radius: 12rpx;
  padding: 20rpx 0;
  font-size: 28rpx;
  text-align: center;
}
.text-muted {
  color: #6b7280;
  font-size: 24rpx;
}
</style>
