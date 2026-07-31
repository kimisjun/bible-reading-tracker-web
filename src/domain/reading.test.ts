import {
  appendReadingEvent,
  getReadingCount,
  getRecentReadingEvents,
  undoReadingBatch,
  undoReadingEvent,
  type ReadingEvent,
} from './reading'

const event = (overrides: Partial<ReadingEvent> = {}): ReadingEvent => ({
  id: 'event-1',
  bookId: 'genesis',
  chapter: 1,
  delta: 1,
  occurredAt: '2026-07-31T01:00:00.000Z',
  ...overrides,
})

describe('reading events', () => {
  it('같은 장의 읽기 이벤트를 누적한다', () => {
    const first = appendReadingEvent([], event())
    const second = appendReadingEvent(
      first,
      event({ id: 'event-2', occurredAt: '2026-07-31T02:00:00.000Z' }),
    )

    expect(getReadingCount(second, 'genesis', 1)).toBe(2)
    expect(getReadingCount(second, 'genesis', 2)).toBe(0)
  })

  it('감소 이벤트를 반영하되 읽기 횟수를 0보다 작게 만들지 않는다', () => {
    const readOnce = appendReadingEvent([], event())
    const backToZero = appendReadingEvent(
      readOnce,
      event({ id: 'event-2', delta: -1, occurredAt: '2026-07-31T02:00:00.000Z' }),
    )

    expect(getReadingCount(backToZero, 'genesis', 1)).toBe(0)
    expect(() =>
      appendReadingEvent(
        backToZero,
        event({ id: 'event-3', delta: -1, occurredAt: '2026-07-31T03:00:00.000Z' }),
      ),
    ).toThrow('읽기 횟수는 0보다 작을 수 없습니다.')
  })

  it('원본 이벤트를 삭제하지 않고 반대 이벤트로 취소한다', () => {
    const readOnce = appendReadingEvent([], event())
    const undone = undoReadingEvent(
      readOnce,
      'event-1',
      'undo-1',
      '2026-07-31T04:00:00.000Z',
    )

    expect(undone).toHaveLength(2)
    expect(undone[1]).toMatchObject({
      id: 'undo-1',
      bookId: 'genesis',
      chapter: 1,
      delta: -1,
      undoneEventId: 'event-1',
    })
    expect(getReadingCount(undone, 'genesis', 1)).toBe(0)
    expect(() =>
      undoReadingEvent(undone, 'event-1', 'undo-2', '2026-07-31T05:00:00.000Z'),
    ).toThrow('이미 취소된 기록입니다.')
  })

  it('한 번에 완료한 묶음의 모든 활성 기록을 함께 취소한다', () => {
    const batch = [
      event({ id: 'batch-1', batchId: 'today-1' }),
      event({ id: 'batch-2', chapter: 2, batchId: 'today-1' }),
      event({ id: 'other-1', chapter: 3, batchId: 'today-2' }),
    ]

    const undone = undoReadingBatch(
      batch,
      'today-1',
      'undo-today-1',
      '2026-07-31T06:00:00.000Z',
    )

    expect(undone).toHaveLength(5)
    expect(getReadingCount(undone, 'genesis', 1)).toBe(0)
    expect(getReadingCount(undone, 'genesis', 2)).toBe(0)
    expect(getReadingCount(undone, 'genesis', 3)).toBe(1)
    expect(undone.slice(-2).map((item) => item.id)).toEqual([
      'undo-today-1-1',
      'undo-today-1-2',
    ])
  })

  it('최근 기록을 실제 발생 시간 역순으로 반환하며 원본 순서를 바꾸지 않는다', () => {
    const events = [
      event({ id: 'event-1', occurredAt: '2026-07-31T10:00:00+09:00' }),
      event({ id: 'event-2', chapter: 2, occurredAt: '2026-07-31T03:00:00.000Z' }),
      event({ id: 'event-3', chapter: 3, occurredAt: '2026-07-30T23:00:00-05:00' }),
    ]

    expect(getRecentReadingEvents(events).map((item) => item.id)).toEqual([
      'event-3',
      'event-2',
      'event-1',
    ])
    expect(events.map((item) => item.id)).toEqual(['event-1', 'event-2', 'event-3'])
  })

  it('잘못된 발생 시각은 방어적으로 최근 기록에서 제외한다', () => {
    const events = [
      event({ id: 'valid' }),
      event({ id: 'invalid', occurredAt: 'not-a-date' }),
    ]

    expect(getRecentReadingEvents(events).map((item) => item.id)).toEqual(['valid'])
  })

  it('발생 시각이 같으면 원 배열에서 더 나중에 추가된 기록을 먼저 반환한다', () => {
    const occurredAt = '2026-07-31T01:00:00.000Z'
    const events = [
      event({ id: 'older-position', occurredAt }),
      event({ id: 'newer-position', occurredAt }),
    ]

    expect(getRecentReadingEvents(events).map((item) => item.id)).toEqual([
      'newer-position',
      'older-position',
    ])
  })
})
