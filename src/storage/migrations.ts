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
    (value.commonPlan !== null && !isRecord(value.commonPlan)) ||
    (value.personalPlan !== null && !isRecord(value.personalPlan)) ||
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
    commonPlan: value.commonPlan === null ? null : { ...value.commonPlan },
    personalPlan: value.personalPlan === null ? null : { ...value.personalPlan },
    settings: {
      theme: value.settings.theme,
      readerName: value.settings.readerName,
      reminder:
        value.settings.reminder === null ? null : { ...value.settings.reminder },
    },
  }
}
