import type { ReadingEvent } from './reading'

export type DailyReadingAmount = Readonly<{
  date: string
  label: '월' | '화' | '수' | '목' | '금' | '토' | '일'
  count: number
  isFuture: boolean
  isToday: boolean
}>

export type ReadingSummary = Readonly<{
  todayDate: string
  todayCount: number
  weekStartDate: string
  weekEndDate: string
  weekTotal: number
  days: readonly DailyReadingAmount[]
}>

const labels = ['월', '화', '수', '목', '금', '토', '일'] as const

function calendarKey(date: Date, timeZone: string): string | undefined {
  if (!Number.isFinite(date.getTime())) return undefined

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function shiftCalendarKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function calculateReadingSummary(
  events: readonly ReadingEvent[],
  now: Date,
  timeZone = 'Asia/Seoul',
): ReadingSummary {
  const todayDate = calendarKey(now, timeZone)
  if (!todayDate) throw new RangeError('현재 시각이 올바르지 않습니다.')

  const [year, month, day] = todayDate.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const weekStartDate = shiftCalendarKey(todayDate, weekday === 0 ? -6 : 1 - weekday)
  const counts = new Map<string, number>()
  const nowTime = now.getTime()
  const eligibleEvents = events.flatMap((event) => {
    const eventDate = new Date(event.occurredAt)
    const eventTime = eventDate.getTime()
    return Number.isFinite(eventTime) && eventTime <= nowTime ? [{ event, eventDate }] : []
  })
  const undoneEventIds = new Set(
    eligibleEvents.flatMap(({ event }) => (
      event.undoneEventId === undefined ? [] : [event.undoneEventId]
    )),
  )

  for (const { event: readingEvent, eventDate } of eligibleEvents) {
    if (
      readingEvent.delta !== 1
      || readingEvent.undoneEventId !== undefined
      || undoneEventIds.has(readingEvent.id)
    ) continue
    const date = calendarKey(eventDate, timeZone)
    if (date) counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  const days = labels.map((label, index): DailyReadingAmount => {
    const date = shiftCalendarKey(weekStartDate, index)
    return {
      date,
      label,
      count: counts.get(date) ?? 0,
      isFuture: date > todayDate,
      isToday: date === todayDate,
    }
  })

  return {
    todayDate,
    todayCount: counts.get(todayDate) ?? 0,
    weekStartDate,
    weekEndDate: days[6].date,
    weekTotal: days.reduce((total, item) => total + item.count, 0),
    days,
  }
}
