import { useState } from 'react'
import { bibleBooks } from '../../data/bibleBooks'
import { calculateReadingProgress, getMonthlyActivityDates } from '../../domain/progress'
import { getRecentReadingEvents, type ReadingEvent } from '../../domain/reading'
import './ProgressPage.css'

export type ProgressPageProps = Readonly<{
  events: readonly ReadingEvent[]
  onUndo: (eventId: string) => void
  initialMonth?: string
}>

function formatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function isValidMonth(month: string | undefined): month is string {
  return month !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
}

function moveMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatOccurredAt(occurredAt: string): string {
  const date = new Date(occurredAt)
  if (Number.isNaN(date.getTime())) return occurredAt
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function ProgressPage({ events, onUndo, initialMonth }: ProgressPageProps) {
  const progress = calculateReadingProgress(events)
  const [month, setMonth] = useState(() => isValidMonth(initialMonth) ? initialMonth : currentMonth())
  const [year, monthNumber] = month.split('-').map(Number)
  const monthLabel = `${year}년 ${monthNumber}월`
  const activityDates = getMonthlyActivityDates(events, month)
  const activityDateSet = new Set(activityDates)
  const leadingBlankCount = new Date(year, monthNumber - 1, 1).getDay()
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => index + 1)
  const recentEvents = getRecentReadingEvents(events, 5)
  const undoneEventIds = new Set(
    events.flatMap((event) => event.undoneEventId ? [event.undoneEventId] : []),
  )
  const bookNames = new Map(bibleBooks.map((book) => [book.id, book.name]))

  return (
    <section className="progress-page" aria-labelledby="progress-page-title">
      <h2 id="progress-page-title">나의 진행</h2>
      <div className="progress-summary">
        <div className="progress-summary__header">
          <strong>전체</strong>
          <span>{progress.overall.completedChapters.toLocaleString('ko-KR')} / {progress.overall.totalChapters.toLocaleString('ko-KR')}장</span>
          <span>{formatPercent(progress.overall.percent)}</span>
        </div>
        <progress
          aria-label="전체 진행률"
          aria-valuenow={Number(progress.overall.percent.toFixed(1))}
          max="100"
          value={Number(progress.overall.percent.toFixed(1))}
        />
        <p>구약 {progress.oldTestament.completedChapters.toLocaleString('ko-KR')} / {progress.oldTestament.totalChapters.toLocaleString('ko-KR')}장 · {formatPercent(progress.oldTestament.percent)}</p>
        <p>신약 {progress.newTestament.completedChapters.toLocaleString('ko-KR')} / {progress.newTestament.totalChapters.toLocaleString('ko-KR')}장 · {formatPercent(progress.newTestament.percent)}</p>
        <p className="progress-summary__readings">총 {progress.totalReadings.toLocaleString('ko-KR')}회 읽었어요</p>
      </div>

      <section className="progress-activity" aria-labelledby="progress-activity-title">
        <div className="progress-activity__header">
          <h3 id="progress-activity-title" aria-live="polite">{monthLabel}</h3>
          <div className="progress-activity__navigation">
            <button type="button" aria-label="이전 달" style={{ minHeight: 44 }} onClick={() => setMonth(moveMonth(month, -1))}>
              <span aria-hidden="true">‹</span>
            </button>
            <button type="button" aria-label="다음 달" style={{ minHeight: 44 }} onClick={() => setMonth(moveMonth(month, 1))}>
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </div>
        <div className="progress-calendar" role="grid" aria-label={`${monthLabel} 달력`}>
          {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
            <div className="progress-calendar__weekday" role="columnheader" key={weekday}>
              {weekday}
            </div>
          ))}
          {Array.from({ length: leadingBlankCount }, (_, index) => (
            <div
              aria-hidden="true"
              className="progress-calendar__blank"
              key={`blank-${index}`}
              role="presentation"
            />
          ))}
          {calendarDays.map((day) => {
            const dateKey = `${month}-${String(day).padStart(2, '0')}`
            const isActive = activityDateSet.has(dateKey)
            const status = isActive ? '읽은 날' : '기록 없음'
            return (
              <div
                aria-label={`${monthNumber}월 ${day}일, ${status}`}
                className={`progress-calendar__day${isActive ? ' progress-calendar__day--active' : ''}`}
                key={dateKey}
                role="gridcell"
              >
                <span>{day}</span>
                <span className="progress-calendar__status">{status}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="progress-recent" aria-labelledby="progress-recent-title">
        <h3 id="progress-recent-title">최근 기록</h3>
        {recentEvents.length > 0 ? (
          <ul aria-label="최근 읽기 기록">
            {recentEvents.map((event) => {
              const eventLabel = `${bookNames.get(event.bookId) ?? event.bookId} ${event.chapter}장`
              const canUndo = !event.undoneEventId && !undoneEventIds.has(event.id)
              return (
                <li key={event.id}>
                  <div>
                    <strong>{eventLabel} {event.delta > 0 ? '+1' : '-1'}</strong>
                    <time dateTime={event.occurredAt}>{formatOccurredAt(event.occurredAt)}</time>
                  </div>
                  {canUndo && (
                    <button type="button" aria-label={`${eventLabel} 기록 취소`} style={{ minHeight: 44 }} onClick={() => onUndo(event.id)}>
                      취소
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="progress-empty">최근 읽기 기록이 없어요.</p>
        )}
      </section>
    </section>
  )
}
