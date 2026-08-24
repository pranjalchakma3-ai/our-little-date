export type Screen = 'proposal' | 'plan' | 'contribution' | 'reveal'

export type DatePlan = {
  date: string
  time: string
  place: string
  customPlace: string
  foods: string[]
  message: string
}

export const EMPTY_PLAN: DatePlan = {
  date: '',
  time: '',
  place: '',
  customPlace: '',
  foods: [],
  message: '',
}

export type PlannerErrors = Partial<Record<'date' | 'time' | 'place' | 'customPlace' | 'foods', string>>
