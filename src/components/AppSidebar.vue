<template>
  <aside class="sidebar" aria-label="Unscheduled tasks">

    <!-- Logo -->
    <div class="sidebar__logo">
      <img src="@/assets/sorta-logo.svg" alt="Sorta" />
    </div>

    <!-- Add task button -->
    <button
      class="sidebar__add-btn"
      aria-label="Add a new task"
      @click="openAddModal"
    >
      <img class="sidebar__add-btn-icon" src="@/assets/plus.svg" alt="" aria-hidden="true" />
      Add a Task
    </button>

    <!-- Section label -->
    <p class="sidebar__section-label" id="unscheduled-label">Unscheduled Tasks</p>

    <!-- Draggable unscheduled list -->
    <VueDraggable
      class="sidebar__task-list"
      role="list"
      aria-labelledby="unscheduled-label"
      v-model="localList"
      group="tasks"
      ghost-class="task-card--ghost"
      drag-class="sortable-drag"
      :animation="150"
      @update="onListChange"
      @add="onListChange"
    >
      <div v-for="task in localList" :key="task.id" role="listitem">
        <TaskCard
          :task="task"
          @toggle-complete="toggleComplete"
          @edit="openEditModal"
          @delete="deleteTask"
        />
      </div>
      <p v-if="localList.length === 0" class="sidebar__empty">
        No unscheduled tasks.<br>Click "Add a Task" to get started.
      </p>
    </VueDraggable>

    <!-- Task Modal (add / edit) -->
    <TaskModal
      v-model="modalOpen"
      :task="editingTask"
      @save="handleModalSave"
    />
  </aside>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useTasks } from '@/composables/useTasks'
import TaskCard from './TaskCard.vue'
import TaskModal from './TaskModal.vue'

const { tasks, addTask, updateTask, deleteTask, toggleComplete, syncList } = useTasks()

const localList = ref([])
watchEffect(() => {
  localList.value = tasks.value
    .filter(t => t.scheduledDate === null)
    .sort((a, b) => a.position - b.position)
})

function onListChange() {
  syncList(localList.value, null)
}

const modalOpen   = ref(false)
const editingTask = ref(null)

function openAddModal() {
  editingTask.value = null
  modalOpen.value   = true
}

function openEditModal(task) {
  editingTask.value = task
  modalOpen.value   = true
}

function handleModalSave(fields) {
  if (editingTask.value) {
    updateTask(editingTask.value.id, fields)
  } else {
    addTask({ ...fields, scheduledDate: null })
  }
  editingTask.value = null
}
</script>
