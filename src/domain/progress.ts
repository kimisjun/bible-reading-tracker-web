import { bibleBooks } from '../data/bibleBooks'
import type { ReadingEvent } from './reading'

export type ProgressSection = Readonly<{
  completedChapters: number
  totalChapters: number
  percent: number
}>

export type ReadingProgress = Readonly<{
  overall: ProgressSection
  oldTestament: ProgressSection
  newTestament: ProgressSection
  /** 성경의 모든 장을 각각 읽은 활성 횟수 중 최솟값이다. */
  completedBibleReadings: number
  /** 장별 이벤트 합계가 양수인 읽기만 합산하며 고아 취소로 인한 음수는 0으로 취급한다. */
  totalReadings: number
}>

export function calculateReadingProgress(events: readonly ReadingEvent[]): ReadingProgress {
  const booksById = new Map(bibleBooks.map((book) => [book.id, book]))
  const validEvents = events.filter((event) => {
    const book = booksById.get(event.bookId)
    return (
      book !== undefined &&
      Number.isInteger(event.chapter) &&
      event.chapter >= 1 &&
      event.chapter <= book.chapters
    )
  })
  const countsByChapter = new Map<string, number>()
  for (const event of validEvents) {
    const chapterKey = `${event.bookId}:${event.chapter}`
    countsByChapter.set(chapterKey, (countsByChapter.get(chapterKey) ?? 0) + event.delta)
  }
  const completedChapterKeys = [...countsByChapter.entries()]
    .filter(([, count]) => count > 0)
    .map(([chapterKey]) => chapterKey)
  const completedChapters = completedChapterKeys.length
  const totalChapters = bibleBooks.reduce((total, book) => total + book.chapters, 0)
  const activeChapterCounts = bibleBooks.flatMap((book) =>
    Array.from({ length: book.chapters }, (_, index) =>
      Math.max(countsByChapter.get(`${book.id}:${index + 1}`) ?? 0, 0),
    ),
  )
  const completedBibleReadings = Math.min(...activeChapterCounts)
  const oldBooks = bibleBooks.filter((book) => book.testament === 'old')
  const oldBookIds = new Set(oldBooks.map((book) => book.id))
  const oldCompletedChapters = completedChapterKeys.filter((key) => oldBookIds.has(key.split(':')[0])).length
  const oldTotalChapters = oldBooks.reduce((total, book) => total + book.chapters, 0)
  const newCompletedChapters = completedChapters - oldCompletedChapters
  const newTotalChapters = totalChapters - oldTotalChapters

  return {
    overall: {
      completedChapters,
      totalChapters,
      percent: (completedChapters / totalChapters) * 100,
    },
    oldTestament: {
      completedChapters: oldCompletedChapters,
      totalChapters: oldTotalChapters,
      percent: (oldCompletedChapters / oldTotalChapters) * 100,
    },
    newTestament: {
      completedChapters: newCompletedChapters,
      totalChapters: newTotalChapters,
      percent: (newCompletedChapters / newTotalChapters) * 100,
    },
    completedBibleReadings,
    totalReadings: activeChapterCounts.reduce((total, count) => total + count, 0),
  }
}

export type ActivityDateKey = (date: Date) => string

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 월 활동일은 기본적으로 `occurredAt`을 기기 로컬 날짜로 변환해 집계한다. */
export function getMonthlyActivityDates(
  events: readonly ReadingEvent[],
  month: string,
  toDateKey: ActivityDateKey = toLocalDateKey,
): readonly string[] {
  const undoneEventIds = new Set(
    events.flatMap((event) => (event.undoneEventId ? [event.undoneEventId] : [])),
  )

  return [
    ...new Set(
      events
        .filter(
          (event) =>
            event.delta === 1 &&
            event.undoneEventId === undefined &&
            !undoneEventIds.has(event.id),
        )
        .map((event) => new Date(event.occurredAt))
        .filter((date) => !Number.isNaN(date.getTime()))
        .map(toDateKey)
        .filter((date) => date.startsWith(`${month}-`)),
    ),
  ].sort()
}
