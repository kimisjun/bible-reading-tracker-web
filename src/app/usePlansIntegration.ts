import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReadingEvent } from '../domain/reading'
import type { ChapterRef, PlanKind, ReadingPlan } from '../domain/planTypes'
import type { TodayPlanSectionProps } from '../features/today-plan/TodayPlanSection'
import { createTodayPlanViews, planOwnerKey } from './createTodayPlanViews'

export type UsePlansIntegrationInput = Readonly<{
  commonPlan: ReadingPlan | null
  personalPlan: ReadingPlan | null
  events: readonly ReadingEvent[]
  read: (bookId: string, chapter: number) => void
  readBatch: (planOwner: string, chapters: readonly ChapterRef[]) => void
  undoBatch: (batchId: string) => void
  today?: string
}>

export type PlansIntegration = Readonly<{
  today: string
  views: ReturnType<typeof createTodayPlanViews>
  onRead: TodayPlanSectionProps['onRead']
  onCompleteAll: TodayPlanSectionProps['onCompleteAll']
  onUndoBatch: TodayPlanSectionProps['onUndoBatch']
}>

function localDateKey(date: Date): string {
  return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

function millisecondsUntilNextLocalDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(1, next.getTime() - now.getTime())
}

function useLocalToday(providedToday?: string): string {
  const [liveToday, setLiveToday] = useState(() => localDateKey(new Date()))

  useEffect(() => {
    if (providedToday !== undefined) return undefined
    const now = new Date()
    const timer = window.setTimeout(
      () => setLiveToday(localDateKey(new Date())),
      millisecondsUntilNextLocalDay(now),
    )
    return () => window.clearTimeout(timer)
  }, [liveToday, providedToday])

  return providedToday ?? liveToday
}

function sameChapter(
  chapter: ChapterRef,
  bookId: string,
  chapterNumber: number,
): boolean {
  return chapter.bookId === bookId && chapter.chapter === chapterNumber
}

export function usePlansIntegration({
  commonPlan,
  personalPlan,
  events,
  read,
  readBatch,
  undoBatch,
  today: providedToday,
}: UsePlansIntegrationInput): PlansIntegration {
  const today = useLocalToday(providedToday)
  const [justCompletedKeys, setJustCompletedKeys] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )
  const views = useMemo(() => createTodayPlanViews({
    commonPlan,
    personalPlan,
    events,
    today,
    justCompletedKeys,
  }), [commonPlan, events, justCompletedKeys, personalPlan, today])

  const onRead = useCallback((
    kind: PlanKind,
    planId: string,
    bookId: string,
    chapter: number,
  ) => {
    const ownerKey = planOwnerKey(kind, planId)
    const view = views.find((candidate) =>
      candidate.kind === kind && candidate.planId === planId)
    const incomplete = view?.chapters.filter((candidate) => !candidate.completed) ?? []
    const completesPlanDay = incomplete.length === 1 && sameChapter(incomplete[0], bookId, chapter)
    setJustCompletedKeys((current) => {
      const next = new Set(current)
      next.delete(ownerKey)
      if (completesPlanDay) next.add(ownerKey)
      return next
    })
    read(bookId, chapter)
  }, [read, views])

  const onCompleteAll = useCallback((
    kind: PlanKind,
    planId: string,
    incomplete: ChapterRef[],
  ) => {
    if (incomplete.length === 0) return
    const ownerKey = planOwnerKey(kind, planId)
    setJustCompletedKeys((current) => new Set(current).add(ownerKey))
    readBatch(ownerKey, incomplete)
  }, [readBatch])

  const onUndoBatch = useCallback((
    kind: PlanKind,
    planId: string,
    batchId: string,
  ) => {
    const ownerKey = planOwnerKey(kind, planId)
    setJustCompletedKeys((current) => {
      const next = new Set(current)
      next.delete(ownerKey)
      return next
    })
    undoBatch(batchId)
  }, [undoBatch])

  return { today, views, onRead, onCompleteAll, onUndoBatch }
}
