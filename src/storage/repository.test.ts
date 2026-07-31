import {
  APP_STATE_STORAGE_KEY,
  createAppStateRepository,
  type StorageLike,
} from './repository'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

describe('AppStateRepository', () => {
  it('주입된 저장소가 비어 있으면 기본 상태를 반환한다', () => {
    const repository = createAppStateRepository(new MemoryStorage())

    expect(repository.load()).toEqual({
      schemaVersion: 1,
      readingEvents: [],
      commonPlan: null,
      personalPlan: null,
      settings: {
        theme: 'light',
        readerName: '',
        reminder: null,
      },
    })
  })

  it('상태를 저장하면 새 repository에서도 다시 불러온다', () => {
    const storage = new MemoryStorage()
    const repository = createAppStateRepository(storage)
    const state = repository.load()
    const savedState = {
      ...state,
      readingEvents: [
        {
          id: 'event-1',
          bookId: 'genesis',
          chapter: 1,
          delta: 1 as const,
          occurredAt: '2026-07-31T01:00:00.000Z',
        },
      ],
      settings: { ...state.settings, readerName: '은혜' },
    }

    repository.save(savedState)

    expect(createAppStateRepository(storage).load()).toEqual(savedState)
  })

  it('손상된 JSON이면 복구 방법을 알 수 있는 구체적 오류를 던진다', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_STATE_STORAGE_KEY, '{broken')

    expect(() => createAppStateRepository(storage).load()).toThrow(
      '저장된 앱 데이터를 읽을 수 없습니다. JSON이 손상되었습니다. 백업을 복원하거나 저장 데이터를 초기화하세요.',
    )
  })

  it('지원하지 않는 미래 schemaVersion을 거부한다', () => {
    const storage = new MemoryStorage()
    storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({ schemaVersion: 2 }))

    expect(() => createAppStateRepository(storage).load()).toThrow(
      '지원하지 않는 저장 데이터 버전입니다: 2 (현재 지원 버전: 1).',
    )
  })

  it('schemaVersion 1이어도 필수 데이터 구조가 잘못되면 거부한다', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, readingEvents: 'not-an-array' }),
    )

    expect(() => createAppStateRepository(storage).load()).toThrow(
      '저장된 앱 데이터 형식이 올바르지 않습니다.',
    )
  })

  it('버전 없는 정적 프로토타입은 확실한 readingEvents만 보존해 v1으로 마이그레이션한다', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        readingEvents: [
          {
            id: 'legacy-event-1',
            bookId: 'genesis',
            chapter: 1,
            delta: 1,
            occurredAt: '2026-07-31T01:00:00.000Z',
            prototypeOnly: true,
          },
          {
            id: 'invalid-date-event',
            bookId: 'genesis',
            chapter: 3,
            delta: 1,
            occurredAt: '1',
          },
          {
            id: 'invalid-event',
            bookId: 'genesis',
            chapter: '2',
            delta: 1,
            occurredAt: '어제',
          },
        ],
        commonPlan: { unsafe: true },
        settings: { theme: 'prototype-dark', readerName: 'legacy' },
      }),
    )

    expect(createAppStateRepository(storage).load()).toEqual({
      schemaVersion: 1,
      readingEvents: [
        {
          id: 'legacy-event-1',
          bookId: 'genesis',
          chapter: 1,
          delta: 1,
          occurredAt: '2026-07-31T01:00:00.000Z',
        },
      ],
      commonPlan: null,
      personalPlan: null,
      settings: { theme: 'light', readerName: '', reminder: null },
    })
  })
})
