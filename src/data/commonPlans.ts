import type { PlanPreset, PlanRequest, Weekday } from '../domain/planTypes'

type CalendarDate = Readonly<{ year: number; month: number; day: number }>

export type PresetPlanOptions = Readonly<{
  id: string
  name: string
  startDate: string
  preset: PlanPreset
  weekdays?: readonly Weekday[]
}>

const ALL_WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6]

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

function addDays(date: CalendarDate, amount: number): CalendarDate {
  let { year, month, day } = date
  for (let remaining = amount; remaining > 0; remaining -= 1) {
    day += 1
    if (day > daysInMonth(year, month)) {
      day = 1
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
    }
  }
  for (let remaining = amount; remaining < 0; remaining += 1) {
    day -= 1
    if (day < 1) {
      month -= 1
      if (month < 1) {
        month = 12
        year -= 1
      }
      day = daysInMonth(year, month)
    }
  }
  return { year, month, day }
}

function addMonthsClamped(date: CalendarDate, months: number): CalendarDate {
  const monthIndex = date.year * 12 + date.month - 1 + months
  const year = Math.floor(monthIndex / 12)
  const month = monthIndex % 12 + 1
  return { year, month, day: Math.min(date.day, daysInMonth(year, month)) }
}

export function resolvePresetEndDate(startDate: string, preset: PlanPreset): string {
  const parsed = parseDateKey(startDate)
  if (!parsed) throw new Error('유효한 YYYY-MM-DD 시작일이 필요합니다.')

  const endDate = preset === 'ninety-days'
    ? addDays(parsed, 89)
    : addDays(addMonthsClamped(parsed, preset === 'one-year' ? 12 : 6), -1)
  return formatDateKey(endDate)
}

export function createPresetPlanRequest(options: PresetPlanOptions): PlanRequest {
  const weekdays = [...new Set(options.weekdays ?? ALL_WEEKDAYS)].sort((left, right) => left - right)
  if (weekdays.length === 0) throw new Error('읽는 요일을 하나 이상 선택해야 합니다.')
  const invalidWeekday = weekdays.find((weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6)
  if (invalidWeekday !== undefined) throw new Error(`요일은 0부터 6 사이여야 합니다: ${invalidWeekday}`)
  return {
    id: options.id,
    name: options.name,
    kind: 'common',
    startDate: options.startDate,
    endDate: resolvePresetEndDate(options.startDate, options.preset),
    weekdays,
    range: { type: 'all' },
    order: 'canonical',
    missedDayPolicy: 'carry',
  }
}
