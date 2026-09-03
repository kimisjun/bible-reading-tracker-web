import type { ReadingEvent } from './reading'

const KOREA_TIME_ZONE = 'Asia/Seoul'
const koreaYearFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: KOREA_TIME_ZONE,
  year: 'numeric',
})

function yearInKorea(date: Date): string | undefined {
  if (!Number.isFinite(date.getTime())) return undefined

  return koreaYearFormatter.formatToParts(date).find(({ type }) => type === 'year')?.value
}

export function filterReadingEventsForKoreaYear(
  events: readonly ReadingEvent[],
  now: Date,
): readonly ReadingEvent[] {
  const currentYear = yearInKorea(now)
  if (currentYear === undefined) throw new RangeError('현재 시각이 올바르지 않습니다.')

  const nowTime = now.getTime()
  return events.filter((event) => {
    const occurredAt = new Date(event.occurredAt)
    return occurredAt.getTime() <= nowTime && yearInKorea(occurredAt) === currentYear
  })
}
