import { bibleBooks } from '../data/bibleBooks'
import { recalculatePlan } from '../domain/planRecalculation'
import type { ReadingEvent } from '../domain/reading'
import type { ChapterRef, ReadingPlan } from '../domain/planTypes'
import type { TodayPlanView } from '../features/today-plan/TodayPlanSection'

export type CreateTodayPlanViewsInput = Readonly<{
  commonPlan: ReadingPlan | null
  personalPlan: ReadingPlan | null
  events: readonly ReadingEvent[]
  today: string
  justCompletedKeys?: ReadonlySet<string>
}>

const bookNames = new Map(bibleBooks.map((book) => [book.id, book.name]))
const chapterLimits = new Map(bibleBooks.map((book) => [book.id, book.chapters]))
const chapterKey = ({ bookId, chapter }: ChapterRef) => `${bookId}:${chapter}`

export function planOwnerKey(kind: ReadingPlan['request']['kind'], planId: string): string {
  return `${kind}:${encodeURIComponent(planId)}`
}

function recentActiveBatchId(
  events: readonly ReadingEvent[],
  ownerKey: string,
): string | undefined {
  const undoneIds = new Set(
    events.flatMap((readingEvent) => readingEvent.undoneEventId ? [readingEvent.undoneEventId] : []),
  )
  const prefix = `plan:${ownerKey}:`
  return events
    .map((readingEvent, index) => ({
      readingEvent,
      index,
      epoch: Date.parse(readingEvent.occurredAt),
    }))
    .filter(({ readingEvent, epoch }) =>
      readingEvent.delta === 1 &&
      !readingEvent.undoneEventId &&
      !undoneIds.has(readingEvent.id) &&
      readingEvent.batchId?.startsWith(prefix) &&
      Number.isFinite(epoch))
    .sort((left, right) => right.epoch - left.epoch || right.index - left.index)
    .at(0)?.readingEvent.batchId
}

function localDateKey(timestamp: string): string | null {
  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return null
  return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

function validChapter(event: ReadingEvent): boolean {
  const limit = chapterLimits.get(event.bookId)
  return limit !== undefined && Number.isInteger(event.chapter) && event.chapter >= 1 && event.chapter <= limit
}

function countChapters(
  events: readonly ReadingEvent[],
  include: (event: ReadingEvent) => boolean,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const readingEvent of events) {
    if (!validChapter(readingEvent) || !include(readingEvent)) continue
    const key = chapterKey(readingEvent)
    counts.set(key, (counts.get(key) ?? 0) + readingEvent.delta)
  }
  return counts
}

function completedBeforeToday(
  plan: ReadingPlan,
  currentCounts: ReadonlyMap<string, number>,
  beforeCounts: ReadonlyMap<string, number>,
): ChapterRef[] {
  const seen = new Set<string>()
  const completed: ChapterRef[] = []
  for (const chapter of plan.schedule.flatMap((day) => day.chapters)) {
    const key = chapterKey(chapter)
    if (seen.has(key)) continue
    seen.add(key)
    if ((currentCounts.get(key) ?? 0) > 0 && (beforeCounts.get(key) ?? 0) > 0) {
      completed.push(chapter)
    }
  }
  return completed
}

function overdueCount(
  plan: ReadingPlan,
  today: string,
  currentCounts: ReadonlyMap<string, number>,
): number {
  const keys = new Set(
    plan.schedule
      .filter((day) => day.date < today)
      .flatMap((day) => day.chapters)
      .filter((chapter) => (currentCounts.get(chapterKey(chapter)) ?? 0) <= 0)
      .map(chapterKey),
  )
  return keys.size
}

export function createTodayPlanViews({
  commonPlan,
  personalPlan,
  events,
  today,
  justCompletedKeys = new Set<string>(),
}: CreateTodayPlanViewsInput): readonly TodayPlanView[] {
  const currentCounts = countChapters(events, () => true)
  const beforeCounts = countChapters(events, (readingEvent) => {
    const date = localDateKey(readingEvent.occurredAt)
    return date !== null && date < today
  })

  return [commonPlan, personalPlan]
    .filter((plan): plan is ReadingPlan => plan !== null)
    .map((plan) => {
      const recalculated = recalculatePlan({
        plan,
        today,
        completedChapters: completedBeforeToday(plan, currentCounts, beforeCounts),
      })
      const overdue = plan.request.missedDayPolicy === 'carry'
        ? overdueCount(plan, today, currentCounts)
        : 0
      const statusMessage = plan.request.missedDayPolicy === 'carry'
        ? (overdue > 0 ? `밀린 분량 ${overdue}장 포함` : undefined)
        : plan.request.missedDayPolicy === 'redistribute'
          ? '남은 기간에 다시 나누었습니다'
          : undefined
      const ownerKey = planOwnerKey(plan.request.kind, plan.request.id)
      const recentBatchId = recentActiveBatchId(events, ownerKey)
      const chapters = recalculated.todayAssignment.map((chapter) => ({
        ...chapter,
        bookName: bookNames.get(chapter.bookId) ?? chapter.bookId,
        completed: (currentCounts.get(chapterKey(chapter)) ?? 0) > 0,
      }))

      return {
        planId: plan.request.id,
        kind: plan.request.kind,
        name: plan.request.name,
        date: today,
        chapters,
        ...(statusMessage ? { statusMessage } : {}),
        ...(plan.request.missedDayPolicy === 'restart-today' && recalculated.lastScheduledDate
          ? { lastScheduledDate: recalculated.lastScheduledDate }
          : {}),
        ...(recentBatchId ? { recentBatchId } : {}),
        justCompleted: justCompletedKeys.has(ownerKey) &&
          chapters.length > 0 &&
          chapters.every((chapter) => chapter.completed),
      }
    })
}
