<template>
  <article
    class="task-card"
    :class="{ 'task-card--completed': task.completed }"
    :aria-label="`Task: ${task.title}${task.completed ? ' (completed)' : ''}`"
  >
    <div class="task-card__body">

      <!-- Complete toggle -->
      <button
        class="task-card__check-btn"
        :aria-label="task.completed ? 'Mark task incomplete' : 'Mark task complete'"
        @click.stop="emit('toggle-complete', task.id)"
      >
        <img
          v-if="task.completed"
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
          <span
            v-if="task.remindAt && !task.reminderDismissed"
            class="task-card__reminder-dot"
            aria-label="Reminder set"
            role="img"
          ></span>
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
        @click.stop="emit('delete', task.id)"
      >
        <img src="@/assets/close.svg" alt="" aria-hidden="true" />
      </button>
    </div>
  </article>
</template>

<script setup>
defineProps({
  task: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['toggle-complete', 'edit', 'delete'])

function formatHours(h) {
  return `${Number(h).toFixed(2)} hrs`
}
</script>
