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

    <!-- Draggable task list -->
    <VueDraggable
      class="day-column__task-list"
      :class="{ 'day-column__task-list--drag-over': isDragOver }"
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
          @toggle-complete="toggleComplete"
          @edit="openEditModal"
          @delete="deleteTask"
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
import { useTasks } from '@/composables/useTasks'
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

const { tasks, toggleComplete, deleteTask, updateTask, syncList, totalHoursForDate, completedHoursForDate } = useTasks()

const today     = todayString()
const isToday   = computed(() => props.date === today)
const dayName   = computed(() => formatDayName(props.date))
const shortDate = computed(() => formatShortDate(props.date))

const totalHours     = computed(() => totalHoursForDate(props.date))
const completedHours = computed(() => completedHoursForDate(props.date))
const isOverBudget   = computed(() => totalHours.value > DAILY_BUDGET)
const progressPct    = computed(() => {
  if (totalHours.value === 0) return 0
  return Math.min(Math.round((completedHours.value / totalHours.value) * 100), 100)
})

const isDragOver = ref(false)

// Plain ref so VueDraggable can mutate it directly.
// watchEffect keeps it in sync whenever tasks change externally.
const localList = ref([])
watchEffect(() => {
  localList.value = tasks.value
    .filter(t => t.scheduledDate === props.date)
    .sort((a, b) => a.position - b.position)
})

// Called after VueDraggable updates localList via v-model (reorder or cross-list drop).
function onListChange() {
  syncList(localList.value, props.date)
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
