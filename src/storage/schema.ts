import type { ReadingEvent } from '../domain/reading'

export type PlanState = Readonly<Record<string, unknown>>

export type AppSettings = Readonly<{
  theme: 'light' | 'dark'
  readerName: string
  reminder: Readonly<Record<string, unknown>> | null
}>

export type AppState = Readonly<{
  schemaVersion: 1
  readingEvents: readonly ReadingEvent[]
  commonPlan: PlanState | null
  personalPlan: PlanState | null
  settings: AppSettings
}>

export function createDefaultAppState(): AppState {
  return {
    schemaVersion: 1,
    readingEvents: [],
    commonPlan: null,
    personalPlan: null,
    settings: {
      theme: 'light',
      readerName: '',
      reminder: null,
    },
  }
}
