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
  totalReadings: number
}>

export function calculateReadingProgress(events: readonly ReadingEvent[]): ReadingProgress {
  const booksById = new Map(bibleBooks.map((book) => [book.id, book]))
  const validEvents = events.filter((event) => {
    const book = booksById.get(event.bookId)
    return book !== undefined && event.chapter >= 1 && event.chapter <= book.chapters
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
    totalReadings: validEvents.reduce((total, event) => total + event.delta, 0),
  }
}

/**
 * 월 활동일은 기기 로컬 시간으로 변환하지 않고 `occurredAt` ISO 문자열의
 * `YYYY-MM-DD` 날짜 부분을 기준으로 집계한다.
 */
export function getMonthlyActivityDates(
  events: readonly ReadingEvent[],
  month: string,
): readonly string[] {
  return [
    ...new Set(
      events
        .filter((event) => event.delta > 0)
        .map((event) => event.occurredAt.slice(0, 10))
        .filter((date) => date.startsWith(`${month}-`)),
    ),
  ].sort()
}
