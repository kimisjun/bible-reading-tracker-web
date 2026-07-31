import { bibleBooks } from '../../data/bibleBooks'
import type { ReadingEvent } from '../../domain/reading'
import './TodayPage.css'

export type TodayPageProps = Readonly<{
  events: readonly ReadingEvent[]
  onRead(bookId: string, chapter: number): void
  onOpenTracker(): void
}>

export function TodayPage({ events, onRead, onOpenTracker }: TodayPageProps) {
  const chapterCounts = events.reduce((counts, event) => {
    const key = `${event.bookId}:${event.chapter}`
    const previous = counts.get(key)
    counts.set(key, {
      bookIndex: bibleBooks.findIndex((book) => book.id === event.bookId),
      chapter: event.chapter,
      count: (previous?.count ?? 0) + event.delta,
    })
    return counts
  }, new Map<string, { bookIndex: number; chapter: number; count: number }>())

  const lastRead = [...chapterCounts.values()].reduce(
    (latest, entry) => {
      if (
        entry.count >= 1 &&
        (entry.bookIndex > latest.bookIndex ||
          (entry.bookIndex === latest.bookIndex && entry.chapter > latest.chapter))
      ) {
        return { bookIndex: entry.bookIndex, chapter: entry.chapter }
      }
      return latest
    },
    { bookIndex: 0, chapter: 0 },
  )
  const currentBook = bibleBooks[lastRead.bookIndex]
  const reachedBookEnd = lastRead.chapter === currentBook.chapters
  const book = reachedBookEnd
    ? bibleBooks[(lastRead.bookIndex + 1) % bibleBooks.length]
    : currentBook
  const chapter = reachedBookEnd ? 1 : lastRead.chapter + 1

  return (
    <section className="today-page" aria-labelledby="today-page-title">
      <h2 className="today-page__title" id="today-page-title">오늘 읽기</h2>
      <article className="today-page__card" aria-label="오늘 읽기 추천">
        <p className="today-page__eyebrow">오늘의 추천</p>
        <p className="today-page__recommendation">{book.name} {chapter}장</p>
        <p className="today-page__description">마지막 기록 다음 장을 추천해 드려요.</p>
        <div className="today-page__actions">
          <button
            className="today-page__button today-page__button--primary"
            type="button"
            onClick={() => onRead(book.id, chapter)}
          >
            읽었어요
          </button>
          <button
            className="today-page__button today-page__button--secondary"
            type="button"
            onClick={onOpenTracker}
          >
            전체 통독표에서 선택
          </button>
        </div>
      </article>
    </section>
  )
}
