import { defineStore } from 'pinia'

interface Household {
  id: string
  name: string
  role: 'owner' | 'member'
  inviteCode?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ id: string; email: string; displayName: string | null; avatarUrl: string | null } | null>(null)
  const households = ref<Household[]>([])
  const currentHouseholdId = ref<string | null>(null)
  const loaded = ref(false)

  const currentHousehold = computed(() =>
    households.value.find(h => h.id === currentHouseholdId.value) ?? null,
  )

  async function fetchMe() {
    const res = await apiFetch<{
      user: { id: string; email: string; displayName: string | null; avatarUrl: string | null }
      households: Household[]
      currentHouseholdId: string | null
    }>('/api/auth/me')
    user.value = res.user
    households.value = res.households
    currentHouseholdId.value = res.currentHouseholdId
    loaded.value = true
  }

  async function switchTo(householdId: string) {
    await apiFetch(`/api/auth/switch/${householdId}`, { method: 'POST' })
    currentHouseholdId.value = householdId
  }

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    households.value = []
    currentHouseholdId.value = null
    loaded.value = false
    // 清理本账号的本地数据（最近位置等）
    useRecentLocations().clear()
    await navigateTo('/login')
  }

  return { user, households, currentHouseholdId, currentHousehold, loaded, fetchMe, switchTo, logout }
})
