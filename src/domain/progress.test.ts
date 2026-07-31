import { afterEach, describe, expect, it, vi } from 'vitest'
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

  it('고아 취소로 장 합계가 음수여도 반복 읽기 총합은 장별 양수 합계만 센다', () => {
    const orphanCancellation: ReadingEvent = {
      ...read('orphan-undo', 'genesis', 1),
      delta: -1,
      undoneEventId: 'missing-read',
    }

    const result = calculateReadingProgress([
      orphanCancellation,
      { ...orphanCancellation, id: 'orphan-undo-2' },
      read('valid-read', 'genesis', 2),
    ])

    expect(result.overall.completedChapters).toBe(1)
    expect(result.totalReadings).toBe(1)
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

  it('소수 장 이벤트 여러 개가 있어도 진행률은 100%를 넘지 않는다', () => {
    const allChapters = bibleBooks.flatMap((book) =>
      Array.from({ length: book.chapters }, (_, index) =>
        read(`${book.id}-${index + 1}`, book.id, index + 1),
      ),
    )
    const decimalChapters = Array.from({ length: 12 }, (_, index) =>
      read(`decimal-${index}`, 'genesis', 1 + (index + 1) / 100),
    )

    const result = calculateReadingProgress([...allChapters, ...decimalChapters])

    expect(result.overall.percent).toBe(100)
    expect(result.oldTestament.percent).toBe(100)
    expect(result.totalReadings).toBe(1189)
  })
})

describe('getMonthlyActivityDates', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('주입한 날짜 키 전략으로 시간대 경계의 월 활동일을 결정한다', () => {
    const events = Object.freeze([
      read('utc-july', 'genesis', 1, '2026-06-30T23:30:00.000-05:00'),
    ])
    const originalOrder = [...events]
    const utcDateKey = (date: Date) => date.toISOString().slice(0, 10)

    expect(getMonthlyActivityDates(events, '2026-07', utcDateKey)).toEqual(['2026-07-01'])
    expect(events).toEqual(originalOrder)
  })

  it('기본 날짜 키는 occurredAt을 기기 로컬 연월일로 변환한다', () => {
    vi.stubEnv('TZ', 'America/New_York')
    const events = [read('local-june', 'genesis', 1, '2026-07-01T02:00:00.000Z')]

    expect(getMonthlyActivityDates(events, '2026-06')).toEqual(['2026-06-30'])
  })

  it('잘못된 occurredAt은 날짜 키 전략을 호출하지 않고 무시한다', () => {
    const events = [
      read('invalid', 'genesis', 1, 'not-a-date'),
      read('valid', 'genesis', 2, '2026-07-02T00:00:00.000Z'),
    ]
    const utcDateKey = (date: Date) => date.toISOString().slice(0, 10)

    expect(getMonthlyActivityDates(events, '2026-07', utcDateKey)).toEqual(['2026-07-02'])
  })
})
