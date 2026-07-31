import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PlanKind, ReadingPlan } from '../domain/planTypes'
import {
  APP_STATE_STORAGE_KEY,
  createAppStateRepository,
  type StorageLike,
} from '../storage/repository'
import { createDefaultAppState, type AppState } from '../storage/schema'

export type PlanState = Readonly<{
  commonPlan: ReadingPlan | null
  personalPlan: ReadingPlan | null
  error: Error | null
  savePlan: (kind: PlanKind, plan: ReadingPlan) => void
  removePlan: (kind: PlanKind) => void
}>

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

export function usePlanState(storage: StorageLike = window.localStorage): PlanState {
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
        (event.key !== null && event.key !== APP_STATE_STORAGE_KEY) ||
        (event.storageArea !== null && event.storageArea !== window.localStorage)
      ) {
        return
      }
      try {
        setAppState(repository.load())
        setError(null)
      } catch (cause) {
        setError(asError(cause))
      }
    }
    window.addEventListener('storage', reloadFromAnotherTab)
    return () => window.removeEventListener('storage', reloadFromAnotherTab)
  }, [repository, storage])

  const persistPlan = useCallback((kind: PlanKind, plan: ReadingPlan | null) => {
    let current: AppState
    try {
      current = repository.load()
    } catch (cause) {
      setError(asError(cause))
      return
    }
    const nextState: AppState = kind === 'common'
      ? { ...current, commonPlan: plan }
      : { ...current, personalPlan: plan }
    try {
      repository.save(nextState)
      setAppState(repository.load())
    } catch (cause) {
      setError(asError(cause))
      return
    }
    setError(null)
  }, [repository])

  const savePlan = useCallback(
    (kind: PlanKind, plan: ReadingPlan) => persistPlan(kind, plan),
    [persistPlan],
  )
  const removePlan = useCallback(
    (kind: PlanKind) => persistPlan(kind, null),
    [persistPlan],
  )

  return {
    commonPlan: appState.commonPlan,
    personalPlan: appState.personalPlan,
    error,
    savePlan,
    removePlan,
  }
}
