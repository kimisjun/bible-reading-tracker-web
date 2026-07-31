import { migrateToCurrentSchema } from './migrations'
import { createDefaultAppState, type AppState } from './schema'

export const APP_STATE_STORAGE_KEY = 'bible-reading-tracker:app-state'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface AppStateRepository {
  load(): AppState
  save(state: AppState): void
}

export class CorruptStorageDataError extends Error {
  constructor(options?: ErrorOptions) {
    super(
      '저장된 앱 데이터를 읽을 수 없습니다. JSON이 손상되었습니다. 백업을 복원하거나 저장 데이터를 초기화하세요.',
      options,
    )
    this.name = 'CorruptStorageDataError'
  }
}

function parseStoredState(serialized: string): AppState {
  let parsed: unknown
  try {
    parsed = JSON.parse(serialized) as unknown
  } catch (cause) {
    throw new CorruptStorageDataError({ cause })
  }

  return migrateToCurrentSchema(parsed)
}

export function createAppStateRepository(storage: StorageLike): AppStateRepository {
  return {
    load: () => {
      const serialized = storage.getItem(APP_STATE_STORAGE_KEY)
      return serialized === null ? createDefaultAppState() : parseStoredState(serialized)
    },
    save: (state) => storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state)),
  }
}
