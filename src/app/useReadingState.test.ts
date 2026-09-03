import { act, renderHook } from '@testing-library/react'
import { createElement, StrictMode, type ReactNode } from 'react'
import { APP_STATE_STORAGE_KEY, type StorageLike } from '../storage/repository'
import { useReadingState } from './useReadingState'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class FailingSaveStorage extends MemoryStorage {
  failSave = false

  override setItem(key: string, value: string): void {
    if (this.failSave) throw new DOMException('저장 공간이 부족합니다.', 'QuotaExceededError')
    super.setItem(key, value)
  }
}

function sequential(values: readonly string[]) {
  let index = 0
  return () => values[index++] ?? values.at(-1) ?? ''
}

describe('useReadingState', () => {
  it('StrictMode에서도 한 번의 읽기 동작마다 ID, 시각, 저장을 한 번만 수행한다', () => {
    const storage = new MemoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    const dependencies = {
      createId: vi.fn(() => 'strict-event'),
      now: vi.fn(() => '2026-07-31T04:00:00.000Z'),
    }
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children)
    const { result } = renderHook(() => useReadingState(storage, dependencies), { wrapper })

    act(() => result.current.read('genesis', 1))

    expect(dependencies.createId).toHaveBeenCalledOnce()
    expect(dependencies.now).toHaveBeenCalledOnce()
    expect(setItem).toHaveBeenCalledOnce()
  })

  it('읽었어요를 누르면 이벤트를 추가하고 같은 저장소에서 다시 불러온다', () => {
    const storage = new MemoryStorage()
    const dependencies = {
      createId: () => 'event-1',
      now: () => '2026-07-31T04:00:00.000Z',
    }
    const first = renderHook(() => useReadingState(storage, dependencies))

    act(() => first.result.current.read('genesis', 1))

    expect(first.result.current.events).toEqual([
      {
        id: 'event-1',
        bookId: 'genesis',
        chapter: 1,
        delta: 1,
        occurredAt: '2026-07-31T04:00:00.000Z',
      },
    ])
    first.unmount()

    const restored = renderHook(() => useReadingState(storage, dependencies))
    expect(restored.result.current.events).toHaveLength(1)
  })

  it('계획 전체 완료는 여러 장을 하나의 batch ID와 한 번의 저장으로 기록한다', () => {
    const storage = new MemoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    const dependencies = {
      createId: vi.fn(sequential(['batch-token', 'batch-event-1', 'batch-event-2'])),
      now: vi.fn(() => '2026-08-01T06:00:00.000Z'),
    }
    const { result } = renderHook(() => useReadingState(storage, dependencies))

    act(() => result.current.readBatch('common-plan', [
      { bookId: 'genesis', chapter: 1 },
      { bookId: 'genesis', chapter: 2 },
    ]))

    expect(result.current.events).toEqual([
      expect.objectContaining({
        id: 'batch-event-1',
        bookId: 'genesis',
        chapter: 1,
        delta: 1,
        occurredAt: '2026-08-01T06:00:00.000Z',
        batchId: 'plan:common-plan:batch-token',
      }),
      expect.objectContaining({
        id: 'batch-event-2',
        bookId: 'genesis',
        chapter: 2,
        delta: 1,
        occurredAt: '2026-08-01T06:00:00.000Z',
        batchId: 'plan:common-plan:batch-token',
      }),
    ])
    expect(dependencies.createId).toHaveBeenCalledTimes(3)
    expect(dependencies.now).toHaveBeenCalledOnce()
    expect(setItem).toHaveBeenCalledOnce()
  })

  it('계획 전체 완료는 최신 저장 상태의 완료 장과 중복 입력을 다시 기록하지 않는다', () => {
    const storage = new MemoryStorage()
    const dependencies = {
      createId: sequential(['existing-event', 'batch-token', 'batch-event-2']),
      now: sequential(['2026-08-01T05:00:00.000Z', '2026-08-01T06:00:00.000Z']),
    }
    const { result } = renderHook(() => useReadingState(storage, dependencies))
    act(() => result.current.read('genesis', 1))

    act(() => result.current.readBatch('common-plan', [
      { bookId: 'genesis', chapter: 1 },
      { bookId: 'genesis', chapter: 1 },
      { bookId: 'genesis', chapter: 2 },
      { bookId: 'genesis', chapter: 2 },
    ]))

    expect(result.current.events).toHaveLength(2)
    expect(result.current.events[1]).toMatchObject({
      id: 'batch-event-2',
      bookId: 'genesis',
      chapter: 2,
      batchId: 'plan:common-plan:batch-token',
    })
  })

  it('계획 전체 완료 대상이 모두 이미 완료됐다면 ID 생성과 저장을 하지 않는다', () => {
    const storage = new MemoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    const dependencies = {
      createId: vi.fn(() => 'existing-event'),
      now: vi.fn(() => '2026-08-01T05:00:00.000Z'),
    }
    const { result } = renderHook(() => useReadingState(storage, dependencies))
    act(() => result.current.read('genesis', 1))
    setItem.mockClear()
    dependencies.createId.mockClear()
    dependencies.now.mockClear()

    act(() => result.current.readBatch('common-plan', [
      { bookId: 'genesis', chapter: 1 },
      { bookId: 'genesis', chapter: 1 },
    ]))

    expect(result.current.events).toHaveLength(1)
    expect(dependencies.createId).not.toHaveBeenCalled()
    expect(dependencies.now).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('빈 계획 소유자는 batch를 저장하지 않고 복구 가능한 오류로 노출한다', () => {
    const storage = new MemoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    const { result } = renderHook(() => useReadingState(storage, {
      createId: () => 'id-1',
      now: () => '2026-08-01T05:00:00.000Z',
    }))

    expect(() => act(() => result.current.readBatch('', [
      { bookId: 'genesis', chapter: 1 },
    ]))).not.toThrow()

    expect(result.current.events).toEqual([])
    expect(result.current.error).toHaveProperty('message', '계획 소유자 ID가 필요합니다.')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('malformed batch 장 정보는 예외를 전파하지 않고 저장 오류로 노출한다', () => {
    const storage = new MemoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    const { result } = renderHook(() => useReadingState(storage, {
      createId: () => 'id-1',
      now: () => '2026-08-01T05:00:00.000Z',
    }))
    const malformed = [null] as unknown as readonly { bookId: string; chapter: number }[]

    expect(() => act(() => result.current.readBatch('common-plan', malformed))).not.toThrow()

    expect(result.current.events).toEqual([])
    expect(result.current.error).toHaveProperty('message', '계획 완료 장 정보가 올바르지 않습니다.')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('장별 증가와 감소를 저장하며 0보다 작게 감소시키지 않는다', () => {
    const storage = new MemoryStorage()
    const dependencies = {
      createId: sequential(['event-1', 'event-2', 'event-3']),
      now: () => '2026-07-31T04:00:00.000Z',
    }
    const { result } = renderHook(() => useReadingState(storage, dependencies))

    act(() => result.current.change('genesis', 1, 1))
    act(() => result.current.change('genesis', 1, -1))

    expect(result.current.events.map((event) => event.delta)).toEqual([1, -1])
    expect(() => {
      act(() => result.current.change('genesis', 1, -1))
    }).toThrow('읽기 횟수는 0보다 작을 수 없습니다.')
  })

  it('원본 읽기 이벤트를 반대 이벤트로 취소하고 저장한다', () => {
    const storage = new MemoryStorage()
    const dependencies = {
      createId: sequential(['event-1', 'undo-1']),
      now: sequential(['2026-07-31T04:00:00.000Z', '2026-07-31T05:00:00.000Z']),
    }
    const { result } = renderHook(() => useReadingState(storage, dependencies))

    act(() => result.current.read('genesis', 1))
    act(() => result.current.undo('event-1'))

    expect(result.current.events).toHaveLength(2)
    expect(result.current.events[1]).toMatchObject({
      id: 'undo-1',
      delta: -1,
      undoneEventId: 'event-1',
    })
  })

  it('계획 전체 완료 묶음을 반대 이벤트들로 한 번에 취소한다', () => {
    const storage = new MemoryStorage()
    const setItem = vi.spyOn(storage, 'setItem')
    const dependencies = {
      createId: sequential(['batch-token', 'batch-event-1', 'batch-event-2', 'undo-prefix']),
      now: sequential(['2026-08-01T06:00:00.000Z', '2026-08-01T07:00:00.000Z']),
    }
    const { result } = renderHook(() => useReadingState(storage, dependencies))
    act(() => result.current.readBatch('common-plan', [
      { bookId: 'genesis', chapter: 1 },
      { bookId: 'genesis', chapter: 2 },
    ]))

    act(() => result.current.undoBatch('plan:common-plan:batch-token'))

    expect(result.current.events).toHaveLength(4)
    expect(result.current.events.slice(2)).toEqual([
      expect.objectContaining({
        id: 'undo-prefix-1',
        delta: -1,
        batchId: 'plan:common-plan:batch-token',
        undoneEventId: 'batch-event-1',
      }),
      expect.objectContaining({
        id: 'undo-prefix-2',
        delta: -1,
        batchId: 'plan:common-plan:batch-token',
        undoneEventId: 'batch-event-2',
      }),
    ])
    expect(setItem).toHaveBeenCalledTimes(2)
  })

  it('초기 저장 데이터 읽기가 실패해도 기본 상태와 복구 가능한 error를 반환한다', () => {
    const storage: StorageLike = {
      getItem: () => { throw new DOMException('접근이 거부되었습니다.', 'SecurityError') },
      setItem: () => undefined,
    }

    const { result } = renderHook(() => useReadingState(storage))

    expect(result.current.events).toEqual([])
    expect(result.current.error).toMatchObject({ name: 'SecurityError' })
  })

  it('저장 실패 시 화면 상태와 기존 bytes를 보존하고 error를 반환한다', () => {
    const storage = new FailingSaveStorage()
    const dependencies = {
      createId: sequential(['saved-event', 'failed-event']),
      now: () => '2026-07-31T04:00:00.000Z',
    }
    const { result } = renderHook(() => useReadingState(storage, dependencies))
    act(() => result.current.read('genesis', 1))
    const durableBytes = storage.getItem(APP_STATE_STORAGE_KEY)
    storage.failSave = true

    let saved: boolean | undefined
    act(() => { saved = result.current.read('genesis', 2) })

    expect(saved).toBe(false)
    expect(result.current.events.map(({ id }) => id)).toEqual(['saved-event'])
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(durableBytes)
    expect(result.current.error).toMatchObject({ name: 'QuotaExceededError' })
  })

  it('같은 저장소를 쓰는 두 hook가 번갈아 기록해도 기존 이벤트를 잃지 않는다', () => {
    const storage = new MemoryStorage()
    const firstDependencies = {
      createId: sequential(['first-1', 'first-2']),
      now: () => '2026-07-31T04:00:00.000Z',
    }
    const secondDependencies = {
      createId: () => 'second-1',
      now: () => '2026-07-31T05:00:00.000Z',
    }
    const first = renderHook(() => useReadingState(storage, firstDependencies))
    const second = renderHook(() => useReadingState(storage, secondDependencies))

    act(() => first.result.current.read('genesis', 1))
    act(() => second.result.current.read('genesis', 2))
    act(() => first.result.current.read('genesis', 3))

    expect(first.result.current.events.map(({ id }) => id)).toEqual([
      'first-1',
      'second-1',
      'first-2',
    ])
  })

  it('다른 탭의 storage.clear 이벤트를 받으면 기본 읽기 상태로 동기화한다', () => {
    window.localStorage.clear()
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      readingEvents: [eventFixture('before-clear')],
      commonPlan: null,
      personalPlan: null,
      settings: { theme: 'light', readerName: '', reminder: null },
    }))
    const { result } = renderHook(() => useReadingState())
    expect(result.current.events).toHaveLength(1)

    window.localStorage.clear()
    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: null,
      storageArea: window.localStorage,
    })))

    expect(result.current.events).toEqual([])
  })

  it('기본 localStorage의 다른 탭 storage 이벤트를 받으면 최신 상태를 다시 불러온다', () => {
    window.localStorage.clear()
    const { result } = renderHook(() => useReadingState())
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      readingEvents: [eventFixture('other-tab-event')],
      commonPlan: null,
      personalPlan: null,
      settings: { theme: 'light', readerName: '', reminder: null },
    }))

    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: APP_STATE_STORAGE_KEY,
      storageArea: window.localStorage,
    })))

    expect(result.current.events.map(({ id }) => id)).toEqual(['other-tab-event'])
  })
})

function eventFixture(id: string) {
  return {
    id,
    bookId: 'genesis',
    chapter: 1,
    delta: 1 as const,
    occurredAt: '2026-07-31T04:00:00.000Z',
  }
}
