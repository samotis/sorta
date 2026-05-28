import { onMounted, onUnmounted } from 'vue'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function useDateRefresh() {
  const loadedDate = todayStr()

  function handleVisibilityChange() {
    if (!document.hidden && todayStr() !== loadedDate) {
      location.reload()
    }
  }

  onMounted(() => document.addEventListener('visibilitychange', handleVisibilityChange))
  onUnmounted(() => document.removeEventListener('visibilitychange', handleVisibilityChange))
}
