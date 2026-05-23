import { ref, watch } from 'vue'
import bgImage from '@/assets/bckgnd-image01.jpg'

const STORAGE_KEY = 'sorta_bg'

const selectedBg = ref(localStorage.getItem(STORAGE_KEY) || 'gradient')

function applyBackground(id) {
  const b = document.body
  b.style.backgroundImage = ''
  b.style.backgroundColor = ''
  b.style.backgroundSize = ''
  b.style.backgroundPosition = ''
  b.style.backgroundAttachment = ''

  if (id === 'solid') {
    b.style.background = '#343555'
  } else if (id === 'image') {
    b.style.backgroundImage = `url('${bgImage}')`
    b.style.backgroundSize = 'cover'
    b.style.backgroundPosition = 'center'
    b.style.backgroundAttachment = 'fixed'
  }
  // gradient: clearing inline styles lets the CSS gradient take over
}

applyBackground(selectedBg.value)

watch(selectedBg, (val) => {
  localStorage.setItem(STORAGE_KEY, val)
  applyBackground(val)
})

export function useBackground() {
  return { selectedBg }
}
