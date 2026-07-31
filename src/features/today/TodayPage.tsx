import { bibleBooks } from '../../data/bibleBooks'
import type { ReadingEvent } from '../../domain/reading'
import { getTodayRecommendation } from './recommendation'
import './TodayPage.css'

export type TodayPageProps = Readonly<{
  events: readonly ReadingEvent[]
  onRead(bookId: string, chapter: number): void
  onOpenTracker(): void
}>

export function TodayPage({ events, onRead, onOpenTracker }: TodayPageProps) {
  const recommendation = getTodayRecommendation(events)
  const book = bibleBooks.find((candidate) => candidate.id === recommendation.bookId) ?? bibleBooks[0]
  const chapter = recommendation.chapter

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
