import type { ReadingEvent } from '../../domain/reading'
import { getTodayRecommendation } from './recommendation'

const event = (overrides: Partial<ReadingEvent> = {}): ReadingEvent => ({
  id: 'event-1',
  bookId: 'genesis',
  chapter: 1,
  delta: 1,
  occurredAt: '2026-07-31T01:00:00.000Z',
  ...overrides,
})

describe('getTodayRecommendation', () => {
  it('실제 epoch 기준 가장 최근의 유효한 +1 원본 다음 장을 추천한다', () => {
    expect(getTodayRecommendation([
      event({ id: 'later-text-earlier-epoch', chapter: 8, occurredAt: '2026-07-31T09:00:00+09:00' }),
      event({ id: 'earlier-text-later-epoch', chapter: 2, occurredAt: '2026-07-31T01:30:00.000Z' }),
    ])).toEqual({ bookId: 'genesis', chapter: 3 })
  })

  it('동일 epoch이면 배열에서 뒤에 있는 이벤트를 최근 기록으로 본다', () => {
    expect(getTodayRecommendation([
      event({ id: 'first', chapter: 9, occurredAt: '2026-07-31T10:00:00+09:00' }),
      event({ id: 'second', chapter: 4, occurredAt: '2026-07-31T01:00:00.000Z' }),
    ])).toEqual({ bookId: 'genesis', chapter: 5 })
  })

  it('취소된 원본과 현재 count가 0인 장 및 -1 이벤트를 후보에서 제외한다', () => {
    expect(getTodayRecommendation([
      event({ id: 'valid', chapter: 2, occurredAt: '2026-07-31T01:00:00.000Z' }),
      event({ id: 'zero-source', chapter: 5, occurredAt: '2026-07-31T02:00:00.000Z' }),
      event({ id: 'zero-decrement', chapter: 5, delta: -1, occurredAt: '2026-07-31T03:00:00.000Z' }),
      event({ id: 'cancelled', chapter: 7, occurredAt: '2026-07-31T04:00:00.000Z' }),
      event({ id: 'undo', chapter: 7, delta: -1, occurredAt: '2026-07-31T05:00:00.000Z', undoneEventId: 'cancelled' }),
    ])).toEqual({ bookId: 'genesis', chapter: 3 })
  })

  it('앞 장을 나중에 반복해서 읽으면 그 앞 장의 다음 장을 추천한다', () => {
    expect(getTodayRecommendation([
      event({ id: 'chapter-10', chapter: 10, occurredAt: '2026-07-31T01:00:00.000Z' }),
      event({ id: 'chapter-3-later', chapter: 3, occurredAt: '2026-07-31T02:00:00.000Z' }),
    ])).toEqual({ bookId: 'genesis', chapter: 4 })
  })

  it('기록이 없으면 창세기 1장, 책 끝이면 다음 책, 정경 끝이면 창세기 1장이다', () => {
    expect(getTodayRecommendation([])).toEqual({ bookId: 'genesis', chapter: 1 })
    expect(getTodayRecommendation([event({ chapter: 50 })])).toEqual({ bookId: 'exodus', chapter: 1 })
    expect(getTodayRecommendation([event({ bookId: 'revelation', chapter: 22 })])).toEqual({ bookId: 'genesis', chapter: 1 })
  })
})
