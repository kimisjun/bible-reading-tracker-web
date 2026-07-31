import { act, renderHook } from '@testing-library/react'
import type { StorageLike } from '../storage/repository'
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

function sequential(values: readonly string[]) {
  let index = 0
  return () => values[index++] ?? values.at(-1) ?? ''
}

describe('useReadingState', () => {
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
})
