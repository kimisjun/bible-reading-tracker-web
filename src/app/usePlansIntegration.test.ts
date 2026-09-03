import { act, renderHook } from '@testing-library/react'
import type { ReadingEvent } from '../domain/reading'
import type { ReadingPlan } from '../domain/planTypes'
import { planOwnerKey } from './createTodayPlanViews'
import { usePlansIntegration } from './usePlansIntegration'

const commonPlan: ReadingPlan = {
  request: {
    id: 'common-1',
    name: '공통 일독',
    kind: 'common',
    startDate: '2026-08-01',
    endDate: '2026-08-01',
    weekdays: [6],
    range: { type: 'books', bookIds: ['genesis'] },
    order: 'canonical',
    missedDayPolicy: 'carry',
  },
  schedule: [{ date: '2026-08-01', chapters: [{ bookId: 'genesis', chapter: 1 }] }],
  createdAt: '2026-08-01T00:00:00.000Z',
}

function readEvent(overrides: Partial<ReadingEvent> = {}): ReadingEvent {
  return {
    id: 'read-1',
    bookId: 'genesis',
    chapter: 1,
    delta: 1,
    occurredAt: '2026-08-01T03:00:00.000Z',
    ...overrides,
  }
}

describe('usePlansIntegration', () => {
  it('마지막 장을 개별 완료하면 현재 세션에서만 축하하고 읽기 이벤트를 연결한다', () => {
    const read = vi.fn(() => true)
    const readBatch = vi.fn(() => true)
    const undoBatch = vi.fn(() => true)
    const initialProps = { events: [] as readonly ReadingEvent[] }
    const { result, rerender, unmount } = renderHook(
      ({ events }) => usePlansIntegration({
        commonPlan,
        personalPlan: null,
        events,
        read,
        readBatch,
        undoBatch,
        today: '2026-08-01',
      }),
      { initialProps },
    )

    expect(result.current.views[0].chapters[0].completed).toBe(false)
    act(() => result.current.onRead('common', 'common-1', 'genesis', 1))
    expect(read).toHaveBeenCalledWith('genesis', 1)

    rerender({ events: [readEvent()] })
    expect(result.current.views[0].chapters[0].completed).toBe(true)
    expect(result.current.views[0].justCompleted).toBe(true)

    unmount()
    const reopened = renderHook(() => usePlansIntegration({
      commonPlan,
      personalPlan: null,
      events: [readEvent()],
      read,
      readBatch,
      undoBatch,
      today: '2026-08-01',
    }))
    expect(reopened.result.current.views[0].justCompleted).toBe(false)
  })

  it('실패한 계획 읽기 intent는 이후 외부 완료에서 축하로 되살아나지 않는다', () => {
    const read = vi.fn(() => false)
    const { result, rerender } = renderHook(
      ({ events }) => usePlansIntegration({
        commonPlan,
        personalPlan: null,
        events,
        read,
        readBatch: vi.fn(() => false),
        undoBatch: vi.fn(() => false),
        today: '2026-08-01',
      }),
      { initialProps: { events: [] as readonly ReadingEvent[] } },
    )

    act(() => result.current.onRead('common', 'common-1', 'genesis', 1))
    rerender({ events: [readEvent({ id: 'other-tab-read' })] })

    expect(result.current.views[0].chapters[0].completed).toBe(true)
    expect(result.current.views[0].justCompleted).toBe(false)
  })

  it('전체 완료와 최근 batch 취소를 encoded 계획 소유권으로 연결한다', () => {
    const read = vi.fn(() => true)
    const readBatch = vi.fn(() => true)
    const undoBatch = vi.fn(() => true)
    const { result, rerender } = renderHook(
      ({ events }) => usePlansIntegration({
        commonPlan,
        personalPlan: null,
        events,
        read,
        readBatch,
        undoBatch,
        today: '2026-08-01',
      }),
      { initialProps: { events: [] as readonly ReadingEvent[] } },
    )

    act(() => result.current.onCompleteAll('common', 'common-1', [
      { bookId: 'genesis', chapter: 1 },
    ]))
    expect(readBatch).toHaveBeenCalledWith(planOwnerKey('common', 'common-1'), [
      { bookId: 'genesis', chapter: 1 },
    ])

    const batchId = 'plan:common:common-1:batch-1'
    rerender({ events: [readEvent({ batchId })] })
    expect(result.current.views[0]).toMatchObject({ recentBatchId: batchId, justCompleted: true })

    act(() => result.current.onUndoBatch('common', 'common-1', batchId))
    expect(undoBatch).toHaveBeenCalledWith(batchId)
  })
})
