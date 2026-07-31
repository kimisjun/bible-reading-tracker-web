import type {
  ChapterRef,
  PlanDay,
  PlanKind,
  PlanRange,
  PlanRequest,
  ReadingPlan,
  Weekday,
} from '../domain/planTypes'
import type { ReadingEvent } from '../domain/reading'
import { bibleBooks } from '../data/bibleBooks'
import { createDefaultAppState, type AppState } from './schema'

export const CURRENT_SCHEMA_VERSION = 1 as const

export class UnsupportedSchemaVersionError extends Error {
  constructor(version: unknown) {
    super(
      `지원하지 않는 저장 데이터 버전입니다: ${String(version)} (현재 지원 버전: ${CURRENT_SCHEMA_VERSION}).`,
    )
    this.name = 'UnsupportedSchemaVersionError'
  }
}

export class InvalidStorageDataError extends Error {
  constructor() {
    super('저장된 앱 데이터 형식이 올바르지 않습니다.')
    this.name = 'InvalidStorageDataError'
  }
}

type UnknownRecord = Record<string, unknown>

const chapterCountByBookId = new Map(bibleBooks.map((book) => [book.id, book.chapters]))
const testamentByBookId = new Map(bibleBooks.map((book) => [book.id, book.testament]))

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(
    value,
  )
  if (match === null || Number.isNaN(Date.parse(value))) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const daysInMonth = new Date(year, month, 0).getDate()
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth
}

function localWeekday(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

function toPlanRange(value: unknown): PlanRange | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null
  if (value.type === 'all' || value.type === 'old' || value.type === 'new') {
    return { type: value.type }
  }
  if (
    value.type !== 'books' ||
    !Array.isArray(value.bookIds) ||
    value.bookIds.length === 0 ||
    !value.bookIds.every((bookId) => typeof bookId === 'string' && chapterCountByBookId.has(bookId)) ||
    new Set(value.bookIds).size !== value.bookIds.length
  ) {
    return null
  }
  return { type: 'books', bookIds: [...value.bookIds] as string[] }
}

function rangeIncludesBook(range: PlanRange, bookId: string): boolean {
  if (range.type === 'all') return true
  if (range.type === 'books') return range.bookIds.includes(bookId)
  return testamentByBookId.get(bookId) === range.type
}

function toChapterRef(value: unknown, range: PlanRange): ChapterRef | null {
  const chapterCount = isRecord(value) && typeof value.bookId === 'string'
    ? chapterCountByBookId.get(value.bookId)
    : undefined
  if (
    !isRecord(value) ||
    typeof value.bookId !== 'string' ||
    chapterCount === undefined ||
    !rangeIncludesBook(range, value.bookId) ||
    !Number.isInteger(value.chapter) ||
    (value.chapter as number) < 1 ||
    (value.chapter as number) > chapterCount
  ) {
    return null
  }
  return { bookId: value.bookId, chapter: value.chapter as number }
}

function toReadingPlan(value: unknown, expectedKind: PlanKind): ReadingPlan | null {
  if (!isRecord(value) || !isRecord(value.request) || !Array.isArray(value.schedule)) return null
  const request = value.request
  const range = toPlanRange(request.range)
  if (
    typeof request.id !== 'string' || request.id.trim().length === 0 ||
    typeof request.name !== 'string' || request.name.trim().length === 0 ||
    request.kind !== expectedKind ||
    !isLocalDate(request.startDate) || !isLocalDate(request.endDate) ||
    request.startDate > request.endDate ||
    !Array.isArray(request.weekdays) || request.weekdays.length === 0 ||
    !request.weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) ||
    new Set(request.weekdays).size !== request.weekdays.length ||
    range === null ||
    (request.order !== 'canonical' && request.order !== 'old-new-parallel') ||
    (request.missedDayPolicy !== 'carry' &&
      request.missedDayPolicy !== 'redistribute' &&
      request.missedDayPolicy !== 'restart-today') ||
    !isIsoDate(value.createdAt) ||
    value.schedule.length === 0
  ) {
    return null
  }

  const weekdays = [...request.weekdays] as Weekday[]
  const schedule: PlanDay[] = []
  const scheduledChapters = new Set<string>()
  let previousDate: string | null = null
  for (const rawDay of value.schedule) {
    if (
      !isRecord(rawDay) ||
      !isLocalDate(rawDay.date) ||
      rawDay.date < request.startDate ||
      (request.missedDayPolicy !== 'restart-today' && rawDay.date > request.endDate) ||
      (previousDate !== null && rawDay.date <= previousDate) ||
      !weekdays.includes(localWeekday(rawDay.date) as Weekday) ||
      !Array.isArray(rawDay.chapters) ||
      rawDay.chapters.length === 0
    ) {
      return null
    }
    const chapters: ChapterRef[] = []
    for (const rawChapter of rawDay.chapters) {
      const chapter = toChapterRef(rawChapter, range)
      if (chapter === null) return null
      const key = `${chapter.bookId}:${chapter.chapter}`
      if (scheduledChapters.has(key)) return null
      scheduledChapters.add(key)
      chapters.push(chapter)
    }
    schedule.push({ date: rawDay.date, chapters })
    previousDate = rawDay.date
  }

  const reconstructedRequest: PlanRequest = {
    id: request.id,
    name: request.name,
    kind: expectedKind,
    startDate: request.startDate,
    endDate: request.endDate,
    weekdays,
    range,
    order: request.order,
    missedDayPolicy: request.missedDayPolicy,
  }
  return { request: reconstructedRequest, schedule, createdAt: value.createdAt }
}

