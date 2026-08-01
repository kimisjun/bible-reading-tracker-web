import type { ReadingEvent } from './reading'
import { calculateReadingSummary } from './readingSummary'

const event = (overrides: Partial<ReadingEvent> = {}): ReadingEvent => ({
  id: 'event-1',
  bookId: 'genesis',
  chapter: 1,
  delta: 1,
  occurredAt: '2026-07-31T15:00:00.000Z',
  ...overrides,
})

describe('calculateReadingSummary', () => {
  it('UTC 날짜가 달라도 한국 날짜 기준 오늘 읽은 장 수에 포함한다', () => {
    const summary = calculateReadingSummary(
      [event()],
      new Date('2026-08-01T03:00:00.000Z'),
    )

    expect(summary.todayDate).toBe('2026-08-01')
    expect(summary.todayCount).toBe(1)
  })

  it('한국 시간 일요일 23시 59분은 월요일부터 시작한 현재 주에 포함한다', () => {
    const summary = calculateReadingSummary(
      [event({ occurredAt: '2026-08-02T14:59:59.000Z' })],
      new Date('2026-08-02T14:59:59.000Z'),
    )

    expect(summary.weekStartDate).toBe('2026-07-27')
    expect(summary.weekEndDate).toBe('2026-08-02')
    expect(summary.weekTotal).toBe(1)
  })

  it('한국 시간 월요일 0시는 다음 주를 시작한다', () => {
    const summary = calculateReadingSummary([], new Date('2026-08-02T15:00:00.000Z'))

    expect(summary.weekStartDate).toBe('2026-08-03')
    expect(summary.weekEndDate).toBe('2026-08-09')
  })

  it('월요일부터 일요일까지 일곱 날짜를 항상 반환한다', () => {
    const summary = calculateReadingSummary([], new Date('2026-08-01T03:00:00.000Z'))

    expect(summary.days).toHaveLength(7)
    expect(summary.days.map(({ label }) => label)).toEqual(['월', '화', '수', '목', '금', '토', '일'])
    expect(summary.days.map(({ date }) => date)).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ])
  })

  it('활성 읽기를 날짜별로 합산하고 같은 장의 반복 읽기도 각각 센다', () => {
    const summary = calculateReadingSummary(
      [
        event({ id: 'monday', occurredAt: '2026-07-27T01:00:00.000Z' }),
        event({ id: 'first' }),
        event({ id: 'second' }),
      ],
      new Date('2026-08-01T03:00:00.000Z'),
    )

    expect(summary.weekTotal).toBe(3)
    expect(summary.todayCount).toBe(2)
    expect(summary.days[0].count).toBe(1)
  })

  it('취소된 원래 읽기는 원래 읽은 날의 통독량에서 제외한다', () => {
    const summary = calculateReadingSummary(
      [
        event({ id: 'read' }),
        event({ id: 'undo', delta: -1, occurredAt: '2026-08-01T04:00:00.000Z', undoneEventId: 'read' }),
      ],
      new Date('2026-08-01T05:00:00.000Z'),
    )

    expect(summary.todayCount).toBe(0)
  })

  it('감소 기록의 취소로 생긴 양수 이벤트는 읽기 활동으로 세지 않는다', () => {
    const summary = calculateReadingSummary(
      [event({ id: 'undo-minus', undoneEventId: 'minus' })],
      new Date('2026-08-01T05:00:00.000Z'),
    )

    expect(summary.todayCount).toBe(0)
  })

  it('원시 감소 기록은 일별 통독량을 음수로 만들지 않는다', () => {
    const summary = calculateReadingSummary(
      [event({ id: 'minus', delta: -1 })],
      new Date('2026-08-01T05:00:00.000Z'),
    )

    expect(summary.todayCount).toBe(0)
  })

  it('잘못된 시각의 이벤트를 무시한다', () => {
    const summary = calculateReadingSummary(
      [event({ occurredAt: 'not-a-date' })],
      new Date('2026-08-01T05:00:00.000Z'),
    )

    expect(summary.weekTotal).toBe(0)
  })

  it('현재 시각보다 미래 날짜인 이벤트는 이번 주 총합에서 제외한다', () => {
    const summary = calculateReadingSummary(
      [event({ occurredAt: '2026-08-01T15:00:00.000Z' })],
      new Date('2026-07-29T03:00:00.000Z'),
    )

    expect(summary.weekTotal).toBe(0)
    expect(summary.days.find(({ label }) => label === '일')?.count).toBe(0)
  })

  it('같은 한국 날짜라도 현재 시각보다 미래인 읽기는 제외한다', () => {
    const summary = calculateReadingSummary(
      [event({ occurredAt: '2026-08-01T04:00:00.000Z' })],
      new Date('2026-08-01T03:00:00.000Z'),
    )

    expect(summary.todayCount).toBe(0)
  })

  it('잘못된 시각의 취소 이벤트는 유효한 원본 읽기를 취소하지 않는다', () => {
    const summary = calculateReadingSummary(
      [
        event({ id: 'read', occurredAt: '2026-08-01T02:00:00.000Z' }),
        event({ id: 'undo', delta: -1, occurredAt: 'not-a-date', undoneEventId: 'read' }),
      ],
      new Date('2026-08-01T03:00:00.000Z'),
    )

    expect(summary.todayCount).toBe(1)
  })

  it('현재 시각보다 미래인 취소 이벤트는 아직 원본 읽기를 취소하지 않는다', () => {
    const summary = calculateReadingSummary(
      [
        event({ id: 'read', occurredAt: '2026-08-01T02:00:00.000Z' }),
        event({
          id: 'future-undo',
          delta: -1,
          occurredAt: '2026-08-01T04:00:00.000Z',
          undoneEventId: 'read',
        }),
      ],
      new Date('2026-08-01T03:00:00.000Z'),
    )

    expect(summary.todayCount).toBe(1)
  })

  it('입력 이벤트 배열을 변경하지 않는다', () => {
    const events = Object.freeze([
      Object.freeze(event({ id: 'first' })),
      Object.freeze(event({ id: 'second', occurredAt: '2026-07-27T01:00:00.000Z' })),
    ])
    const before = JSON.stringify(events)

    calculateReadingSummary(events, new Date('2026-08-01T05:00:00.000Z'))

    expect(JSON.stringify(events)).toBe(before)
  })
})
