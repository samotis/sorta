<template>
  <main class="calendar" aria-label="Task calendar">

    <!-- Scroll container -->
    <div
      class="calendar__scroll-container"
      ref="scrollContainerRef"
      tabindex="0"
      aria-label="Day columns — scroll horizontally to navigate dates"
      @keydown.left.prevent="scrollBack"
      @keydown.right.prevent="scrollForward"
    >
      <DayColumn
        v-for="date in days"
        :key="date"
        :date="date"
        :ref="(el) => registerColumnRef(date, el?.$el ?? el)"
      />
    </div>

    <!-- Navigation controls -->
    <nav class="calendar__nav" aria-label="Calendar navigation">
      <button
        class="calendar__today-btn"
        @click="scrollToToday"
        aria-label="Jump to today"
      >
        TODAY
      </button>
      <button
        class="calendar__nav-btn"
        @click="scrollBack"
        aria-label="Previous day"
      >
        <img src="@/assets/arrow-left.svg" alt="" aria-hidden="true" />
      </button>
      <button
        class="calendar__nav-btn"
        @click="scrollForward"
        aria-label="Next day"
      >
        <img src="@/assets/arrow-right.svg" alt="" aria-hidden="true" />
      </button>
    </nav>

  </main>
</template>

<script setup>
import { onMounted } from 'vue'
import { useCalendar } from '@/composables/useCalendar'
import DayColumn from './DayColumn.vue'

const {
  days,
  scrollContainerRef,
  registerColumnRef,
  scrollToToday,
  scrollForward,
  scrollBack,
} = useCalendar()

onMounted(() => {
  scrollToToday()
})
</script>
