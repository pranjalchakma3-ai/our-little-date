import { useCallback, useState } from 'react'
import { EMPTY_PLAN, type DatePlan } from '../types'

const PLAN_KEY = 'our-little-date:plan'
const ACCEPTED_KEY = 'our-little-date:accepted'

function readPlan(): DatePlan {
  try {
    const saved = localStorage.getItem(PLAN_KEY)
    if (!saved) return EMPTY_PLAN
    const parsed = JSON.parse(saved) as Partial<DatePlan>
    return {
      ...EMPTY_PLAN,
      ...parsed,
      foods: Array.isArray(parsed.foods) ? parsed.foods : [],
    }
  } catch {
    return EMPTY_PLAN
  }
}

export function useLocalDatePlan() {
  const [plan, setPlanState] = useState<DatePlan>(readPlan)

  const setPlan = useCallback((next: DatePlan | ((current: DatePlan) => DatePlan)) => {
    setPlanState((current) => {
      const value = typeof next === 'function' ? next(current) : next
      try {
        localStorage.setItem(PLAN_KEY, JSON.stringify(value))
      } catch {
        // The form remains functional even when storage is unavailable.
      }
      return value
    })
  }, [])

  const acceptProposal = useCallback(() => {
    try {
      localStorage.setItem(ACCEPTED_KEY, 'true')
    } catch {
      // Acceptance still works without local storage.
    }
  }, [])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(PLAN_KEY)
      localStorage.removeItem(ACCEPTED_KEY)
    } catch {
      // State below still resets.
    }
    setPlanState(EMPTY_PLAN)
  }, [])

  return { plan, setPlan, acceptProposal, reset }
}
