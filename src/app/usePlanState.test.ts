import { act, renderHook } from '@testing-library/react'
import type { ReadingPlan } from '../domain/planTypes'
import { APP_STATE_STORAGE_KEY, type StorageLike } from '../storage/repository'
import { usePlanState } from './usePlanState'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class FailingSaveStorage extends MemoryStorage {
  failSave = false

  override setItem(key: string, value: string): void {
    if (this.failSave) throw new DOMException('저장 공간이 부족합니다.', 'QuotaExceededError')
    super.setItem(key, value)
  }
}

describe('usePlanState', () => {
  it('공통·개인 계획을 읽고 저장하고 제거한다', () => {
    const storage = new MemoryStorage()
    const { result } = renderHook(() => usePlanState(storage))
    const common = planFixture('common')
    const personal = planFixture('personal')

    act(() => result.current.savePlan('common', common))
    act(() => result.current.savePlan('personal', personal))

    expect(result.current.commonPlan).toEqual(common)
    expect(result.current.personalPlan).toEqual(personal)
    act(() => result.current.removePlan('common'))
    expect(result.current.commonPlan).toBeNull()
    expect(result.current.personalPlan).toEqual(personal)
    expect(result.current.error).toBeNull()
  })

  it('같은 저장소의 두 hook가 번갈아 저장해도 상대 계획을 잃지 않는다', () => {
    const storage = new MemoryStorage()
    const first = renderHook(() => usePlanState(storage))
    const second = renderHook(() => usePlanState(storage))

    act(() => first.result.current.savePlan('common', planFixture('common')))
    act(() => second.result.current.savePlan('personal', planFixture('personal')))
    act(() => first.result.current.removePlan('common'))

    expect(first.result.current.commonPlan).toBeNull()
    expect(first.result.current.personalPlan).toEqual(planFixture('personal'))
    const durable = JSON.parse(storage.getItem(APP_STATE_STORAGE_KEY) ?? '{}') as {
      commonPlan: unknown
      personalPlan: unknown
    }
    expect(durable.commonPlan).toBeNull()
    expect(durable.personalPlan).toEqual(planFixture('personal'))
  })

  it('계획 슬롯과 request kind가 다르면 UI와 durable bytes를 보존하고 오류를 반환한다', () => {
    const storage = new MemoryStorage()
    const { result } = renderHook(() => usePlanState(storage))
    act(() => result.current.savePlan('common', planFixture('common')))
    const durableBytes = storage.getItem(APP_STATE_STORAGE_KEY)

    act(() => result.current.savePlan('common', planFixture('personal')))

    expect(result.current.commonPlan).toEqual(planFixture('common'))
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(durableBytes)
    expect(result.current.error?.name).toBe('InvalidStorageDataError')
  })

  it('저장 실패 시 UI와 durable bytes를 보존하고 오류를 반환한다', () => {
    const storage = new FailingSaveStorage()
    const { result } = renderHook(() => usePlanState(storage))
    act(() => result.current.savePlan('common', planFixture('common')))
    const durableBytes = storage.getItem(APP_STATE_STORAGE_KEY)
    storage.failSave = true

    act(() => result.current.savePlan('personal', planFixture('personal')))

    expect(result.current.personalPlan).toBeNull()
    expect(storage.getItem(APP_STATE_STORAGE_KEY)).toBe(durableBytes)
    expect(result.current.error?.name).toBe('QuotaExceededError')
  })

  it('초기 읽기 실패 시 null 계획과 복구 가능한 오류를 반환한다', () => {
    const storage: StorageLike = {
      getItem: () => { throw new DOMException('접근 거부', 'SecurityError') },
      setItem: () => undefined,
    }

    const { result } = renderHook(() => usePlanState(storage))

    expect(result.current.commonPlan).toBeNull()
    expect(result.current.personalPlan).toBeNull()
    expect(result.current.error?.name).toBe('SecurityError')
  })

  it('저장 후 검증·정규화된 객체를 UI에 반영하고 입력 변경과 격리한다', () => {
    const storage = new MemoryStorage()
    const { result } = renderHook(() => usePlanState(storage))
    const input = JSON.parse(JSON.stringify(planFixture('common'))) as ReadingPlan & {
      extraPlanField?: boolean
      request: ReadingPlan['request'] & { name: string }
    }
    input.extraPlanField = true

    act(() => result.current.savePlan('common', input))
    input.request.name = '나중에 변경한 이름'

    expect(result.current.commonPlan?.request.name).toBe('공통 계획')
    expect(result.current.commonPlan).not.toHaveProperty('extraPlanField')
  })

  it('다른 탭의 storage.clear 이벤트에서 기본 상태로 동기화한다', () => {
    window.localStorage.clear()
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      readingEvents: [],
      commonPlan: planFixture('common'),
      personalPlan: null,
      settings: { theme: 'light', readerName: '', reminder: null },
    }))
    const { result } = renderHook(() => usePlanState())
    expect(result.current.commonPlan).not.toBeNull()

    window.localStorage.clear()
    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: null,
      storageArea: window.localStorage,
    })))

    expect(result.current.commonPlan).toBeNull()
    expect(result.current.personalPlan).toBeNull()
  })

  it('기본 localStorage의 storage 이벤트에서 최신 계획을 동기화한다', () => {
    window.localStorage.clear()
    const { result } = renderHook(() => usePlanState())
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      readingEvents: [],
      commonPlan: planFixture('common'),
      personalPlan: null,
      settings: { theme: 'light', readerName: '', reminder: null },
    }))

    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: APP_STATE_STORAGE_KEY,
      storageArea: window.localStorage,
    })))

    expect(result.current.commonPlan).toEqual(planFixture('common'))
    expect(result.current.error).toBeNull()
  })
})

function planFixture(kind: 'common' | 'personal'): ReadingPlan {
  return {
    request: {
      id: `${kind}-plan`,
      name: kind === 'common' ? '공통 계획' : '개인 계획',
      kind,
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      weekdays: [0, 6],
      range: { type: 'books', bookIds: ['philemon', 'jude'] },
      order: 'canonical',
      missedDayPolicy: 'carry',
    },
    schedule: [
      { date: '2026-08-01', chapters: [{ bookId: 'philemon', chapter: 1 }] },
      { date: '2026-08-02', chapters: [{ bookId: 'jude', chapter: 1 }] },
    ],
    createdAt: '2026-07-31T12:00:00.000Z',
  }
}
