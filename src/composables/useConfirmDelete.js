import { ref } from 'vue'
import { useTasks } from './useTasks'

const pendingTask = ref(null)

export function useConfirmDelete() {
  const { deleteTask } = useTasks()

  function requestDelete(task) {
    pendingTask.value = task
  }

  function confirmDelete() {
    if (pendingTask.value) {
      deleteTask(pendingTask.value.id)
      pendingTask.value = null
    }
  }

  function cancelDelete() {
    pendingTask.value = null
  }

  return { pendingTask, requestDelete, confirmDelete, cancelDelete }
}
