import { recalculatePlan } from './planRecalculation'
import type { ChapterRef, ReadingPlan, Weekday } from './planTypes'

const chapter = (chapterNumber: number, bookId = 'genesis'): ChapterRef => ({
  bookId,
  chapter: chapterNumber,
})

const createPlan = (
  schedule: ReadingPlan['schedule'],
  overrides: Partial<ReadingPlan['request']> = {},
): ReadingPlan => ({
  request: {
    id: 'plan-1',
    name: '테스트 계획',
    kind: 'personal',
    startDate: '2024-02-26',
    endDate: '2024-03-03',
    weekdays: [1, 2, 3, 4, 5] as readonly Weekday[],
    range: { type: 'books', bookIds: ['genesis'] },
    order: 'canonical',
    missedDayPolicy: 'carry',
    ...overrides,
  },
  schedule,
  createdAt: '2024-02-01T00:00:00.000Z',
})

describe('recalculatePlan', () => {
  it('carry는 과거 미완료를 오늘 원래 분량 앞에 계획 순서로 누적하고 미래 일정을 유지한다', () => {
    const plan = createPlan([
      { date: '2024-02-26', chapters: [chapter(1), chapter(2)] },
      { date: '2024-02-27', chapters: [chapter(3)] },
      { date: '2024-02-28', chapters: [chapter(4)] },
      { date: '2024-02-29', chapters: [chapter(5)] },
    ])

    const result = recalculatePlan({
      plan,
      today: '2024-02-28',
      completedChapters: [chapter(1), chapter(3)],
      policy: 'carry',
    })

    expect(result.todayAssignment).toEqual([chapter(2), chapter(4)])
    expect(result.schedule).toEqual([
      { date: '2024-02-28', chapters: [chapter(2), chapter(4)] },
      { date: '2024-02-29', chapters: [chapter(5)] },
    ])
    expect(result.history).toEqual([
      { date: '2024-02-26', chapters: [chapter(1)] },
      { date: '2024-02-27', chapters: [chapter(3)] },
    ])
  })

  it('완료 ChapterRef는 유효한 성경 장만 중복 없이 정규화한다', () => {
    const plan = createPlan([
      { date: '2024-02-28', chapters: [chapter(1), chapter(2)] },
    ])

    const result = recalculatePlan({
      plan,
      today: '2024-02-28',
      completedChapters: [
        chapter(1),
        chapter(1),
        chapter(0),
        chapter(51),
        chapter(1, 'unknown-book'),
      ],
    })

    expect(result.normalizedCompletedChapters).toEqual([chapter(1)])
    expect(result.todayAssignment).toEqual([chapter(2)])
  })

  it('redistribute는 비읽는 오늘 이후 기존 종료일까지 남은 읽는 날에 미완료를 균등 재배분한다', () => {
    const plan = createPlan(
      [
        { date: '2024-02-26', chapters: [chapter(1), chapter(2)] },
        { date: '2024-02-28', chapters: [chapter(3), chapter(4)] },
        { date: '2024-03-01', chapters: [chapter(5)] },
      ],
      {
        endDate: '2024-03-03',
        weekdays: [3, 5],
        missedDayPolicy: 'redistribute',
      },
    )

    const result = recalculatePlan({
      plan,
      today: '2024-02-27',
      completedChapters: [chapter(1)],
    })

    expect(result.todayAssignment).toEqual([])
    expect(result.schedule).toEqual([
      { date: '2024-02-28', chapters: [chapter(2), chapter(3)] },
      { date: '2024-03-01', chapters: [chapter(4), chapter(5)] },
    ])
    expect(result.lastScheduledDate).toBe('2024-03-01')
  })

  it('redistribute는 미완료가 있지만 기존 종료일까지 남은 읽는 날이 없으면 구체 오류를 낸다', () => {
    const plan = createPlan(
      [{ date: '2024-02-26', chapters: [chapter(1)] }],
      { endDate: '2024-02-29', weekdays: [1], missedDayPolicy: 'redistribute' },
    )

    expect(() =>
      recalculatePlan({
        plan,
        today: '2024-03-01',
        completedChapters: [],
      }),
    ).toThrow('기존 종료일까지 남은 읽는 날이 없어 미완료 장을 재분배할 수 없습니다.')
  })

  it('restart-today는 오늘부터 선택 요일로 원래 읽는 날 수를 새로 만들고 종료일을 연장할 수 있다', () => {
    const plan = createPlan(
      [
        { date: '2024-02-26', chapters: [chapter(1), chapter(2)] },
        { date: '2024-02-28', chapters: [chapter(3), chapter(4)] },
        { date: '2024-03-01', chapters: [chapter(5), chapter(6)] },
      ],
      { endDate: '2024-03-03', weekdays: [1, 3] },
    )

    const result = recalculatePlan({
      plan,
      today: '2024-02-29',
      completedChapters: [chapter(1), chapter(4)],
      policy: 'restart-today',
    })

    expect(result.schedule).toEqual([
      { date: '2024-03-04', chapters: [chapter(2), chapter(3)] },
      { date: '2024-03-06', chapters: [chapter(5), chapter(6)] },
    ])
    expect(result.todayAssignment).toEqual([])
    expect(result.lastScheduledDate).toBe('2024-03-06')
    const dailySizes = result.schedule.map((day) => day.chapters.length)
    expect(Math.max(...dailySizes) - Math.min(...dailySizes)).toBeLessThanOrEqual(1)
    expect(result.history).toEqual([
      { date: '2024-02-26', chapters: [chapter(1)] },
      { date: '2024-02-28', chapters: [chapter(4)] },
    ])
  })

  it.each(['redistribute', 'restart-today'] as const)(
    '%s는 남은 장보다 날짜가 많아도 빈 일정 날짜를 만들지 않는다',
    (policy) => {
      const plan = createPlan(
        [
          { date: '2024-02-26', chapters: [chapter(1)] },
          { date: '2024-02-27', chapters: [chapter(2)] },
          { date: '2024-02-28', chapters: [chapter(3)] },
          { date: '2024-02-29', chapters: [chapter(4)] },
        ],
        { weekdays: [0, 1, 2, 3, 4, 5, 6], missedDayPolicy: policy },
      )

      const result = recalculatePlan({
        plan,
        today: '2024-02-26',
        completedChapters: [chapter(1), chapter(2), chapter(3)],
        policy,
      })

      expect(result.schedule).toHaveLength(1)
      expect(result.schedule[0].chapters).toEqual([chapter(4)])
    },
  )

  it('모든 장이 완료되면 재계산할 분량과 종료 예정일이 없다', () => {
    const plan = createPlan(
      [
        { date: '2024-02-26', chapters: [chapter(1)] },
        { date: '2024-02-28', chapters: [chapter(2)] },
      ],
      { missedDayPolicy: 'restart-today' },
    )

    const result = recalculatePlan({
      plan,
      today: '2024-02-29',
      completedChapters: [chapter(1), chapter(2)],
    })

    expect(result.schedule).toEqual([])
    expect(result.todayAssignment).toEqual([])
    expect(result.lastScheduledDate).toBeNull()
    expect(result.history).toEqual([
      { date: '2024-02-26', chapters: [chapter(1)] },
      { date: '2024-02-28', chapters: [chapter(2)] },
    ])
  })

  it('존재하지 않는 로컬 날짜키를 거부한다', () => {
    const plan = createPlan([{ date: '2024-02-28', chapters: [chapter(1)] }])

    expect(() =>
      recalculatePlan({
        plan,
        today: '2024-02-30',
        completedChapters: [],
      }),
    ).toThrow('오늘 날짜는 유효한 YYYY-MM-DD 로컬 날짜여야 합니다.')
  })

  it('재분배 정책에서 선택 요일이 비어 있으면 구체 오류를 낸다', () => {
    const plan = createPlan(
      [{ date: '2024-02-28', chapters: [chapter(1)] }],
      { weekdays: [], missedDayPolicy: 'redistribute' },
    )

    expect(() =>
      recalculatePlan({
        plan,
        today: '2024-02-28',
        completedChapters: [],
      }),
    ).toThrow('읽는 요일을 하나 이상 선택해야 합니다.')
  })

  it('carry는 미래에 중복된 과거 미완료 장을 오늘에만 한 번 배치한다', () => {
    const plan = createPlan([
      { date: '2024-02-26', chapters: [chapter(1)] },
      { date: '2024-02-28', chapters: [chapter(2)] },
      { date: '2024-02-29', chapters: [chapter(1), chapter(3)] },
    ])

    const result = recalculatePlan({
      plan,
      today: '2024-02-28',
      completedChapters: [],
    })

    expect(result.schedule).toEqual([
      { date: '2024-02-28', chapters: [chapter(1), chapter(2)] },
      { date: '2024-02-29', chapters: [chapter(3)] },
    ])
  })

  it('carry는 오늘·미래와 미래·미래 중복 장도 한 번만 실행 가능하게 남긴다', () => {
    const plan = createPlan([
      { date: '2024-02-28', chapters: [chapter(1), chapter(2)] },
      { date: '2024-02-29', chapters: [chapter(2), chapter(3)] },
      { date: '2024-03-01', chapters: [chapter(3), chapter(4)] },
    ])

    const result = recalculatePlan({ plan, today: '2024-02-28', completedChapters: [] })

    expect(result.schedule).toEqual([
      { date: '2024-02-28', chapters: [chapter(1), chapter(2)] },
      { date: '2024-02-29', chapters: [chapter(3)] },
      { date: '2024-03-01', chapters: [chapter(4)] },
    ])
  })

  it('restart-today는 기존 schedule 길이가 아니라 요청 기간의 원래 읽는 날 수를 사용한다', () => {
    const plan = createPlan(
      [{ date: '2024-02-26', chapters: [chapter(1), chapter(2), chapter(3), chapter(4), chapter(5), chapter(6)] }],
      { weekdays: [1, 2, 3, 4, 5], missedDayPolicy: 'restart-today' },
    )

    const result = recalculatePlan({
      plan,
      today: '2024-03-04',
      completedChapters: [],
    })

    expect(result.schedule.map((day) => day.date)).toEqual([
      '2024-03-04', '2024-03-05', '2024-03-06', '2024-03-07', '2024-03-08',
    ])
    expect(result.schedule.map((day) => day.chapters.length)).toEqual([2, 1, 1, 1, 1])
  })

  it('carry는 계획 종료 후에도 모든 미완료를 오늘 분량으로 누적한다', () => {
    const plan = createPlan([
      { date: '2024-02-26', chapters: [chapter(1), chapter(2)] },
    ])

    const result = recalculatePlan({
      plan,
      today: '2024-03-04',
      completedChapters: [chapter(1)],
    })

    expect(result.schedule).toEqual([
      { date: '2024-03-04', chapters: [chapter(2)] },
    ])
    expect(result.todayAssignment).toEqual([chapter(2)])
  })

  it('계획, 일정, 완료 입력을 변경하지 않는다', () => {
    const plan = createPlan([
      { date: '2024-02-26', chapters: [chapter(1), chapter(2)] },
      { date: '2024-02-28', chapters: [chapter(3)] },
    ])
    const completed = [chapter(1)]
    const planBefore = JSON.stringify(plan)
    const completedBefore = JSON.stringify(completed)

    recalculatePlan({
      plan,
      today: '2024-02-28',
      completedChapters: completed,
      policy: 'redistribute',
    })

    expect(JSON.stringify(plan)).toBe(planBefore)
    expect(JSON.stringify(completed)).toBe(completedBefore)
  })

  it('범위를 벗어난 선택 요일을 거부한다', () => {
    const plan = createPlan(
      [{ date: '2024-02-28', chapters: [chapter(1)] }],
      {
        weekdays: [7 as Weekday],
        missedDayPolicy: 'redistribute',
      },
    )

    expect(() =>
      recalculatePlan({
        plan,
        today: '2024-02-28',
        completedChapters: [],
      }),
    ).toThrow('읽는 요일은 0(일요일)부터 6(토요일) 사이여야 합니다.')
  })
})
