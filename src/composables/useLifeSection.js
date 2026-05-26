import { ref, watch } from 'vue'

const LIFE_OPEN_KEY    = 'sorta_life_open'
const LIFE_VISIBLE_KEY = 'sorta_life_visible'

// ─── Shared singleton state ───────────────────────────────────────────────────
const _storedOpen    = localStorage.getItem(LIFE_OPEN_KEY)
const _storedVisible = localStorage.getItem(LIFE_VISIBLE_KEY)

const isLifeOpen    = ref(_storedOpen    === null ? true  : _storedOpen    === 'true')
const isLifeVisible = ref(_storedVisible === null ? false : _storedVisible === 'true')

watch(isLifeOpen,    val => localStorage.setItem(LIFE_OPEN_KEY,    val))
watch(isLifeVisible, val => localStorage.setItem(LIFE_VISIBLE_KEY, val))

// ─── Composable ───────────────────────────────────────────────────────────────
export function useLifeSection() {
  function toggleLifeOpen() {
    isLifeOpen.value = !isLifeOpen.value
  }

  function toggleLifeVisible() {
    isLifeVisible.value = !isLifeVisible.value
  }

  return { isLifeOpen, isLifeVisible, toggleLifeOpen, toggleLifeVisible }
}
