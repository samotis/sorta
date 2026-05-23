import { ref, watch } from 'vue'
import bgImage from '@/assets/bckgnd-image01.jpg'

const STORAGE_KEY = 'sorta_bg'
const selectedBg = ref(localStorage.getItem(STORAGE_KEY) || 'gradient')

// Make the Vite-fingerprinted image URL available as a CSS custom property
document.documentElement.style.setProperty('--bg-image', `url('${bgImage}')`)

function applyBackground(id) {
  document.body.dataset.bg = id
}

applyBackground(selectedBg.value)

watch(selectedBg, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
  applyBackground(val)
})

export function useBackground() {
  return { selectedBg }
}
