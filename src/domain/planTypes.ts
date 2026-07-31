export type PlanKind = 'common' | 'personal'
export type PlanPreset = 'one-year' | 'six-month' | 'ninety-days'
export type ReadingOrder = 'canonical' | 'old-new-parallel'
export type MissedDayPolicy = 'carry' | 'redistribute' | 'restart-today'
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type ChapterRef = Readonly<{
  bookId: string
  chapter: number
}>

export type PlanRange =
  | Readonly<{ type: 'all' | 'old' | 'new' }>
  | Readonly<{ type: 'books'; bookIds: readonly string[] }>

export type PlanRequest = Readonly<{
  id: string
  name: string
  kind: PlanKind
  startDate: string
  endDate: string
  weekdays: readonly Weekday[]
  range: PlanRange
  order: ReadingOrder
  missedDayPolicy: MissedDayPolicy
}>

export type PlanDay = Readonly<{
  date: string
  chapters: readonly ChapterRef[]
}>

export type ReadingPlan = Readonly<{
  request: PlanRequest
  schedule: readonly PlanDay[]
  createdAt: string
}>

export type PlanPreview = Readonly<{
  totalChapters: number
  readingDays: number
  averageChaptersPerDay: number
  firstSevenDays: readonly PlanDay[]
  lastScheduledDate: string
  hasHeavyDay: boolean
}>
