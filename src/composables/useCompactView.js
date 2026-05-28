import { ref, watch } from 'vue'

const COMPACT_KEY = 'sorta_compact_view'
const isCompact = ref(localStorage.getItem(COMPACT_KEY) === 'true')

if (isCompact.value) document.body.classList.add('compact-view')

watch(isCompact, val => {
  localStorage.setItem(COMPACT_KEY, String(val))
  document.body.classList.toggle('compact-view', val)
})

export function useCompactView() {
  return { isCompact }
}
