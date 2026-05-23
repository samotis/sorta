import { ref } from 'vue'
import { useTasks } from './useTasks'

const pending = ref(false)

export function useConfirmDeleteAll() {
  const { deleteAllTasks } = useTasks()

  function requestDeleteAll() {
    pending.value = true
  }

  function confirmDeleteAll() {
    deleteAllTasks()
    pending.value = false
  }

  function cancelDeleteAll() {
    pending.value = false
  }

  return { pending, requestDeleteAll, confirmDeleteAll, cancelDeleteAll }
}
