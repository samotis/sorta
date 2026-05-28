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
          :aria-label="`${totalHours.toFixed(2)} of ${dailyBudget} hours scheduled`"
        >
          {{ totalHours.toFixed(2) }} / {{ Number(dailyBudget).toFixed(2) }}
        </span>
      </div>

      <p class="day-column__date">{{ shortDate }}</p>

      <div class="day-column__progress-bar" role="progressbar" :aria-valuenow="progressPct" aria-valuemin="0" aria-valuemax="100" :aria-label="`${progressPct}% of today's tasks complete`">
        <div class="day-column__progress-bar-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
    </header>

    <!-- Unified scroll area: repeating tasks + anchored draggable tasks -->
    <div class="day-column__scroll-area">

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

      <!-- Life section -->
      <template v-if="isLifeVisible">
        <button
          class="day-column__life-toggle"
          :aria-expanded="isLifeOpen.toString()"
          aria-controls="life-list"
          @click="toggleLifeOpen"
        >
          Life
          <span class="day-column__life-caret" :class="{ 'day-column__life-caret--open': isLifeOpen }" aria-hidden="true"></span>
        </button>

        <VueDraggable
          id="life-list"
          class="day-column__life-list"
          role="list"
          :aria-label="`Life tasks for ${dayName}`"
          v-show="isLifeOpen"
          v-model="localLifeList"
          group="tasks"
          ghost-class="task-card--ghost"
          drag-class="sortable-drag"
          :animation="150"
          @update="onLifeChange"
          @add="onLifeChange"
        >
          <div v-for="task in localLifeList" :key="task.id" role="listitem">
            <TaskCard
              :task="task"
              @toggle-complete="handleToggleComplete"
              @edit="openEditModal"
              @delete="requestDelete"
            />
          </div>
          <p v-if="localLifeList.length === 0" class="day-column__life-empty">
            Drag non-work tasks here.
          </p>
        </VueDraggable>
      </template>

    </div>

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
import { useLifeSection } from '@/composables/useLifeSection'
import { useDailyBudget } from '@/composables/useDailyBudget'
import TaskCard from './TaskCard.vue'
import TaskModal from './TaskModal.vue'

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
})

const { dailyBudget } = useDailyBudget()

const {
  tasks,
  toggleComplete,
  toggleCompleteOnDate,
  updateTask,
  syncList,
  syncLifeList,
  totalHoursForDate,
  completedHoursForDate,
} = useTasks()
const { isLifeOpen, isLifeVisible, toggleLifeOpen } = useLifeSection()
const { requestDelete } = useConfirmDelete()

const today     = todayString()
const isToday   = computed(() => props.date === today)
const dayName   = computed(() => formatDayName(props.date))
const shortDate = computed(() => formatShortDate(props.date))

// Expose date as a non-reactive alias for template use
const date = props.date

const totalHours     = computed(() => totalHoursForDate(props.date))
const completedHours = computed(() => completedHoursForDate(props.date))
const isOverBudget   = computed(() => totalHours.value > dailyBudget.value)
const progressPct    = computed(() => {
  if (totalHours.value === 0) return 0
  return Math.min(Math.round((completedHours.value / totalHours.value) * 100), 100)
})

// Non-repeating, non-life tasks anchored to this date — managed by VueDraggable
const localList = ref([])
watchEffect(() => {
  localList.value = tasks.value
    .filter(t => t.scheduledDate === props.date && !t.repeat && !t.isLife)
    .sort((a, b) => a.position - b.position)
})

// Life tasks anchored to this date — managed by VueDraggable in the Life section
const localLifeList = ref([])
watchEffect(() => {
  localLifeList.value = tasks.value
    .filter(t => t.scheduledDate === props.date && !t.repeat && t.isLife)
    .sort((a, b) => a.position - b.position)
})

// All repeating tasks that occur on this date — read-only display above the draggable list
const repeatingInstances = computed(() => {
  return tasks.value.filter(t => t.repeat && taskOccursOn(t, props.date))
})

function onListChange() {
  syncList(localList.value, props.date)
}

function onLifeChange() {
  syncLifeList(localLifeList.value, props.date)
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
