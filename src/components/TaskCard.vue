<template>
  <article
    class="task-card"
    :class="{ 'task-card--completed': displayCompleted }"
    :aria-label="`Task: ${task.title}${displayCompleted ? ' (completed)' : ''}`"
  >
    <div class="task-card__body">

      <!-- Complete toggle -->
      <button
        class="task-card__check-btn"
        :aria-label="displayCompleted ? 'Mark task incomplete' : 'Mark task complete'"
        @click.stop="emit('toggle-complete', task.id)"
      >
        <img
          v-if="displayCompleted"
          src="@/assets/check-solid.svg"
          alt=""
          aria-hidden="true"
        />
        <img
          v-else
          src="@/assets/check-outline.svg"
          alt=""
          aria-hidden="true"
        />
      </button>

      <div class="task-card__content">
        <h3 class="task-card__title">{{ task.title }}</h3>
        <p v-if="task.description" class="task-card__description">{{ task.description }}</p>

        <div class="task-card__footer">
          <span
            class="task-card__hours-badge"
            :aria-label="`${task.estimatedHours} hours estimated`"
          >
            {{ formatHours(task.estimatedHours) }}
          </span>
          <img
            v-if="task.remindAt && (task.repeat || !task.reminderDismissed)"
            src="@/assets/bell.svg"
            class="task-card__reminder-dot"
            aria-label="Reminder set"
            alt=""
          />
          <img
            v-if="task.repeat"
            src="@/assets/repeat.svg"
            class="task-card__repeat-icon"
            :aria-label="`Repeats ${task.repeat}`"
            alt=""
          />
        </div>
      </div>
    </div>

    <!-- Hover / focus actions -->
    <div class="task-card__actions" role="group" :aria-label="`Actions for ${task.title}`">
      <button
        class="task-card__action-btn"
        aria-label="Edit task"
        @click.stop="emit('edit', task)"
      >
        <img src="@/assets/edit.svg" alt="" aria-hidden="true" />
      </button>
      <button
        class="task-card__action-btn"
        aria-label="Delete task"
        @click.stop="emit('delete', task)"
      >
        <img src="@/assets/close.svg" alt="" aria-hidden="true" />
      </button>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  task: {
    type: Object,
    required: true,
  },
  // Overrides task.completed for repeating task context. Pass undefined to use task.completed.
  isCompleted: {
    type: Boolean,
    default: undefined,
  },
})

const emit = defineEmits(['toggle-complete', 'edit', 'delete'])

const displayCompleted = computed(() =>
  props.isCompleted !== undefined ? props.isCompleted : props.task.completed
)

function formatHours(h) {
  return `${Number(h).toFixed(2)} hrs`
}
</script>
