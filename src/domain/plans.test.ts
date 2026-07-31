import { describe, expect, it } from 'vitest'
import type { PlanRequest } from './planTypes'
import { createPlanPreview, generateReadingPlan } from './plans'

function request(overrides: Partial<PlanRequest> = {}): PlanRequest {
  return {
    id: 'plan-1',
    name: '테스트 계획',
    kind: 'personal',
    startDate: '2026-08-01',
    endDate: '2026-08-04',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    range: { type: 'books', bookIds: ['ruth'] },
    order: 'canonical',
    missedDayPolicy: 'carry',
    ...overrides,
  }
}

describe('generateReadingPlan', () => {
  it('시작일과 종료일을 포함하고 선택한 요일에만 정경 순서로 장을 배치한다', () => {
    const plan = generateReadingPlan(request({
      endDate: '2026-08-09',
      weekdays: [1, 3, 5],
    }), '2026-07-31T12:00:00.000Z')

    expect(plan.createdAt).toBe('2026-07-31T12:00:00.000Z')
    expect(plan.schedule.map((day) => day.date)).toEqual([
      '2026-08-03',
      '2026-08-05',
      '2026-08-07',
    ])
    expect(plan.schedule.flatMap((day) => day.chapters)).toEqual([
      { bookId: 'ruth', chapter: 1 },
      { bookId: 'ruth', chapter: 2 },
      { bookId: 'ruth', chapter: 3 },
      { bookId: 'ruth', chapter: 4 },
    ])
    expect(plan.schedule.map((day) => day.chapters.length)).toEqual([2, 1, 1])
  })

  it('books 범위는 입력 순서와 무관하게 정경 순서로 배치한다', () => {
    const plan = generateReadingPlan(request({
      startDate: '2026-08-01',
      endDate: '2026-08-01',
      range: { type: 'books', bookIds: ['matthew', 'ruth'] },
    }), '2026-07-31T12:00:00.000Z')

    expect(plan.schedule[0].chapters.slice(0, 5)).toEqual([
      { bookId: 'ruth', chapter: 1 },
      { bookId: 'ruth', chapter: 2 },
      { bookId: 'ruth', chapter: 3 },
      { bookId: 'ruth', chapter: 4 },
      { bookId: 'matthew', chapter: 1 },
    ])
  })

  it('구약·신약 병행은 한 장씩 번갈아가며 한쪽 소진 뒤 나머지를 잇는다', () => {
    const plan = generateReadingPlan(request({
      startDate: '2026-08-01',
      endDate: '2026-08-01',
      range: { type: 'all' },
      order: 'old-new-parallel',
    }), '2026-07-31T12:00:00.000Z')
    const chapters = plan.schedule[0].chapters

    expect(chapters.slice(0, 4)).toEqual([
      { bookId: 'genesis', chapter: 1 },
      { bookId: 'matthew', chapter: 1 },
      { bookId: 'genesis', chapter: 2 },
      { bookId: 'matthew', chapter: 2 },
    ])
    expect(chapters.slice(518, 522)).toEqual([
      { bookId: 'first-samuel', chapter: 24 },
      { bookId: 'revelation', chapter: 22 },
      { bookId: 'first-samuel', chapter: 25 },
      { bookId: 'first-samuel', chapter: 26 },
    ])
    expect(chapters).toHaveLength(1189)
    expect(new Set(chapters.map(({ bookId, chapter }) => `${bookId}:${chapter}`)).size).toBe(1189)
  })

  it('all·old·new 범위는 각각 1,189장·929장·260장을 선택한다', () => {
    const chapterCount = (range: PlanRequest['range']) => generateReadingPlan(request({
      startDate: '2026-08-01',
      endDate: '2026-08-01',
      range,
    }), '2026-07-31T12:00:00.000Z').schedule[0].chapters.length

    expect(chapterCount({ type: 'all' })).toBe(1189)
    expect(chapterCount({ type: 'old' })).toBe(929)
    expect(chapterCount({ type: 'new' })).toBe(260)
  })

  it('장 수보다 읽는 날짜가 많아도 빈 일정 날짜를 만들지 않는다', () => {
    const plan = generateReadingPlan(request({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      range: { type: 'books', bookIds: ['ruth'] },
    }), '2026-07-31T12:00:00.000Z')

    expect(plan.schedule).toHaveLength(4)
    expect(plan.schedule.every((day) => day.chapters.length === 1)).toBe(true)
    expect(createPlanPreview(plan).readingDays).toBe(4)
  })

  it('중복 요일은 제거하고 오름차순으로 정규화한다', () => {
    const plan = generateReadingPlan(request({ weekdays: [6, 0, 6, 3] }), '2026-07-31T12:00:00.000Z')

    expect(plan.request.weekdays).toEqual([0, 3, 6])
  })

  it('생성 후 원본 books 배열을 변경해도 계획 범위는 바뀌지 않는다', () => {
    const bookIds = ['ruth']
    const plan = generateReadingPlan(
      request({ range: { type: 'books', bookIds } }),
      '2026-07-31T12:00:00.000Z',
    )

    bookIds.push('matthew')

    expect(plan.request.range).toEqual({ type: 'books', bookIds: ['ruth'] })
  })

  it('알 수 없는 읽기 순서와 잘못된 생성 시각을 거부한다', () => {
    expect(() => generateReadingPlan(request({
      order: 'unknown' as PlanRequest['order'],
    }), '2026-07-31T12:00:00.000Z')).toThrow('지원하지 않는 읽기 순서입니다: unknown')
    expect(() => generateReadingPlan(request(), 'created-at')).toThrow(
      '생성 시각은 유효한 ISO 8601 시각이어야 합니다.',
    )
    expect(() => generateReadingPlan(request(), '2026-02-30T12:00:00.000Z')).toThrow(
      '생성 시각은 유효한 ISO 8601 시각이어야 합니다.',
    )
  })

  it('지원 가능한 마지막 날짜 하루만 계획해도 순회를 종료한다', () => {
    const plan = generateReadingPlan(request({
      startDate: '9999-12-31',
      endDate: '9999-12-31',
      weekdays: [5],
      range: { type: 'books', bookIds: ['obadiah'] },
    }), '2026-07-31T12:00:00.000Z')

    expect(plan.schedule).toEqual([
      { date: '9999-12-31', chapters: [{ bookId: 'obadiah', chapter: 1 }] },
    ])
  })

  it.each([
    { range: { type: 'books', bookIds: ['ruth', 'ruth'] } as const, message: '책 목록에 중복된 ID가 있습니다: ruth' },
    { range: { type: 'books', bookIds: ['unknown'] } as const, message: '알 수 없는 성경 책 ID입니다: unknown' },
    { range: { type: 'books', bookIds: [] } as const, message: '계획 범위에 책이 없습니다.' },
  ])('잘못된 books 범위를 구체적으로 거부한다: $message', ({ range, message }) => {
    expect(() => generateReadingPlan(request({ range }), '2026-07-31T12:00:00.000Z')).toThrow(message)
  })

  it.each([
    { changes: { startDate: '2026-02-29' }, message: '시작일이 유효한 YYYY-MM-DD 날짜가 아닙니다.' },
    { changes: { endDate: '2026-04-31' }, message: '종료일이 유효한 YYYY-MM-DD 날짜가 아닙니다.' },
    { changes: { startDate: '2026-08-05', endDate: '2026-08-04' }, message: '종료일은 시작일보다 빠를 수 없습니다.' },
    { changes: { weekdays: [] }, message: '읽는 요일을 하나 이상 선택해야 합니다.' },
    { changes: { weekdays: [7] as unknown as PlanRequest['weekdays'] }, message: '요일은 0부터 6 사이여야 합니다: 7' },
    { changes: { startDate: '2026-08-03', endDate: '2026-08-03', weekdays: [2] }, message: '기간 안에 선택한 읽는 날이 없습니다.' },
  ])('잘못된 날짜·읽는 날 요청을 구체적으로 거부한다: $message', ({ changes, message }) => {
    expect(() => generateReadingPlan(request(changes as Partial<PlanRequest>), '2026-07-31T12:00:00.000Z')).toThrow(message)
  })
})

describe('createPlanPreview', () => {
  it('총장·읽는날·평균·첫7일·마지막날·하루 10장 이상 경고를 요약한다', () => {
    const plan = generateReadingPlan(request({
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      range: { type: 'new' },
    }), '2026-07-31T12:00:00.000Z')

    const preview = createPlanPreview(plan)

    expect(preview).toEqual({
      totalChapters: 260,
      readingDays: 2,
      averageChaptersPerDay: 130,
      firstSevenDays: plan.schedule,
      lastScheduledDate: '2026-08-02',
      hasHeavyDay: true,
    })
  })
})
