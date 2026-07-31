import type { ReadingEvent } from '../domain/reading'
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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
}

function toReadingEvent(value: unknown): ReadingEvent | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.bookId !== 'string' ||
    value.bookId.length === 0 ||
    !Number.isInteger(value.chapter) ||
    (value.chapter as number) < 1 ||
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
    return createDefaultAppState()
  }

  if (!('schemaVersion' in value)) {
    return migrateLegacyPrototype(value)
  }

  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(value.schemaVersion)
  }

  if (!isCurrentAppState(value)) {
    throw new InvalidStorageDataError()
  }

  return value
}