function toReadingEvent(value: unknown): ReadingEvent | null {
  const chapterCount = isRecord(value) && typeof value.bookId === 'string'
    ? chapterCountByBookId.get(value.bookId)
    : undefined

  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.bookId !== 'string' ||
    chapterCount === undefined ||
    !Number.isInteger(value.chapter) ||
    (value.chapter as number) < 1 ||
    (value.chapter as number) > chapterCount ||
    (value.delta !== 1 && value.delta !== -1) ||
    !isIsoDate(value.occurredAt) ||
    (value.batchId !== undefined && typeof value.batchId !== 'string') ||
    (value.undoneEventId !== undefined && typeof value.undoneEventId !== 'string')
  ) {
    return null
  }

  return {
    id: value.id,
    bookId: value.bookId,
    chapter: value.chapter as number,
    delta: value.delta,
    occurredAt: value.occurredAt,
    ...(value.batchId === undefined ? {} : { batchId: value.batchId }),
    ...(value.undoneEventId === undefined ? {} : { undoneEventId: value.undoneEventId }),
  }
}

function hasValidEventSequence(events: readonly ReadingEvent[]): boolean {
  const eventsById = new Map<string, ReadingEvent>()
  const undoneEventIds = new Set<string>()
  const counts = new Map<string, number>()

  for (const event of events) {
    if (eventsById.has(event.id)) return false

    if (event.undoneEventId !== undefined) {
      const target = eventsById.get(event.undoneEventId)
      if (
        target === undefined ||
        undoneEventIds.has(target.id) ||
        target.bookId !== event.bookId ||
        target.chapter !== event.chapter ||
        target.delta !== -event.delta
      ) {
        return false
      }
      undoneEventIds.add(target.id)
    }

    const key = `${event.bookId}:${event.chapter}`
    const nextCount = (counts.get(key) ?? 0) + event.delta
    if (nextCount < 0) return false
    counts.set(key, nextCount)
    eventsById.set(event.id, event)
  }

  return true
}

function migrateLegacyPrototype(value: UnknownRecord): AppState {
  const defaults = createDefaultAppState()
  const readingEvents = Array.isArray(value.readingEvents)
    ? value.readingEvents.reduce<ReadingEvent[]>((safeEvents, event) => {
        const mapped = toReadingEvent(event)
        if (mapped !== null && hasValidEventSequence([...safeEvents, mapped])) {
          safeEvents.push(mapped)
        }
        return safeEvents
      }, [])
    : []

  return { ...defaults, readingEvents }
}

function isCurrentAppState(value: UnknownRecord): value is UnknownRecord & AppState {
  if (
    !Array.isArray(value.readingEvents) ||
    !value.readingEvents.every((event) => toReadingEvent(event) !== null) ||
    (value.commonPlan !== null && toReadingPlan(value.commonPlan, 'common') === null) ||
    (value.personalPlan !== null && toReadingPlan(value.personalPlan, 'personal') === null) ||
    !isRecord(value.settings)
  ) {
    return false
  }

  const readingEvents = value.readingEvents.map(
    (event) => toReadingEvent(event) as ReadingEvent,
  )
  if (!hasValidEventSequence(readingEvents)) {
    return false
  }

  const { theme, readerName, reminder } = value.settings
  return (
    (theme === 'light' || theme === 'dark') &&
    typeof readerName === 'string' &&
    (reminder === null || isRecord(reminder))
  )
}

export function migrateToCurrentSchema(value: unknown): AppState {
  if (!isRecord(value)) {
    throw new InvalidStorageDataError()
  }

  if (!('schemaVersion' in value)) {
    if (!Array.isArray(value.readingEvents)) {
      throw new InvalidStorageDataError()
    }
    return migrateLegacyPrototype(value)
  }

  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(value.schemaVersion)
  }

  if (!isCurrentAppState(value)) {
    throw new InvalidStorageDataError()
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    readingEvents: value.readingEvents.map((event) => toReadingEvent(event) as ReadingEvent),
    commonPlan: value.commonPlan === null
      ? null
      : toReadingPlan(value.commonPlan, 'common') as ReadingPlan,
    personalPlan: value.personalPlan === null
      ? null
      : toReadingPlan(value.personalPlan, 'personal') as ReadingPlan,
    settings: {
      theme: value.settings.theme,
      readerName: value.settings.readerName,
      reminder:
        value.settings.reminder === null ? null : { ...value.settings.reminder },
    },
  }
}
