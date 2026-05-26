<template>
  <section
    class="day-column"
    :aria-label="`${dayName}${isToday ? ' (Today)' : ''}, ${shortDate}`"
    data-day-column
  >
    <!-- Column header -->
    <header class="day-column__header">
      <div class="day-column__date-row">
        <h2 class="day-column__day-name" :class="{ 'day-column__day-name--today': isToday }">
          {{ dayName }}
          <span v-if="isToday" class="day-column__today-badge">(Today)</span>
        </h2>
        <span
          class="day-column__hours"
          :class="{ 'day-column__hours--over-budget': isOverBudget }"
          :aria-label="`${totalHours.toFixed(2)} of 8 hours scheduled`"
        >
          {{ totalHours.toFixed(2) }} / {{ DAILY_BUDGET.toFixed(2) }}
        </span>
      </div>

      <p class="day-column__date">{{ shortDate }}</p>

      <div class="day-column__progress-bar" role="progressbar" :aria-valuenow="progressPct" aria-valuemin="0" aria-valuemax="100" :aria-label="`${progressPct}% of today's tasks complete`">
        <div class="day-column__progress-bar-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
    </header>

    <!-- Repeating tasks from other anchor dates -->
    <div
      v-if="repeatingInstances.length > 0"
      class="day-column__repeating-section"
      role="list"
      :aria-label="`Repeating tasks for ${dayName}`"
    >
      <div v-for="task in repeatingInstances" :key="task.id" role="listitem">
        <TaskCard
          :task="task"
          :is-completed="isCompletedOnDate(task, date)"
          @toggle-complete="handleToggleComplete"
          @edit="openEditModal"
          @delete="requestDelete"
        />
      </div>
    </div>

    <!-- Draggable task list (tasks anchored to this date) -->
    <VueDraggable
      class="day-column__task-list"
      role="list"
      :aria-label="`Tasks for ${dayName}`"
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
          :is-completed="task.repeat ? isCompletedOnDate(task, date) : undefined"
          @toggle-complete="handleToggleComplete"
          @edit="openEditModal"
          @delete="requestDelete"
        />
      </div>
    </VueDraggable>

    <!-- Edit modal (per-column instance) -->
    <TaskModal
      v-model="modalOpen"
      :task="editingTask"
      @save="handleModalSave"
    />
  </section>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useTasks, taskOccursOn, isCompletedOnDate } from '@/composables/useTasks'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { formatDayName, formatShortDate, todayString } from '@/composables/useCalendar'
import TaskCard from './TaskCard.vue'
import TaskModal from './TaskModal.vue'

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
})

const DAILY_BUDGET = 8

const {
  tasks,
  toggleComplete,
  toggleCompleteOnDate,
  updateTask,
  syncList,
  totalHoursForDate,
  completedHoursForDate,
} = useTasks()
const { requestDelete } = useConfirmDelete()

const today     = todayString()
const isToday   = computed(() => props.date === today)
const dayName   = computed(() => formatDayName(props.date))
const shortDate = computed(() => formatShortDate(props.date))

// Expose date as a non-reactive alias for template use
const date = props.date

const totalHours     = computed(() => totalHoursForDate(props.date))
const completedHours = computed(() => completedHoursForDate(props.date))
const isOverBudget   = computed(() => totalHours.value > DAILY_BUDGET)
const progressPct    = computed(() => {
  if (totalHours.value === 0) return 0
  return Math.min(Math.round((completedHours.value / totalHours.value) * 100), 100)
})

// Non-repeating tasks anchored to this date — managed by VueDraggable
const localList = ref([])
watchEffect(() => {
  localList.value = tasks.value
    .filter(t => t.scheduledDate === props.date && !t.repeat)
    .sort((a, b) => a.position - b.position)
})

// All repeating tasks that occur on this date — read-only display above the draggable list
const repeatingInstances = computed(() => {
  return tasks.value.filter(t => t.repeat && taskOccursOn(t, props.date))
})

function onListChange() {
  syncList(localList.value, props.date)
}

function handleToggleComplete(taskId) {
  const task = tasks.value.find(t => t.id === taskId)
  if (!task) return
  if (task.repeat) {
    toggleCompleteOnDate(taskId, props.date)
  } else {
    toggleComplete(taskId)
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const modalOpen   = ref(false)
const editingTask = ref(null)

function openEditModal(task) {
  editingTask.value = task
  modalOpen.value   = true
}

function handleModalSave(fields) {
  if (editingTask.value) {
    updateTask(editingTask.value.id, fields)
  }
  editingTask.value = null
}
</script>
