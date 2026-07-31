import {
  APP_STATE_STORAGE_KEY,
  createAppStateRepository,
  type StorageLike,
} from './repository'
import { InvalidStorageDataError, migrateToCurrentSchema } from './migrations'
import type { AppState } from './schema'

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

  it('런타임 검증에 실패한 상태는 기존 저장값을 덮지 않고 거부한다', () => {
    const storage = new MemoryStorage()
    const repository = createAppStateRepository(storage)
    const existingState = repository.load()
    repository.save(existingState)
    const existingSerialized = storage.getItem(APP_STATE_STORAGE_KEY)
    const invalidState = {
      ...existingState,
      readingEvents: [
        {
          id: 'invalid-save',
          bookId: 'genesis',
          chapter: 51,
          delta: 1,
          occurredAt: '2026-07-31T01:00:00.000Z',
        },
      ],
    } as unknown as AppState

    expect(() => repository.save(invalidState)).toThrowError(InvalidStorageDataError)
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(existingSerialized)
  })

  it('save에는 현재 v1 상태만 허용하고 레거시나 미래 버전은 InvalidStorageDataError로 거부한다', () => {
    const repository = createAppStateRepository(new MemoryStorage())

    for (const invalidState of [{ readingEvents: [] }, { schemaVersion: 2 }]) {
      expect(() => repository.save(invalidState as unknown as AppState)).toThrowError(
        InvalidStorageDataError,
      )
    }
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

  it('존재하지 않는 ISO 달력 날짜가 포함된 이벤트를 거부한다', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        readingEvents: [
          {
            id: 'invalid-calendar-date',
            bookId: 'genesis',
            chapter: 1,
            delta: 1,
            occurredAt: '2026-02-30T01:00:00.000Z',
          },
        ],
        commonPlan: null,
        personalPlan: null,
        settings: { theme: 'light', readerName: '', reminder: null },
      }),
    )

    expect(() => createAppStateRepository(storage).load()).toThrow(
      '저장된 앱 데이터 형식이 올바르지 않습니다.',
    )
  })

  it('timezone offset이 포함된 실제 ISO 날짜는 허용한다', () => {
    const storage = new MemoryStorage()
    const state = {
      schemaVersion: 1 as const,
      readingEvents: [
        {
          id: 'offset-date',
          bookId: 'genesis',
          chapter: 1,
          delta: 1 as const,
          occurredAt: '2026-02-28T23:30:00+09:00',
        },
      ],
      commonPlan: null,
      personalPlan: null,
      settings: { theme: 'light' as const, readerName: '', reminder: null },
    }

    storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(state))

    expect(createAppStateRepository(storage).load()).toEqual(state)
  })

  it.each([
    ['알 수 없는 책', 'unknown-book', 1],
    ['책의 장 범위를 넘는 장', 'genesis', 51],
    ['정수가 아닌 장', 'genesis', 1.5],
  ])('%s이 포함된 이벤트를 거부한다', (_label, bookId, chapter) => {
    const storage = new MemoryStorage()
    storage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        readingEvents: [
          {
            id: 'invalid-book-or-chapter',
            bookId,
            chapter,
            delta: 1,
            occurredAt: '2026-07-31T01:00:00.000Z',
          },
        ],
        commonPlan: null,
        personalPlan: null,
        settings: { theme: 'light', readerName: '', reminder: null },
      }),
    )

    expect(() => createAppStateRepository(storage).load()).toThrow(
      '저장된 앱 데이터 형식이 올바르지 않습니다.',
    )
  })

  it.each([null, [], 42, {}, { arbitrary: true }])(
    '명확한 저장 데이터 시그니처가 없는 %j 값을 거부한다',
    (storedValue) => {
      const storage = new MemoryStorage()
      storage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(storedValue))

      expect(() => createAppStateRepository(storage).load()).toThrowError(
        InvalidStorageDataError,
      )
    },
  )

  it('현재 v1 상태를 검증된 새 객체로 재구성하고 여분 필드와 원본 참조를 제거한다', () => {
    const source = {
      schemaVersion: 1,
      readingEvents: [
        {
          id: 'event-with-extra',
          bookId: 'genesis',
          chapter: 1,
          delta: 1,
          occurredAt: '2026-07-31T01:00:00.000Z',
          extraEventField: true,
        },
      ],
      commonPlan: { name: '공통 계획' },
      personalPlan: null,
      settings: {
        theme: 'light',
        readerName: '은혜',
        reminder: { hour: 7 },
        extraSettingsField: true,
      },
      extraTopLevelField: true,
    }

    const result = migrateToCurrentSchema(source)

    expect(result).toEqual({
      schemaVersion: 1,
      readingEvents: [
        {
          id: 'event-with-extra',
          bookId: 'genesis',
          chapter: 1,
          delta: 1,
          occurredAt: '2026-07-31T01:00:00.000Z',
        },
      ],
      commonPlan: { name: '공통 계획' },
      personalPlan: null,
      settings: {
        theme: 'light',
        readerName: '은혜',
        reminder: { hour: 7 },
      },
    })
    expect(result).not.toBe(source)
    expect(result.readingEvents).not.toBe(source.readingEvents)
    expect(result.readingEvents[0]).not.toBe(source.readingEvents[0])
    expect(result.commonPlan).not.toBe(source.commonPlan)
    expect(result.settings).not.toBe(source.settings)
    expect(result.settings.reminder).not.toBe(source.settings.reminder)
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

  it.each([
    ['중복 이벤트 ID', [event('same', 'genesis', 1, 1), event('same', 'genesis', 2, 1)]],
    ['고아 취소 참조', [{ ...event('undo', 'genesis', 1, 1), undoneEventId: 'missing' }]],
    ['취소 대상 장 불일치', [
      event('read-1', 'genesis', 1, 1),
      event('read-2', 'genesis', 2, 1),
      { ...event('undo-1', 'genesis', 2, -1), undoneEventId: 'read-1' },
    ]],
    ['누적 음수', [event('negative', 'genesis', 1, -1)]],
  ])('%s 이벤트열을 거부한다', (_label, readingEvents) => {
    const repository = createAppStateRepository(new MemoryStorage())
    const state = {
      schemaVersion: 1,
      readingEvents,
      commonPlan: null,
      personalPlan: null,
      settings: { theme: 'light', readerName: '', reminder: null },
    } as AppState

    expect(() => repository.save(state)).toThrowError(InvalidStorageDataError)
  })
})

function event(
  id: string,
  bookId: string,
  chapter: number,
  delta: 1 | -1,
) {
  return {
    id,
    bookId,
    chapter,
    delta,
    occurredAt: '2026-07-31T01:00:00.000Z',
  }
}
