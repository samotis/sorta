<template>
  <Teleport to="body">
    <Transition>
      <div
        v-if="modelValue"
        class="settings-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        @click.self="close"
        @keydown.esc="close"
      >
        <div class="settings-modal" ref="modalEl">

          <header class="settings-modal__header">
            <h1 class="settings-modal__title" id="settings-title">Settings</h1>
            <button class="settings-modal__close-btn" aria-label="Close settings" @click="close">
              <img src="@/assets/close.svg" alt="" aria-hidden="true" />
            </button>
          </header>

          <!-- Background Options -->
          <section class="settings-modal__section" aria-labelledby="bg-options-label">
            <h2 class="settings-modal__section-label" id="bg-options-label">Background Options</h2>
            <div class="settings-modal__bg-options" role="group" aria-label="Choose a background">
              <button
                v-for="bg in backgrounds"
                :key="bg.id"
                class="settings-modal__bg-option"
                :class="{
                  'settings-modal__bg-option--selected': selectedBg === bg.id,
                  [`settings-modal__bg-option--${bg.id}`]: true
                }"
                :aria-label="bg.label"
                :aria-pressed="selectedBg === bg.id"
                @click="selectedBg = bg.id"
              >
                <img :src="bg.thumb" :alt="bg.label" />
              </button>
            </div>
          </section>

          <!-- Display Options -->
          <section class="settings-modal__section" aria-labelledby="display-options-label">
            <h2 class="settings-modal__section-label" id="display-options-label">Display Options</h2>

            <div class="settings-modal__data-row">
              <div>
                <p class="settings-modal__row-title">Work/Life balance</p>
                <p class="settings-modal__row-desc">Adds a collapsible Life section below each day's work items for personal tasks.</p>
              </div>
              <button
                class="settings-modal__toggle"
                :class="{ 'settings-modal__toggle--on': isLifeVisible }"
                :aria-pressed="isLifeVisible"
                aria-label="Toggle Life sections visibility"
                @click="toggleLifeVisible"
              >
                <span class="settings-modal__toggle-knob"></span>
              </button>
            </div>
          </section>

          <!-- Data Management -->
          <section class="settings-modal__section" aria-labelledby="data-mgmt-label">
            <h2 class="settings-modal__section-label" id="data-mgmt-label">Data Management</h2>

            <!-- Export -->
            <div class="settings-modal__data-row">
              <div>
                <p class="settings-modal__row-title">Export a snapshot of your current task lists.</p>
                <p class="settings-modal__row-desc">Tasks exported in .ics format.</p>
              </div>
              <button class="settings-modal__action-btn" @click="handleExport">
                Export Tasks
              </button>
            </div>

            <!-- Import -->
            <div class="settings-modal__data-row">
              <div>
                <p class="settings-modal__row-title">Import a previous set of tasks.</p>
                <p class="settings-modal__row-desc">Use an .ics file. This will add to, not overwrite your current tasks.</p>
              </div>
              <button class="settings-modal__action-btn" @click="triggerImport" :disabled="importing">
                {{ importing ? 'Importing…' : 'Import Tasks' }}
              </button>
              <input
                ref="fileInputRef"
                type="file"
                accept=".ics,text/calendar"
                class="settings-modal__file-input"
                @change="handleFileChange"
              />
            </div>

            <!-- Import feedback -->
            <p v-if="importMessage" class="settings-modal__import-message" :class="{ 'settings-modal__import-message--error': importError }" role="status">
              {{ importMessage }}
            </p>

            <!-- Delete -->
            <div class="settings-modal__data-row">
              <div>
                <p class="settings-modal__row-title">Delete all existing data.</p>
                <p class="settings-modal__row-desc">Caution. This will remove all tasks and settings.</p>
              </div>
              <button class="settings-modal__delete-btn" @click="requestDeleteAll">
                Delete Data
              </button>
            </div>

          </section>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useConfirmDeleteAll } from '@/composables/useConfirmDeleteAll'
import { useBackground } from '@/composables/useBackground'
import { useTasks } from '@/composables/useTasks'
import { useLifeSection } from '@/composables/useLifeSection'
import { downloadICS, importTasksFromICS } from '@/utils/ics'
import bckgndFadeThumb   from '@/assets/bckgnd-fade01-thumb.jpg'
import bckgndSolidThumb  from '@/assets/bckgnd-solid01-thumb.jpg'
import bckgndImageThumb  from '@/assets/bkgnd-image01-thumb.jpg'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const { requestDeleteAll } = useConfirmDeleteAll()
const { selectedBg } = useBackground()
const { tasks, importTasks } = useTasks()
const { isLifeVisible, toggleLifeVisible } = useLifeSection()

const modalEl    = ref(null)
const fileInputRef = ref(null)
const importing  = ref(false)
const importMessage = ref('')
const importError   = ref(false)

const backgrounds = [
  { id: 'gradient', label: 'Gradient background',      thumb: bckgndFadeThumb },
  { id: 'grainy',   label: 'Grainy gradient',           thumb: bckgndFadeThumb },
  { id: 'solid',    label: 'Solid background',          thumb: bckgndSolidThumb },
  { id: 'image',    label: 'Image background',          thumb: bckgndImageThumb },
]

function close() {
  emit('update:modelValue', false)
}

// ── Export ────────────────────────────────────────────────────────────────────

function handleExport() {
  downloadICS(tasks.value)
}

// ── Import ────────────────────────────────────────────────────────────────────

function triggerImport() {
  importMessage.value = ''
  fileInputRef.value?.click()
}

async function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return

  importing.value = true
  importMessage.value = ''
  importError.value = false

  try {
    const text = await file.text()
    const newTasks = importTasksFromICS(text, tasks.value)

    if (newTasks.length === 0) {
      importMessage.value = 'No new tasks found (duplicates were skipped).'
    } else {
      importTasks(newTasks)
      importMessage.value = `Imported ${newTasks.length} task${newTasks.length === 1 ? '' : 's'}.`
    }
  } catch (err) {
    importError.value = true
    importMessage.value = err.message || 'Import failed. Please check the file and try again.'
  } finally {
    importing.value = false
    e.target.value = ''
  }
}

watch(() => props.modelValue, async (val) => {
  if (val) {
    await nextTick()
    modalEl.value?.focus()
    importMessage.value = ''
    importError.value = false
  }
})
</script>
