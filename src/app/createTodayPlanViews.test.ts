import type { ReadingEvent } from '../domain/reading'
import type { MissedDayPolicy, PlanKind, ReadingPlan } from '../domain/planTypes'
import { createTodayPlanViews, planOwnerKey } from './createTodayPlanViews'

const CREATED_AT = '2026-07-01T00:00:00.000Z'

function plan({
  id,
  kind,
  name,
  policy = 'carry',
  schedule,
}: {
  id: string
  kind: PlanKind
  name: string
  policy?: MissedDayPolicy
  schedule: ReadingPlan['schedule']
}): ReadingPlan {
  const dates = schedule.map(({ date }) => date)
  return {
    request: {
      id,
      kind,
      name,
      startDate: dates[0],
      endDate: dates.at(-1)!,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      range: { type: 'books', bookIds: [...new Set(schedule.flatMap((day) => day.chapters.map((chapter) => chapter.bookId)))] },
      order: 'canonical',
      missedDayPolicy: policy,
    },
    schedule,
    createdAt: CREATED_AT,
  }
}

function event(overrides: Partial<ReadingEvent> = {}): ReadingEvent {
  return {
    id: 'event-1',
    bookId: 'genesis',
    chapter: 1,
    delta: 1,
    occurredAt: '2026-08-01T03:00:00.000Z',
    ...overrides,
  }
}

describe('createTodayPlanViews', () => {
  it('계획이 없으면 빈 목록을 반환한다', () => {
    expect(createTodayPlanViews({
      commonPlan: null,
      personalPlan: null,
      events: [],
      today: '2026-08-01',
    })).toEqual([])
  })

  it('공통과 개인 계획의 오늘 분량을 안정된 순서와 한국어 책 이름으로 만든다', () => {
    const commonPlan = plan({
      id: 'same-id',
      kind: 'common',
      name: '공통 일독',
      schedule: [{ date: '2026-08-01', chapters: [{ bookId: 'genesis', chapter: 1 }] }],
    })
    const personalPlan = plan({
      id: 'same-id',
      kind: 'personal',
      name: '복음서 읽기',
      schedule: [{ date: '2026-08-01', chapters: [{ bookId: 'matthew', chapter: 5 }] }],
    })

    const views = createTodayPlanViews({
      commonPlan,
      personalPlan,
      events: [],
      today: '2026-08-01',
    })

    expect(views).toEqual([
      expect.objectContaining({
        planId: 'same-id',
        kind: 'common',
        name: '공통 일독',
        date: '2026-08-01',
        chapters: [{ bookId: 'genesis', chapter: 1, bookName: '창세기', completed: false }],
      }),
      expect.objectContaining({
        planId: 'same-id',
        kind: 'personal',
        name: '복음서 읽기',
        date: '2026-08-01',
        chapters: [{ bookId: 'matthew', chapter: 5, bookName: '마태복음', completed: false }],
      }),
    ])
  })

  it('이전 완료는 제외하고 오늘 완료와 밀린 미완료는 카드에 유지한다', () => {
    const commonPlan = plan({
      id: 'common-1',
      kind: 'common',
      name: '공통 일독',
      schedule: [
        {
          date: '2026-07-31',
          chapters: [
            { bookId: 'genesis', chapter: 1 },
            { bookId: 'genesis', chapter: 2 },
          ],
        },
        { date: '2026-08-01', chapters: [{ bookId: 'genesis', chapter: 3 }] },
      ],
    })
    const events = [
      event({ id: 'before', chapter: 1, occurredAt: '2026-07-31T03:00:00.000Z' }),
      event({ id: 'today', chapter: 3, occurredAt: '2026-08-01T03:00:00.000Z' }),
    ]

    const [view] = createTodayPlanViews({
      commonPlan,
      personalPlan: null,
      events,
      today: '2026-08-01',
    })

    expect(view.chapters).toEqual([
      { bookId: 'genesis', chapter: 2, bookName: '창세기', completed: false },
      { bookId: 'genesis', chapter: 3, bookName: '창세기', completed: true },
    ])
    expect(view.statusMessage).toBe('밀린 분량 1장 포함')
    expect(view.justCompleted).toBe(false)
  })

  it('kind와 encoded plan ID로 최근 활성 batch를 계획별로 복원한다', () => {
    const commonPlan = plan({
      id: 'same:id',
      kind: 'common',
      name: '공통 일독',
      schedule: [{ date: '2026-08-01', chapters: [{ bookId: 'genesis', chapter: 1 }] }],
    })
    const personalPlan = plan({
      id: 'same:id',
      kind: 'personal',
      name: '개인 일독',
      schedule: [{ date: '2026-08-01', chapters: [{ bookId: 'matthew', chapter: 1 }] }],
    })
    const events = [
      event({
        id: 'common-batch-event',
        batchId: 'plan:common:same%3Aid:batch-1',
      }),
      event({
        id: 'personal-batch-event',
        bookId: 'matthew',
        batchId: 'plan:personal:same%3Aid:batch-2',
      }),
      event({
        id: 'personal-batch-undo',
        bookId: 'matthew',
        delta: -1,
        batchId: 'plan:personal:same%3Aid:batch-2',
        undoneEventId: 'personal-batch-event',
        occurredAt: '2026-08-01T04:00:00.000Z',
      }),
    ]

    const views = createTodayPlanViews({
      commonPlan,
      personalPlan,
      events,
      today: '2026-08-01',
      justCompletedKeys: new Set([planOwnerKey('common', 'same:id')]),
    })

    expect(views[0]).toMatchObject({
      kind: 'common',
      recentBatchId: 'plan:common:same%3Aid:batch-1',
      justCompleted: true,
    })
    expect(views[1]).toMatchObject({
      kind: 'personal',
      justCompleted: false,
    })
    expect(views[1].recentBatchId).toBeUndefined()
  })
})
