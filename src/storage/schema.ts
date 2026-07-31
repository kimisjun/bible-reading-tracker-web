import type { ReadingPlan } from '../domain/planTypes'
import type { ReadingEvent } from '../domain/reading'

export type AppSettings = Readonly<{
  theme: 'light' | 'dark'
  readerName: string
  reminder: Readonly<Record<string, unknown>> | null
}>

export type AppState = Readonly<{
  schemaVersion: 1
  readingEvents: readonly ReadingEvent[]
  commonPlan: ReadingPlan | null
  personalPlan: ReadingPlan | null
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
