import { describe, expect, it } from 'vitest'
import { createPresetPlanRequest, resolvePresetEndDate } from './commonPlans'

describe('resolvePresetEndDate', () => {
  it('1년 프리셋은 다음 해 같은 날짜 직전까지 포함한다', () => {
    expect(resolvePresetEndDate('2026-07-31', 'one-year')).toBe('2027-07-30')
  })

  it('윤년 2월 29일은 다음 해 2월 28일로 clamp한 뒤 그 직전까지로 정한다', () => {
    expect(resolvePresetEndDate('2024-02-29', 'one-year')).toBe('2025-02-27')
  })

  it('6개월 프리셋은 목표 월 말일로 clamp한 뒤 그 직전까지 포함한다', () => {
    expect(resolvePresetEndDate('2023-08-31', 'six-month')).toBe('2024-02-28')
    expect(resolvePresetEndDate('2024-08-31', 'six-month')).toBe('2025-02-27')
  })

  it('90일 프리셋은 시작일을 포함해 90일째에 끝난다', () => {
    expect(resolvePresetEndDate('2024-02-01', 'ninety-days')).toBe('2024-04-30')
  })

  it.each(['2026-02-29', '2026-04-31', '2026-7-01', 'not-a-date'])('실재하지 않거나 형식이 틀린 날짜 %s를 거부한다', (date) => {
    expect(() => resolvePresetEndDate(date, 'one-year')).toThrow('유효한 YYYY-MM-DD 시작일이 필요합니다.')
  })
})

describe('createPresetPlanRequest', () => {
  it('공통 전체 통독 프리셋 요청을 명시적인 기본 정책으로 만든다', () => {
    expect(createPresetPlanRequest({
      id: 'common-2026',
      name: '1년 성경 일독',
      startDate: '2026-01-01',
      preset: 'one-year',
    })).toEqual({
      id: 'common-2026',
      name: '1년 성경 일독',
      kind: 'common',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      range: { type: 'all' },
      order: 'canonical',
      missedDayPolicy: 'carry',
    })
  })

  it('선택 요일은 중복을 제거하고 오름차순으로 정규화한다', () => {
    const request = createPresetPlanRequest({
      id: 'weekday-plan',
      name: '주중 계획',
      startDate: '2026-01-01',
      preset: 'ninety-days',
      weekdays: [5, 1, 5, 3],
    })

    expect(request.weekdays).toEqual([1, 3, 5])
  })

  it('빈 요일과 0~6 밖의 요일을 구체적으로 거부한다', () => {
    const base = {
      id: 'invalid-weekdays',
      name: '잘못된 계획',
      startDate: '2026-01-01',
      preset: 'ninety-days' as const,
    }

    expect(() => createPresetPlanRequest({ ...base, weekdays: [] })).toThrow('읽는 요일을 하나 이상 선택해야 합니다.')
    expect(() => createPresetPlanRequest({
      ...base,
      weekdays: [7] as unknown as readonly import('../domain/planTypes').Weekday[],
    })).toThrow('요일은 0부터 6 사이여야 합니다: 7')
  })
})
