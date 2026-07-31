import { describe, expect, it } from 'vitest'
import { bibleBooks } from '../data/bibleBooks'
import type { ReadingEvent } from './reading'
import { calculateReadingProgress, getMonthlyActivityDates } from './progress'

function read(
  id: string,
  bookId: string,
  chapter: number,
  occurredAt = '2026-07-01T09:00:00.000Z',
): ReadingEvent {
  return { id, bookId, chapter, delta: 1, occurredAt }
}

describe('calculateReadingProgress', () => {
  it('읽은 고유 장을 성경 1,189장 기준 진행률로 계산한다', () => {
    const result = calculateReadingProgress([read('read-1', 'genesis', 1)])

    expect(result.overall).toEqual({
      completedChapters: 1,
      totalChapters: 1189,
      percent: (1 / 1189) * 100,
    })
  })

  it('같은 장을 세 번 읽으면 완료 장은 하나이고 반복 읽기 총합은 세 번이다', () => {
    const result = calculateReadingProgress([
      read('read-1', 'genesis', 1),
      read('read-2', 'genesis', 1),
      read('read-3', 'genesis', 1),
    ])

    expect(result.overall.completedChapters).toBe(1)
    expect(result.totalReadings).toBe(3)
  })

  it('읽기와 취소의 합이 0인 장은 완료하지 않은 것으로 계산한다', () => {
    const original = read('read-1', 'genesis', 1)
    const cancellation: ReadingEvent = {
      ...original,
      id: 'undo-1',
      delta: -1,
      occurredAt: '2026-07-02T09:00:00.000Z',
      undoneEventId: original.id,
    }

    const result = calculateReadingProgress([original, cancellation])

    expect(result.overall.completedChapters).toBe(0)
    expect(result.totalReadings).toBe(0)
  })

  it('구약 929장과 신약 260장의 완료 수와 진행률을 따로 계산한다', () => {
    const result = calculateReadingProgress([
      read('old-read', 'genesis', 1),
      read('new-read', 'matthew', 1),
    ])

    expect(result.oldTestament).toEqual({
      completedChapters: 1,
      totalChapters: 929,
      percent: (1 / 929) * 100,
    })
    expect(result.newTestament).toEqual({
      completedChapters: 1,
      totalChapters: 260,
      percent: (1 / 260) * 100,
    })
  })

  it('성경 범위 밖 이벤트가 있어도 모든 진행률을 0~100%로 유지한다', () => {
    const allChapters = bibleBooks.flatMap((book) =>
      Array.from({ length: book.chapters }, (_, index) =>
        read(`${book.id}-${index + 1}`, book.id, index + 1),
      ),
    )
    const result = calculateReadingProgress([
      ...allChapters,
      read('unknown-book', 'unknown', 1),
      read('invalid-chapter', 'genesis', 51),
    ])

    expect(result.overall.percent).toBe(100)
    expect(result.oldTestament.percent).toBe(100)
    expect(result.newTestament.percent).toBe(100)
  })
})

describe('getMonthlyActivityDates', () => {
  it('기기 시간대 변환 없이 occurredAt ISO 문자열의 YYYY-MM-DD 부분으로 월 활동일을 계산한다', () => {
    const events = Object.freeze([
      read('june', 'genesis', 1, '2026-06-30T23:30:00.000-05:00'),
      read('july-1', 'genesis', 2, '2026-07-01T23:30:00.000-05:00'),
      read('july-1-again', 'genesis', 3, '2026-07-01T01:00:00.000+09:00'),
      read('july-2', 'genesis', 4, '2026-07-02T00:00:00.000Z'),
    ])
    const originalOrder = [...events]

    expect(getMonthlyActivityDates(events, '2026-07')).toEqual(['2026-07-01', '2026-07-02'])
    expect(events).toEqual(originalOrder)
  })
})
