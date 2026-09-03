import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReadingEvent } from '../domain/reading'
import { TUTORIAL_STORAGE_KEY } from '../features/tutorial/tutorialStorage'
import { APP_STATE_STORAGE_KEY } from '../storage/repository'
import { App } from './App'

function saveReadingEvents(readingEvents: readonly ReadingEvent[]) {
  window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({
    schemaVersion: 1,
    readingEvents,
    commonPlan: null,
    personalPlan: null,
    settings: { theme: 'light', readerName: '', reminder: null },
  }))
}

describe('App reading journey', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'completed')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('새해에는 이전 연도 기록을 보존하면서 통독표와 진행률을 0에서 시작한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T15:00:00.000Z'))
    saveReadingEvents([{
      id: 'previous-year-read',
      bookId: 'genesis',
      chapter: 1,
      delta: 1,
      occurredAt: '2026-12-31T14:59:59.999Z',
    }])

    render(<App />)

    expect(screen.getByText('창세기 1장')).toBeInTheDocument()
    expect(screen.getByText('오늘 0장')).toBeInTheDocument()

    act(() => {
      screen.getByRole('tab', { name: '통독표' }).click()
    })
    expect(screen.getByRole('button', { name: '창세기, 0/50장, 펼치기' })).toBeInTheDocument()

    act(() => {
      screen.getByRole('tab', { name: '진행' }).click()
    })
    expect(screen.getByText('0 / 1,189장')).toBeInTheDocument()
    expect(screen.getByText('최근 읽기 기록이 없어요.')).toBeInTheDocument()

    const persisted = JSON.parse(window.localStorage.getItem(APP_STATE_STORAGE_KEY) ?? '{}')
    expect(persisted.readingEvents).toHaveLength(1)
    expect(persisted.readingEvents[0].id).toBe('previous-year-read')
  })

  it('앱을 켜 둔 채 한국 새해 자정이 지나도 자동으로 0에서 시작한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T14:59:59.900Z'))
    saveReadingEvents([{
      id: 'last-day-read',
      bookId: 'genesis',
      chapter: 1,
      delta: 1,
      occurredAt: '2026-12-31T14:00:00.000Z',
    }])

    render(<App />)
    expect(screen.getByText('창세기 2장')).toBeInTheDocument()
    expect(screen.getByText('오늘 1장')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(screen.getByText('창세기 1장')).toBeInTheDocument()
    expect(screen.getByText('오늘 0장')).toBeInTheDocument()
  })

  it('설정에서 공통 계획을 저장하고 앱을 다시 열어도 복원한다', async () => {
    const user = userEvent.setup()
    const firstVisit = render(<App />)
    await user.click(screen.getByRole('tab', { name: '설정' }))

    const common = screen.getByRole('region', { name: '공통 통독 계획' })
    await user.click(within(common).getByRole('button', { name: '공통 계획 저장' }))
    const savedCommon = screen.getByRole('region', { name: '공통 통독 계획' })
    expect(within(savedCommon).getByText('현재 계획: 1년 성경 일독')).toBeInTheDocument()

    firstVisit.unmount()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: '설정' }))

    expect(screen.getByText('현재 계획: 1년 성경 일독')).toBeInTheDocument()
  })

  it('오늘 계획을 전체 완료하고 같은 batch를 취소하면 미완료 상태로 복구한다', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: '설정' }))
    const commonSettings = screen.getByRole('region', { name: '공통 통독 계획' })
    await user.click(within(commonSettings).getByRole('button', { name: '공통 계획 저장' }))
    await user.click(screen.getByRole('tab', { name: '오늘' }))

    expect(screen.getByRole('article', { name: '오늘 읽기 추천' })).toBeInTheDocument()
    const planCard = screen.getByRole('article', { name: '공통 계획 1년 성경 일독' })
    const completeAll = within(planCard).getByRole('button', {
      name: /1년 성경 일독 미완료 \d+장 전체 완료/,
    })
    await user.click(completeAll)

    const completedCard = screen.getByRole('article', { name: '공통 계획 1년 성경 일독' })
    expect(within(completedCard).getByText('오늘도 말씀과 함께 걸으셨습니다')).toBeInTheDocument()
    const undoBatch = within(completedCard).getByRole('button', { name: '1년 성경 일독 전체 완료 취소' })
    await user.click(undoBatch)

    const restoredCard = screen.getByRole('article', { name: '공통 계획 1년 성경 일독' })
    expect(within(restoredCard).queryByText('오늘도 말씀과 함께 걸으셨습니다')).not.toBeInTheDocument()
    expect(within(restoredCard).getAllByRole('button', { name: /읽었어요/ }).length).toBeGreaterThan(0)
  })

  it('오늘 읽기를 기록하면 오늘과 이번 주 통독량이 즉시 증가한다', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('오늘 0장')).toBeInTheDocument()
    expect(screen.getByText('이번 주 총 0장')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '읽었어요' }))

    expect(screen.getByText('오늘 1장')).toBeInTheDocument()
    expect(screen.getByText('이번 주 총 1장')).toBeInTheDocument()
  })

  it('오늘 읽기를 기록하고 다시 열면 다음 장을 추천한다', async () => {
    const user = userEvent.setup()
    const firstVisit = render(<App />)

    expect(screen.getByText('창세기 1장')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '읽었어요' }))
    expect(screen.getByText('창세기 2장')).toBeInTheDocument()

    firstVisit.unmount()
    render(<App />)

    expect(screen.getByText('창세기 2장')).toBeInTheDocument()
  })

  it('오늘 기록이 통독표와 진행 화면에 반영되고 취소하면 추천도 복구된다', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '읽었어요' }))
    await user.click(screen.getByRole('tab', { name: '통독표' }))

    await user.click(screen.getByRole('button', { name: '창세기, 1/50장, 펼치기' }))
    expect(screen.getByRole('button', { name: '창세기 1장, 1회 읽음' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '진행' }))
    expect(screen.getByText('1 / 1,189장')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '창세기 1장 기록 취소' }))

    await user.click(screen.getByRole('tab', { name: '오늘' }))
    expect(screen.getByText('창세기 1장')).toBeInTheDocument()
  }, 15_000)
})
