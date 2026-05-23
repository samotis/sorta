<template>
  <AppSidebar />
  <CalendarView />
  <ReminderDialog />
  <ConfirmDeleteDialog />
  <ConfirmDeleteAllDialog />
</template>

<script setup>
import AppSidebar from '@/components/AppSidebar.vue'
import CalendarView from '@/components/CalendarView.vue'
import ReminderDialog from '@/components/ReminderDialog.vue'
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog.vue'
import ConfirmDeleteAllDialog from '@/components/ConfirmDeleteAllDialog.vue'
</script>
