import { type ReactNode } from 'react'
import { useKoreaClock } from '../../app/useKoreaClock'
import { bibleBooks } from '../../data/bibleBooks'
import type { ReadingEvent } from '../../domain/reading'
import { calculateReadingProgress } from '../../domain/progress'
import { calculateReadingSummary } from '../../domain/readingSummary'
import { getBibleAppleChapterUrl } from './bibleApple'
import { getTodayRecommendation } from './recommendation'
import './TodayPage.css'

export type TodayPageProps = Readonly<{
  events: readonly ReadingEvent[]
  now?: Date
  planContent?: ReactNode
  onRead(bookId: string, chapter: number): void
  onOpenTracker(): void
}>

export function TodayPage({ events, now, planContent, onRead, onOpenTracker }: TodayPageProps) {
  const currentNow = useKoreaClock(now)
  const recommendation = getTodayRecommendation(events)
  const summary = calculateReadingSummary(events, currentNow)
  const progress = calculateReadingProgress(events)
  const completedBibleReadings = progress.completedBibleReadings
  const book = bibleBooks.find((candidate) => candidate.id === recommendation.bookId) ?? bibleBooks[0]
  const chapter = recommendation.chapter
  const bibleAppleUrl = getBibleAppleChapterUrl(book.id, chapter)

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
          {bibleAppleUrl !== null && (
            <a
              aria-label={`바이블 애플에서 ${book.name} ${chapter}장 읽기 (새 창)`}
              className="today-page__button today-page__button--external"
              href={bibleAppleUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              바이블 애플에서 읽기 ↗
            </a>
          )}
        </div>
      </article>
      {planContent}
      <div className="today-page__summaries">
        <article className="today-page__card today-page__summary-card" aria-labelledby="today-amount-title">
          <h3 id="today-amount-title">오늘 읽은 분량</h3>
          <p className="today-page__summary-value">
            {completedBibleReadings > 0 && `${completedBibleReadings}독 후 `}
            오늘 {summary.todayCount}장
          </p>
        </article>
        <article className="today-page__card today-page__summary-card" aria-labelledby="weekly-amount-title">
          <h3 id="weekly-amount-title">이번 주 통독</h3>
          <p className="today-page__summary-value">이번 주 총 {summary.weekTotal}장</p>
          <ul className="today-page__week" aria-label="월요일부터 일요일까지 통독량">
            {summary.days.map((day) => {
              const amount = day.isFuture ? '-' : `${day.count}장`
              const accessibleLabel = `${day.label} ${amount}${day.isToday ? ' 오늘' : ''}`

              return (
                <li
                  aria-current={day.isToday ? 'date' : undefined}
                  aria-label={accessibleLabel}
                  className="today-page__day"
                  key={day.date}
                >
                  <span className="today-page__day-label">{day.label}</span>
                  <span className="today-page__day-amount">{amount}</span>
                  {day.isToday && <span className="today-page__day-marker">오늘</span>}
                </li>
              )
            })}
          </ul>
        </article>
      </div>
    </section>
  )
}
