import { ref } from 'vue'
import { useTasks } from './useTasks'
import { useCalendars } from './useCalendars'

const pending = ref(false)

export function useConfirmDeleteAll() {
  const { deleteAllTasks } = useTasks()
  const { clearCalendars } = useCalendars()

  function requestDeleteAll() {
    pending.value = true
  }

  function confirmDeleteAll() {
    deleteAllTasks()
    clearCalendars()
    pending.value = false
  }

  function cancelDeleteAll() {
    pending.value = false
  }

  return { pending, requestDeleteAll, confirmDeleteAll, cancelDeleteAll }
}
