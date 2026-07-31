import { generateReadingPlan } from './plans'
import type { PlanRequest } from './planTypes'
import { createAppStateRepository, type StorageLike } from '../storage/repository'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

function request(overrides: Partial<PlanRequest>): PlanRequest {
  return {
    id: 'integration-plan',
    name: '통합 계획',
    kind: 'personal',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    range: { type: 'all' },
    order: 'canonical',
    missedDayPolicy: 'redistribute',
    ...overrides,
  }
}

describe('plan engine and storage integration', () => {
  it('전체 성경 계획을 생성해 저장하고 같은 구조로 복원한다', () => {
    const storage = new MemoryStorage()
    const repository = createAppStateRepository(storage)
    const plan = generateReadingPlan(
      request({ kind: 'personal' }),
      '2026-07-31T14:00:00.000Z',
    )

    repository.save({ ...repository.load(), personalPlan: plan })

    expect(createAppStateRepository(storage).load().personalPlan).toEqual(plan)
  })

  it('읽는 날보다 장 수가 적은 특정 책 계획도 빈 날짜 없이 저장한다', () => {
    const storage = new MemoryStorage()
    const repository = createAppStateRepository(storage)
    const plan = generateReadingPlan(
      request({
        kind: 'common',
        range: { type: 'books', bookIds: ['ruth'] },
      }),
      '2026-07-31T14:00:00.000Z',
    )

    expect(plan.schedule).toHaveLength(4)
    repository.save({ ...repository.load(), commonPlan: plan })
    expect(repository.load().commonPlan).toEqual(plan)
  })
})
