<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="state.visible" role="status"
           class="toast-float fixed left-1/2 top-4 z-50 rounded-lg bg-neutral-800 px-4 py-2.5 text-sm text-white shadow-level-2">
        {{ state.message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { state } = useToast()
</script>

<style scoped>
.toast-float {
  transform: translate(-50%, 0);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
.toast-enter-to,
.toast-leave-from {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
