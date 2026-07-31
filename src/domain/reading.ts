export type ReadingEvent = Readonly<{
  id: string
  bookId: string
  chapter: number
  delta: 1 | -1
  occurredAt: string
  batchId?: string
  undoneEventId?: string
}>

export function getReadingCount(
  events: readonly ReadingEvent[],
  bookId: string,
  chapter: number,
): number {
  return events
    .filter((event) => event.bookId === bookId && event.chapter === chapter)
    .reduce((total, event) => total + event.delta, 0)
}

export function appendReadingEvent(
  events: readonly ReadingEvent[],
  nextEvent: ReadingEvent,
): readonly ReadingEvent[] {
  const nextCount = getReadingCount(events, nextEvent.bookId, nextEvent.chapter) + nextEvent.delta
  if (nextCount < 0) {
    throw new Error('읽기 횟수는 0보다 작을 수 없습니다.')
  }

  return [...events, nextEvent]
}

export function undoReadingEvent(
  events: readonly ReadingEvent[],
  targetEventId: string,
  undoEventId: string,
  occurredAt: string,
): readonly ReadingEvent[] {
  const target = events.find((event) => event.id === targetEventId)
  if (!target) {
    throw new Error('취소할 기록을 찾을 수 없습니다.')
  }
  if (events.some((event) => event.undoneEventId === targetEventId)) {
    throw new Error('이미 취소된 기록입니다.')
  }

  return appendReadingEvent(events, {
    id: undoEventId,
    bookId: target.bookId,
    chapter: target.chapter,
    delta: target.delta === 1 ? -1 : 1,
    occurredAt,
    batchId: target.batchId,
    undoneEventId: target.id,
  })
}

export function undoReadingBatch(
  events: readonly ReadingEvent[],
  batchId: string,
  undoIdPrefix: string,
  occurredAt: string,
): readonly ReadingEvent[] {
  const undoneIds = new Set(
    events.flatMap((event) => (event.undoneEventId ? [event.undoneEventId] : [])),
  )
  const targets = events.filter(
    (event) => event.batchId === batchId && !event.undoneEventId && !undoneIds.has(event.id),
  )
  if (targets.length === 0) {
    throw new Error('취소할 묶음 기록을 찾을 수 없습니다.')
  }

  return targets.reduce<readonly ReadingEvent[]>(
    (current, target, index) =>
      undoReadingEvent(current, target.id, `${undoIdPrefix}-${index + 1}`, occurredAt),
    events,
  )
}

export function getRecentReadingEvents(
  events: readonly ReadingEvent[],
  limit = events.length,
): readonly ReadingEvent[] {
  return events
    .map((event, index) => ({ event, index, epoch: Date.parse(event.occurredAt) }))
    .filter(({ epoch }) => Number.isFinite(epoch))
    .sort((left, right) => right.epoch - left.epoch || right.index - left.index)
    .slice(0, limit)
    .map(({ event }) => event)
}
