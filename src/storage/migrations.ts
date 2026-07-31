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

function migrateLegacyPrototype(value: UnknownRecord): AppState {
  const defaults = createDefaultAppState()
  const readingEvents = Array.isArray(value.readingEvents)
    ? value.readingEvents.flatMap((event) => {
        const mapped = toReadingEvent(event)
        return mapped === null ? [] : [mapped]
      })
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
