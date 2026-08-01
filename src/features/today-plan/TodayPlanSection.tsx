import type { ChapterRef } from '../../domain/planTypes'
import './TodayPlanSection.css'

export type TodayPlanChapterView = Readonly<ChapterRef & {
  bookName: string
  completed: boolean
}>

export type TodayPlanView = Readonly<{
  planId: string
  kind: 'common' | 'personal'
  name: string
  date: string
  chapters: readonly TodayPlanChapterView[]
  statusMessage?: string
  lastScheduledDate?: string
  recentBatchId?: string
  justCompleted?: boolean
}>

export type TodayPlanSectionProps = Readonly<{
  views: readonly TodayPlanView[]
  onRead(kind: TodayPlanView['kind'], planId: string, bookId: string, chapter: number): void
  onCompleteAll(kind: TodayPlanView['kind'], planId: string, incomplete: ChapterRef[]): void
  onUndoBatch(kind: TodayPlanView['kind'], planId: string, batchId: string): void
}>

const kindLabel = (kind: TodayPlanView['kind']) => kind === 'common' ? '공통 계획' : '개인 계획'

export function TodayPlanSection({ views, onRead, onCompleteAll, onUndoBatch }: TodayPlanSectionProps) {
  if (views.length === 0) return null

  return (
    <section className="today-plan" aria-labelledby="today-plan-title">
      <h2 id="today-plan-title" className="today-plan__title">오늘 계획</h2>
      <div className="today-plan__cards">
        {views.map((view) => (
          <article
            className="today-plan__card"
            aria-label={`${kindLabel(view.kind)} ${view.name}`}
            key={`${view.kind}:${view.planId}`}
          >
            <header className="today-plan__header">
              <p className="today-plan__kind">{kindLabel(view.kind)}</p>
              <h3 className="today-plan__name">{view.name}</h3>
              <time className="today-plan__date" dateTime={view.date}>{view.date}</time>
            </header>
            {view.chapters.length === 0 ? (
              <p className="today-plan__empty">오늘 배정된 분량이 없습니다.</p>
            ) : (
              <ul className="today-plan__chapters">
                {view.chapters.map((chapter) => (
                <li className="today-plan__chapter" key={`${chapter.bookId}-${chapter.chapter}`}>
                  {chapter.completed ? (
                    <span className="today-plan__completed">✓ {chapter.bookName} {chapter.chapter}장 · 완료</span>
                  ) : (
                    <>
                      <span>{chapter.bookName} {chapter.chapter}장</span>
                      <button
                        className="today-plan__button today-plan__button--read"
                        type="button"
                        aria-label={`${chapter.bookName} ${chapter.chapter}장 읽었어요`}
                        onClick={() => onRead(view.kind, view.planId, chapter.bookId, chapter.chapter)}
                      >
                        읽었어요
                      </button>
                    </>
                  )}
                  </li>
                ))}
              </ul>
            )}
            {(view.statusMessage || view.lastScheduledDate || view.justCompleted) && (
              <div className="today-plan__status" role="status" aria-live="polite">
                {view.statusMessage && <p>{view.statusMessage}</p>}
                {view.lastScheduledDate && <p>새 완료 예정일 {view.lastScheduledDate}</p>}
                {view.justCompleted && (
                  <p className="today-plan__celebration">오늘도 말씀과 함께 걸으셨습니다</p>
                )}
              </div>
            )}
            {(() => {
              const incomplete = view.chapters
                .filter((chapter) => !chapter.completed)
                .map(({ bookId, chapter }) => ({ bookId, chapter }))
              return (
                <button
                  className="today-plan__button today-plan__button--complete"
                  type="button"
                  disabled={incomplete.length === 0}
                  aria-label={`${view.name} 미완료 ${incomplete.length}장 전체 완료`}
                  onClick={() => onCompleteAll(view.kind, view.planId, incomplete)}
                >
                  전체 완료
                </button>
              )
            })()}
            {view.recentBatchId && (
              <button
                className="today-plan__button today-plan__button--undo"
                type="button"
                aria-label={`${view.name} 전체 완료 취소`}
                onClick={() => onUndoBatch(view.kind, view.planId, view.recentBatchId!)}
              >
                전체 완료 취소
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
