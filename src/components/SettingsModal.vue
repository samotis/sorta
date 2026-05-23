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
                :class="{ 'settings-modal__bg-option--selected': selectedBg === bg.id }"
                :aria-label="bg.label"
                :aria-pressed="selectedBg === bg.id"
                @click="selectedBg = bg.id"
              >
                <img :src="bg.thumb" :alt="bg.label" />
              </button>
            </div>
          </section>

          <!-- Data Management -->
          <section class="settings-modal__section" aria-labelledby="data-mgmt-label">
            <h2 class="settings-modal__section-label" id="data-mgmt-label">Data Management</h2>
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

const modalEl = ref(null)

const backgrounds = [
  { id: 'gradient', label: 'Gradient background', thumb: bckgndFadeThumb },
  { id: 'solid',    label: 'Solid background',    thumb: bckgndSolidThumb },
  { id: 'image',    label: 'Image background',    thumb: bckgndImageThumb },
]

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, async (val) => {
  if (val) {
    await nextTick()
    modalEl.value?.focus()
  }
})
</script>
