import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  appendReadingEvent,
  getReadingCount,
  undoReadingBatch,
  undoReadingEvent,
  type ReadingEvent,
} from '../domain/reading'
import type { ChapterRef } from '../domain/planTypes'
import {
  APP_STATE_STORAGE_KEY,
  createAppStateRepository,
  type StorageLike,
} from '../storage/repository'
import { createDefaultAppState, type AppState } from '../storage/schema'

export type ReadingStateDependencies = Readonly<{
  createId: () => string
  now: () => string
}>

export type ReadingState = Readonly<{
  events: readonly ReadingEvent[]
  error: Error | null
  read: (bookId: string, chapter: number) => boolean
  readBatch: (planId: string, chapters: readonly ChapterRef[]) => boolean
  change: (bookId: string, chapter: number, delta: 1 | -1) => boolean
  undo: (eventId: string) => boolean
  undoBatch: (batchId: string) => boolean
}>

const browserDependencies: ReadingStateDependencies = {
  createId: () => {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID()
    }
    return `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  },
  now: () => new Date().toISOString(),
}

function asError(value: unknown): Error {
  if (value instanceof Error) return value
  if (
    typeof value === 'object' && value !== null &&
    'message' in value && typeof value.message === 'string'
  ) {
    const error = new Error(value.message)
    if ('name' in value && typeof value.name === 'string') error.name = value.name
    return error
  }
  return new Error(String(value))
}

export function useReadingState(
  storage: StorageLike = window.localStorage,
  dependencies: ReadingStateDependencies = browserDependencies,
): ReadingState {
  const repository = useMemo(() => createAppStateRepository(storage), [storage])
  const [initial] = useState(() => {
    try {
      return { appState: repository.load(), error: null }
    } catch (cause) {
      return { appState: createDefaultAppState(), error: asError(cause) }
    }
  })
  const [appState, setAppState] = useState<AppState>(initial.appState)
  const [error, setError] = useState<Error | null>(initial.error)

  useEffect(() => {
    if (storage !== window.localStorage) return

    const reloadFromAnotherTab = (event: StorageEvent) => {
      if (
        (event.key === null || event.key === APP_STATE_STORAGE_KEY) &&
        (event.storageArea === null || event.storageArea === window.localStorage)
      ) {
        try {
          setAppState(repository.load())
          setError(null)
        } catch (cause) {
          setError(asError(cause))
        }
      }
    }
    window.addEventListener('storage', reloadFromAnotherTab)
    return () => window.removeEventListener('storage', reloadFromAnotherTab)
  }, [repository, storage])

  const persistEvents = useCallback(
    (createEvents: (current: readonly ReadingEvent[]) => readonly ReadingEvent[]): boolean => {
      let current: AppState
      try {
        current = repository.load()
      } catch (cause) {
        setError(asError(cause))
        return false
      }
      const readingEvents = createEvents(current.readingEvents)
      if (readingEvents === current.readingEvents) {
        setAppState(current)
        setError(null)
        return false
      }
      const nextState: AppState = { ...current, readingEvents }
      try {
        repository.save(nextState)
      } catch (cause) {
        setError(asError(cause))
        return false
      }
      setAppState(nextState)
      setError(null)
      return true
    },
    [repository],
  )

  const change = useCallback(
    (bookId: string, chapter: number, delta: 1 | -1) => {
      const id = dependencies.createId()
      const occurredAt = dependencies.now()
      return persistEvents((current) =>
        appendReadingEvent(current, {
          id,
          bookId,
          chapter,
          delta,
          occurredAt,
        }),
      )
    },
    [dependencies, persistEvents],
  )

  const read = useCallback(
    (bookId: string, chapter: number) => change(bookId, chapter, 1),
    [change],
  )

  const readBatch = useCallback(
    (planId: string, chapters: readonly ChapterRef[]) => {
      if (typeof planId !== 'string' || planId.trim().length === 0) {
        setError(new Error('계획 소유자 ID가 필요합니다.'))
        return false
      }
      if (
        !Array.isArray(chapters) ||
        chapters.some((chapter) =>
          typeof chapter !== 'object' ||
          chapter === null ||
          typeof chapter.bookId !== 'string' ||
          chapter.bookId.trim().length === 0 ||
          !Number.isInteger(chapter.chapter) ||
          chapter.chapter < 1)
      ) {
        setError(new Error('계획 완료 장 정보가 올바르지 않습니다.'))
        return false
      }
      return persistEvents((current) => {
        const seen = new Set<string>()
        const incomplete = chapters.filter((chapter) => {
          const key = `${chapter.bookId}:${chapter.chapter}`
          if (seen.has(key) || getReadingCount(current, chapter.bookId, chapter.chapter) > 0) {
            return false
          }
          seen.add(key)
          return true
        })
        if (incomplete.length === 0) return current
        const batchId = `plan:${planId}:${dependencies.createId()}`
        const occurredAt = dependencies.now()
        return incomplete.reduce<readonly ReadingEvent[]>(
          (events, chapter) => appendReadingEvent(events, {
            id: dependencies.createId(),
            bookId: chapter.bookId,
            chapter: chapter.chapter,
            delta: 1,
            occurredAt,
            batchId,
          }),
          current,
        )
      })
    },
    [dependencies, persistEvents],
  )

  const undo = useCallback(
    (eventId: string) => {
      const undoEventId = dependencies.createId()
      const occurredAt = dependencies.now()
      return persistEvents((current) =>
        undoReadingEvent(
          current,
          eventId,
          undoEventId,
          occurredAt,
        ),
      )
    },
    [dependencies, persistEvents],
  )

  const undoBatch = useCallback(
    (batchId: string) => {
      const undoIdPrefix = dependencies.createId()
      const occurredAt = dependencies.now()
      return persistEvents((current) => undoReadingBatch(
        current,
        batchId,
        undoIdPrefix,
        occurredAt,
      ))
    },
    [dependencies, persistEvents],
  )

  return {
    events: appState.readingEvents,
    error,
    read,
    readBatch,
    change,
    undo,
    undoBatch,
  }
}
