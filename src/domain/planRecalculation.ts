import { bibleBooks } from '../data/bibleBooks'
import type {
  ChapterRef,
  MissedDayPolicy,
  PlanDay,
  ReadingPlan,
  Weekday,
} from './planTypes'

/**
 * `history` contains only completed assignments dated before `today`.
 * `schedule` is the actionable schedule from `today` onward; completed chapters
 * never appear in it. For `carry`, carried chapters are represented only in the
 * effective `today` entry, so even malformed duplicate future assignments do not
 * make them actionable twice.
 */
export type PlanRecalculationResult = Readonly<{
  policy: MissedDayPolicy
  today: string
  normalizedCompletedChapters: readonly ChapterRef[]
  history: readonly PlanDay[]
  todayAssignment: readonly ChapterRef[]
  schedule: readonly PlanDay[]
  lastScheduledDate: string | null
}>

export type RecalculatePlanInput = Readonly<{
  plan: ReadingPlan
  today: string
  completedChapters: readonly ChapterRef[]
  policy?: MissedDayPolicy
}>

const chapterKey = ({ bookId, chapter }: ChapterRef): string => `${bookId}:${chapter}`
const chapterLimits = new Map(bibleBooks.map((book) => [book.id, book.chapters]))

const normalizeCompletedChapters = (
  chapters: readonly ChapterRef[],
): readonly ChapterRef[] => {
  const seen = new Set<string>()

  return chapters.filter((item) => {
    const chapterLimit = chapterLimits.get(item.bookId)
    const key = chapterKey(item)
    if (
      chapterLimit === undefined ||
      !Number.isInteger(item.chapter) ||
      item.chapter < 1 ||
      item.chapter > chapterLimit ||
      seen.has(key)
    ) {
      return false
    }
    seen.add(key)
    return true
  })
}

const uniqueChapters = (chapters: readonly ChapterRef[]): readonly ChapterRef[] => {
  const seen = new Set<string>()
  return chapters.filter((item) => {
    const key = chapterKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

const formatDateKey = (date: Date): string =>
  `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`

const isValidDateKey = (dateKey: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
  formatDateKey(parseDateKey(dateKey)) === dateKey

const addLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12)

const readingDates = (
  startDate: string,
  endDate: string,
  weekdays: readonly Weekday[],
  limit = Number.POSITIVE_INFINITY,
): readonly string[] => {
  const selected = new Set<number>(weekdays)
  const dates: string[] = []

  for (
    let cursor = parseDateKey(startDate);
    formatDateKey(cursor) <= endDate && dates.length < limit;
    cursor = addLocalDay(cursor)
  ) {
    if (selected.has(cursor.getDay())) dates.push(formatDateKey(cursor))
  }
  return dates
}

const nextReadingDates = (
  startDate: string,
  weekdays: readonly Weekday[],
  count: number,
): readonly string[] => {
  const selected = new Set<number>(weekdays)
  const dates: string[] = []

  for (
    let cursor = parseDateKey(startDate);
    dates.length < count;
    cursor = addLocalDay(cursor)
  ) {
    if (selected.has(cursor.getDay())) dates.push(formatDateKey(cursor))
  }
  return dates
}

const distribute = (
  chapters: readonly ChapterRef[],
  dates: readonly string[],
): readonly PlanDay[] => {
  const baseSize = Math.floor(chapters.length / dates.length)
  const remainder = chapters.length % dates.length
  let offset = 0

  return dates.map((date, index) => {
    const size = baseSize + (index < remainder ? 1 : 0)
    const day = { date, chapters: chapters.slice(offset, offset + size) }
    offset += size
    return day
  })
}

export const recalculatePlan = ({
  plan,
  today,
  completedChapters,
  policy = plan.request.missedDayPolicy,
}: RecalculatePlanInput): PlanRecalculationResult => {
  if (!isValidDateKey(today)) {
    throw new Error('오늘 날짜는 유효한 YYYY-MM-DD 로컬 날짜여야 합니다.')
  }
  if (policy !== 'carry' && plan.request.weekdays.length === 0) {
    throw new Error('읽는 요일을 하나 이상 선택해야 합니다.')
  }
  if (
    policy !== 'carry' &&
    plan.request.weekdays.some(
      (weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6,
    )
  ) {
    throw new Error('읽는 요일은 0(일요일)부터 6(토요일) 사이여야 합니다.')
  }

  const normalizedCompletedChapters = normalizeCompletedChapters(completedChapters)
  const completedKeys = new Set(normalizedCompletedChapters.map(chapterKey))
  const history = plan.schedule
    .filter((day) => day.date < today)
    .map((day) => ({
      date: day.date,
      chapters: day.chapters.filter((item) => completedKeys.has(chapterKey(item))),
    }))
    .filter((day) => day.chapters.length > 0)
  const remaining = uniqueChapters(plan.schedule.flatMap((day) => day.chapters)).filter(
    (item) => !completedKeys.has(chapterKey(item)),
  )

  let schedule: readonly PlanDay[]
  let todayAssignment: readonly ChapterRef[]

  if (policy === 'carry') {
    const pastIncomplete = uniqueChapters(
      plan.schedule
        .filter((day) => day.date < today)
        .flatMap((day) => day.chapters),
    ).filter((item) => !completedKeys.has(chapterKey(item)))
    const originalToday = uniqueChapters(
      plan.schedule
        .filter((day) => day.date === today)
        .flatMap((day) => day.chapters),
    ).filter((item) => !completedKeys.has(chapterKey(item)))
    todayAssignment = uniqueChapters([...pastIncomplete, ...originalToday])
    const carriedKeys = new Set(pastIncomplete.map(chapterKey))
    const future = plan.schedule
      .filter((day) => day.date > today)
      .map((day) => ({
        date: day.date,
        chapters: uniqueChapters(day.chapters).filter(
          (item) =>
            !completedKeys.has(chapterKey(item)) && !carriedKeys.has(chapterKey(item)),
        ),
      }))
      .filter((day) => day.chapters.length > 0)
    schedule = [
      ...(todayAssignment.length > 0 ? [{ date: today, chapters: todayAssignment }] : []),
      ...future,
    ]
  } else if (remaining.length === 0) {
    schedule = []
    todayAssignment = []
  } else {
    const dates =
      policy === 'restart-today'
        ? nextReadingDates(today, plan.request.weekdays, plan.schedule.length)
        : readingDates(today, plan.request.endDate, plan.request.weekdays)
    if (policy === 'redistribute' && remaining.length > 0 && dates.length === 0) {
      throw new Error(
        '기존 종료일까지 남은 읽는 날이 없어 미완료 장을 재분배할 수 없습니다.',
      )
    }
    schedule = distribute(remaining, dates.slice(0, remaining.length))
    todayAssignment = schedule.find((day) => day.date === today)?.chapters ?? []
  }

  return {
    policy,
    today,
    normalizedCompletedChapters,
    history,
    todayAssignment,
    schedule,
    lastScheduledDate: schedule.at(-1)?.date ?? null,
  }
}
