import { bibleBooks, type BibleBook } from '../data/bibleBooks'
import type { ChapterRef, PlanPreview, PlanRequest, ReadingPlan, Weekday } from './planTypes'

type CalendarDate = Readonly<{ year: number; month: number; day: number }>

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function parseDateKey(dateKey: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null
  }
  return { year, month, day }
}

function formatDateKey(date: CalendarDate): string {
  return `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
}

function nextDay(date: CalendarDate): CalendarDate {
  if (date.day < daysInMonth(date.year, date.month)) {
    return { ...date, day: date.day + 1 }
  }
  if (date.month < 12) return { year: date.year, month: date.month + 1, day: 1 }
  return { year: date.year + 1, month: 1, day: 1 }
}

function weekdayOf({ year, month, day }: CalendarDate): Weekday {
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
  const adjustedYear = month < 3 ? year - 1 : year
  return (adjustedYear + Math.floor(adjustedYear / 4) - Math.floor(adjustedYear / 100)
    + Math.floor(adjustedYear / 400) + offsets[month - 1] + day) % 7 as Weekday
}

function chaptersForBooks(books: readonly BibleBook[]): ChapterRef[] {
  return books.flatMap((book) => Array.from(
    { length: book.chapters },
    (_, index) => ({ bookId: book.id, chapter: index + 1 }),
  ))
}

function selectedBooks(request: PlanRequest): readonly BibleBook[] {
  if (request.range.type === 'all') return bibleBooks
  if (request.range.type === 'old' || request.range.type === 'new') {
    return bibleBooks.filter((book) => book.testament === request.range.type)
  }
  if (request.range.type !== 'books') throw new Error(`지원하지 않는 계획 범위입니다: ${request.range.type}`)
  if (request.range.bookIds.length === 0) throw new Error('계획 범위에 책이 없습니다.')
  const selectedIds = new Set<string>()
  for (const bookId of request.range.bookIds) {
    if (selectedIds.has(bookId)) throw new Error(`책 목록에 중복된 ID가 있습니다: ${bookId}`)
    if (!bibleBooks.some((book) => book.id === bookId)) {
      throw new Error(`알 수 없는 성경 책 ID입니다: ${bookId}`)
    }
    selectedIds.add(bookId)
  }
  return bibleBooks.filter((book) => selectedIds.has(book.id))
}

function orderedChapters(request: PlanRequest): ChapterRef[] {
  const books = selectedBooks(request)
  if (request.order === 'canonical') return chaptersForBooks(books)

  const oldChapters = chaptersForBooks(books.filter((book) => book.testament === 'old'))
  const newChapters = chaptersForBooks(books.filter((book) => book.testament === 'new'))
  const chapters: ChapterRef[] = []
  const longest = Math.max(oldChapters.length, newChapters.length)
  for (let index = 0; index < longest; index += 1) {
    if (oldChapters[index]) chapters.push(oldChapters[index])
    if (newChapters[index]) chapters.push(newChapters[index])
  }
  return chapters
}

function readingDates(request: PlanRequest): string[] {
  const start = parseDateKey(request.startDate)
  const end = parseDateKey(request.endDate)
  if (!start) throw new Error('시작일이 유효한 YYYY-MM-DD 날짜가 아닙니다.')
  if (!end) throw new Error('종료일이 유효한 YYYY-MM-DD 날짜가 아닙니다.')
  if (request.startDate > request.endDate) throw new Error('종료일은 시작일보다 빠를 수 없습니다.')
  if (request.weekdays.length === 0) throw new Error('읽는 요일을 하나 이상 선택해야 합니다.')
  const invalidWeekday = request.weekdays.find((weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6)
  if (invalidWeekday !== undefined) throw new Error(`요일은 0부터 6 사이여야 합니다: ${invalidWeekday}`)

  const selectedWeekdays = new Set<number>(request.weekdays)
  const dates: string[] = []
  for (let current = start; formatDateKey(current) <= request.endDate; current = nextDay(current)) {
    if (selectedWeekdays.has(weekdayOf(current))) dates.push(formatDateKey(current))
  }
  if (dates.length === 0) throw new Error('기간 안에 선택한 읽는 날이 없습니다.')
  return dates
}

export function generateReadingPlan(request: PlanRequest, createdAt: string): ReadingPlan {
  const normalizedRequest: PlanRequest = {
    ...request,
    weekdays: [...new Set(request.weekdays)].sort((left, right) => left - right),
  }
  const chapters = orderedChapters(normalizedRequest)
  if (chapters.length === 0) throw new Error('계획에 배치할 장이 없습니다.')
  const dates = readingDates(normalizedRequest).slice(0, chapters.length)
  const baseSize = Math.floor(chapters.length / dates.length)
  const remainder = chapters.length % dates.length
  let chapterIndex = 0
  const schedule = dates.map((date, dateIndex) => {
    const size = baseSize + (dateIndex < remainder ? 1 : 0)
    const day = { date, chapters: chapters.slice(chapterIndex, chapterIndex + size) }
    chapterIndex += size
    return day
  })
  return { request: normalizedRequest, schedule, createdAt }
}

export function createPlanPreview(plan: ReadingPlan): PlanPreview {
  const totalChapters = plan.schedule.reduce((total, day) => total + day.chapters.length, 0)
  const readingDays = plan.schedule.length
  return {
    totalChapters,
    readingDays,
    averageChaptersPerDay: totalChapters / readingDays,
    firstSevenDays: plan.schedule.slice(0, 7),
    lastScheduledDate: plan.schedule[readingDays - 1].date,
    hasHeavyDay: plan.schedule.some((day) => day.chapters.length >= 10),
  }
}
