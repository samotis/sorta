import { ref, watch } from 'vue'

const BUDGET_KEY     = 'sorta_daily_budget'
const DEFAULT_BUDGET = 8

const _stored    = localStorage.getItem(BUDGET_KEY)
const dailyBudget = ref(_stored !== null ? parseFloat(_stored) : DEFAULT_BUDGET)

watch(dailyBudget, val => localStorage.setItem(BUDGET_KEY, String(val)))

export function useDailyBudget() {
  return { dailyBudget }
}
