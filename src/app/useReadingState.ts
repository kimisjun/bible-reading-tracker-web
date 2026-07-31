import { useCallback, useMemo, useState } from 'react'
import {
  appendReadingEvent,
  undoReadingEvent,
  type ReadingEvent,
} from '../domain/reading'
import {
  createAppStateRepository,
  type StorageLike,
} from '../storage/repository'
import type { AppState } from '../storage/schema'

export type ReadingStateDependencies = Readonly<{
  createId: () => string
  now: () => string
}>

export type ReadingState = Readonly<{
  events: readonly ReadingEvent[]
  read: (bookId: string, chapter: number) => void
  change: (bookId: string, chapter: number, delta: 1 | -1) => void
  undo: (eventId: string) => void
}>

const browserDependencies: ReadingStateDependencies = {
  createId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
}

export function useReadingState(
  storage: StorageLike = window.localStorage,
  dependencies: ReadingStateDependencies = browserDependencies,
): ReadingState {
  const repository = useMemo(() => createAppStateRepository(storage), [storage])
  const [appState, setAppState] = useState<AppState>(() => repository.load())

  const persistEvents = useCallback(
    (createEvents: (current: readonly ReadingEvent[]) => readonly ReadingEvent[]) => {
      setAppState((current) => {
        const readingEvents = createEvents(current.readingEvents)
        const nextState: AppState = { ...current, readingEvents }
        repository.save(nextState)
        return nextState
      })
    },
    [repository],
  )

  const change = useCallback(
    (bookId: string, chapter: number, delta: 1 | -1) => {
      persistEvents((current) =>
        appendReadingEvent(current, {
          id: dependencies.createId(),
          bookId,
          chapter,
          delta,
          occurredAt: dependencies.now(),
        }),
      )
    },
    [dependencies, persistEvents],
  )

  const read = useCallback(
    (bookId: string, chapter: number) => change(bookId, chapter, 1),
    [change],
  )

  const undo = useCallback(
    (eventId: string) => {
      persistEvents((current) =>
        undoReadingEvent(
          current,
          eventId,
          dependencies.createId(),
          dependencies.now(),
        ),
      )
    },
    [dependencies, persistEvents],
  )

  return {
    events: appState.readingEvents,
    read,
    change,
    undo,
  }
}
