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

    <!-- Shared scroll area for both lists -->
    <div class="sidebar__scroll-area">

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
            @delete="requestDelete"
          />
        </div>
        <p v-if="localList.length === 0" class="sidebar__empty">
          No unscheduled tasks.<br>Click "Add a Task" to get started.
        </p>
      </VueDraggable>

      <!-- Backlog section toggle -->
      <button
        class="sidebar__backlog-toggle"
        :aria-expanded="isBacklogOpen.toString()"
        aria-controls="backlog-list"
        @click="toggleBacklog"
      >
        Backlog Tasks
        <span class="sidebar__caret" :class="{ 'sidebar__caret--open': isBacklogOpen }" aria-hidden="true"></span>
      </button>

      <!-- Draggable backlog list -->
      <VueDraggable
        id="backlog-list"
        class="sidebar__backlog-list"
        role="list"
        aria-label="Backlog tasks"
        v-show="isBacklogOpen"
        v-model="localBacklogList"
        group="tasks"
        ghost-class="task-card--ghost"
        drag-class="sortable-drag"
        :animation="150"
        @update="onBacklogChange"
        @add="onBacklogChange"
      >
        <div v-for="task in localBacklogList" :key="task.id" role="listitem">
          <TaskCard
            :task="task"
            @toggle-complete="toggleComplete"
            @edit="openEditModal"
            @delete="requestDelete"
          />
        </div>
        <p v-if="localBacklogList.length === 0" class="sidebar__empty sidebar__empty--backlog">
          Drag tasks here to backlog them.
        </p>
      </VueDraggable>

    </div>

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
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import TaskCard from './TaskCard.vue'
import TaskModal from './TaskModal.vue'

const { tasks, addTask, updateTask, toggleComplete, syncList, syncBacklogList } = useTasks()
const { requestDelete } = useConfirmDelete()

const BACKLOG_OPEN_KEY = 'sorta_backlog_open'

const localList = ref([])
watchEffect(() => {
  localList.value = tasks.value
    .filter(t => t.scheduledDate === null && !t.isBacklog)
    .sort((a, b) => a.position - b.position)
})

const localBacklogList = ref([])
watchEffect(() => {
  localBacklogList.value = tasks.value
    .filter(t => t.scheduledDate === null && t.isBacklog)
    .sort((a, b) => a.position - b.position)
})

const isBacklogOpen = ref(localStorage.getItem(BACKLOG_OPEN_KEY) === 'true')

function toggleBacklog() {
  isBacklogOpen.value = !isBacklogOpen.value
  localStorage.setItem(BACKLOG_OPEN_KEY, isBacklogOpen.value)
}

function onListChange() {
  syncList(localList.value, null)
}

function onBacklogChange() {
  syncBacklogList(localBacklogList.value)
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
