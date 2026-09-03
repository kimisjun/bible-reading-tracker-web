import type { ReadingEvent } from './reading'
import { filterReadingEventsForKoreaYear } from './readingYear'

const event = (id: string, occurredAt: string): ReadingEvent => ({
  id,
  bookId: 'genesis',
  chapter: 1,
  delta: 1,
  occurredAt,
})

describe('filterReadingEventsForKoreaYear', () => {
  it('한국 새해 자정부터 현재 연도 기록만 포함한다', () => {
    const now = new Date('2026-12-31T15:00:00.000Z')
    const events = [
      event('previous-year', '2026-12-31T14:59:59.999Z'),
      event('new-year-boundary', '2026-12-31T15:00:00.000Z'),
    ]

    expect(filterReadingEventsForKoreaYear(events, now).map(({ id }) => id)).toEqual([
      'new-year-boundary',
    ])
  })

  it('같은 한국 연도라도 현재 시각보다 미래인 기록과 잘못된 시각은 제외한다', () => {
    const now = new Date('2026-12-31T15:00:00.000Z')
    const events = [
      event('current', '2027-01-01T00:00:00.000+09:00'),
      event('future', '2026-12-31T15:00:00.001Z'),
      event('invalid', 'not-a-date'),
    ]

    expect(filterReadingEventsForKoreaYear(events, now).map(({ id }) => id)).toEqual(['current'])
  })

  it('입력 배열과 이벤트 객체를 변경하지 않는다', () => {
    const events = Object.freeze([
      Object.freeze(event('current', '2026-08-01T00:00:00.000Z')),
    ])
    const before = JSON.stringify(events)

    const result = filterReadingEventsForKoreaYear(
      events,
      new Date('2026-09-03T00:00:00.000Z'),
    )

    expect(result).toEqual(events)
    expect(JSON.stringify(events)).toBe(before)
  })

  it('현재 시각이 잘못되면 명확한 오류를 낸다', () => {
    expect(() => filterReadingEventsForKoreaYear([], new Date('invalid'))).toThrow(
      '현재 시각이 올바르지 않습니다.',
    )
  })
})
