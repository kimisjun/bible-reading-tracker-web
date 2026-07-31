import { bibleBooks } from '../../data/bibleBooks'
import { getReadingCount, type ReadingEvent } from '../../domain/reading'

export type ReadingRecommendation = Readonly<{
  bookId: string
  chapter: number
}>

export function getTodayRecommendation(
  events: readonly ReadingEvent[],
): ReadingRecommendation {
  const undoneEventIds = new Set(
    events.flatMap((event) => event.undoneEventId === undefined ? [] : [event.undoneEventId]),
  )
  let latest: ReadingEvent | undefined
  let latestEpoch = Number.NEGATIVE_INFINITY

  for (const candidate of events) {
    const epoch = Date.parse(candidate.occurredAt)
    if (
      candidate.delta === 1 &&
      candidate.undoneEventId === undefined &&
      !undoneEventIds.has(candidate.id) &&
      getReadingCount(events, candidate.bookId, candidate.chapter) > 0 &&
      epoch >= latestEpoch
    ) {
      latest = candidate
      latestEpoch = epoch
    }
  }

  if (latest === undefined) {
    return { bookId: bibleBooks[0].id, chapter: 1 }
  }

  const bookIndex = bibleBooks.findIndex((book) => book.id === latest.bookId)
  const book = bibleBooks[bookIndex]
  if (latest.chapter < book.chapters) {
    return { bookId: book.id, chapter: latest.chapter + 1 }
  }

  return {
    bookId: bibleBooks[(bookIndex + 1) % bibleBooks.length].id,
    chapter: 1,
  }
}
