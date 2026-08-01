import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TUTORIAL_STORAGE_KEY } from '../features/tutorial/tutorialStorage'
import { App } from './App'

describe('App reading journey', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'completed')
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
  })
})
