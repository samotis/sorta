<template>
  <Teleport to="body">
    <Transition>
      <div
        v-if="modelValue"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="modalTitleId"
        @click.self="handleClose"
        @keydown.esc="handleClose"
      >
        <div class="modal" ref="modalEl">
          <div class="modal__header">
            <h2 class="modal__title" :id="modalTitleId">
              {{ isEditing ? 'Edit Task' : 'Task Details' }}
            </h2>
            <button class="modal__close-btn" aria-label="Close modal" @click="handleClose">
              <img src="@/assets/close.svg" alt="" aria-hidden="true" />
            </button>
          </div>

          <form class="modal__body" @submit.prevent="handleSave" novalidate>

            <!-- Title -->
            <div class="modal__field">
              <label class="modal__label" :for="fieldId('title')">Title</label>
              <input
                :id="fieldId('title')"
                v-model.trim="form.title"
                class="modal__input"
                :class="{ 'modal__input--error': errors.title }"
                type="text"
                placeholder="What needs to be done?"
                autocomplete="off"
                maxlength="200"
                ref="titleInputRef"
              />
              <span v-if="errors.title" class="modal__error" role="alert">{{ errors.title }}</span>
            </div>

            <!-- Description -->
            <div class="modal__field">
              <label class="modal__label" :for="fieldId('description')">Description</label>
              <textarea
                :id="fieldId('description')"
                v-model="form.description"
                class="modal__textarea"
                placeholder="Add any notes or context…"
                maxlength="2000"
                rows="4"
              ></textarea>
            </div>

            <!-- Estimated time -->
            <div class="modal__field">
              <label class="modal__label" :for="fieldId('hours')">Estimated time</label>
              <div class="modal__select-wrapper">
                <select
                  :id="fieldId('hours')"
                  v-model="form.estimatedHours"
                  class="modal__select"
                >
                  <option v-for="opt in hourOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Remind Me -->
            <div class="modal__field">
              <label class="modal__remind-toggle">
                <input
                  type="checkbox"
                  v-model="form.hasReminder"
                  :aria-expanded="form.hasReminder"
                  :aria-controls="fieldId('remind-fields')"
                />
                <span>Remind Me</span>
              </label>

              <div
                v-if="form.hasReminder"
                class="modal__reminder-fields"
                :id="fieldId('remind-fields')"
              >
                <div class="modal__field">
                  <label class="modal__label" :for="fieldId('remind-date')">Date</label>
                  <input
                    :id="fieldId('remind-date')"
                    v-model="form.remindDate"
                    class="modal__input"
                    :class="{ 'modal__input--error': errors.remindDate }"
                    type="date"
                    :min="todayStr"
                  />
                  <span v-if="errors.remindDate" class="modal__error" role="alert">{{ errors.remindDate }}</span>
                </div>
                <div class="modal__field">
                  <label class="modal__label" :for="fieldId('remind-time')">Time</label>
                  <div class="modal__select-wrapper">
                    <select
                      :id="fieldId('remind-time')"
                      v-model="form.remindTime"
                      class="modal__select"
                    >
                      <option v-for="t in timeOptions" :key="t.value" :value="t.value">
                        {{ t.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="modal__actions">
              <button type="submit" class="modal__save-btn">Save</button>
              <button type="button" class="modal__cancel-btn" @click="handleClose">Cancel</button>
            </div>

          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { todayString } from '@/composables/useCalendar'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  // Pass a task object to edit, or null to create a new task
  task: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'save'])

// ── IDs for accessibility ─────────────────────────────────────────────────────
const uid = Math.random().toString(36).slice(2, 7)
const modalTitleId = `modal-title-${uid}`
function fieldId(name) { return `field-${uid}-${name}` }

// ── Refs ──────────────────────────────────────────────────────────────────────
const modalEl      = ref(null)
const titleInputRef = ref(null)
const todayStr     = todayString()

const isEditing = computed(() => !!props.task)

// ── Hour options ──────────────────────────────────────────────────────────────
const hourOptions = [
  { value: 0.25, label: '0.25 hrs' },
  { value: 0.50, label: '0.50 hrs' },
  { value: 0.75, label: '0.75 hrs' },
  { value: 1.00, label: '1.00 hrs' },
  { value: 1.25, label: '1.25 hrs' },
  { value: 1.50, label: '1.50 hrs' },
  { value: 1.75, label: '1.75 hrs' },
  { value: 2.00, label: '2.00 hrs' },
  { value: 2.50, label: '2.50 hrs' },
  { value: 3.00, label: '3.00 hrs' },
  { value: 3.50, label: '3.50 hrs' },
  { value: 4.00, label: '4.00 hrs' },
  { value: 5.00, label: '5.00 hrs' },
  { value: 6.00, label: '6.00 hrs' },
  { value: 7.00, label: '7.00 hrs' },
  { value: 8.00, label: '8.00 hrs' },
]

// ── Time options (every 15 min, 7:00am – 7:00pm) ─────────────────────────────
const timeOptions = (() => {
  const opts = []
  for (let h = 7; h <= 19; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 19 && m > 0) break
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const value = `${hh}:${mm}`
      const period = h < 12 ? 'am' : 'pm'
      const displayH = h > 12 ? h - 12 : h
      const label = `${displayH}:${mm}${period}`
      opts.push({ value, label })
    }
  }
  return opts
})()

// ── Form state ────────────────────────────────────────────────────────────────
const defaultForm = () => ({
  title:          '',
  description:    '',
  estimatedHours: 1.00,
  hasReminder:    false,
  remindDate:     todayString(),
  remindTime:     '09:00',
})

const form   = reactive(defaultForm())
const errors = reactive({ title: '', remindDate: '' })

function populateForm(task) {
  form.title          = task?.title          ?? ''
  form.description    = task?.description    ?? ''
  form.estimatedHours = task?.estimatedHours ?? 1.00
  form.hasReminder    = !!task?.remindAt
  if (task?.remindAt) {
    const d = new Date(task.remindAt)
    form.remindDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    form.remindTime = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  } else {
    form.remindDate = todayString()
    form.remindTime = '09:00'
  }
  errors.title = ''
  errors.remindDate = ''
}

// Re-populate when the modal opens or the task prop changes
watch(() => props.modelValue, (open) => {
  if (open) {
    populateForm(props.task)
    nextTick(() => titleInputRef.value?.focus())
  }
})

watch(() => props.task, (task) => {
  if (props.modelValue) populateForm(task)
})

// ── Validation ────────────────────────────────────────────────────────────────
function validate() {
  errors.title = ''
  errors.remindDate = ''
  let valid = true

  if (!form.title.trim()) {
    errors.title = 'A title is required.'
    valid = false
  }

  if (form.hasReminder && !form.remindDate) {
    errors.remindDate = 'Please choose a reminder date.'
    valid = false
  }

  return valid
}

// ── Save ──────────────────────────────────────────────────────────────────────
function handleSave() {
  if (!validate()) return

  let remindAt = null
  if (form.hasReminder && form.remindDate) {
    remindAt = new Date(`${form.remindDate}T${form.remindTime}:00`).toISOString()
  }

  emit('save', {
    title:          form.title,
    description:    form.description,
    estimatedHours: form.estimatedHours,
    remindAt,
    // Reset dismissed flag if the reminder was changed
    reminderDismissed: false,
  })

  handleClose()
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>
