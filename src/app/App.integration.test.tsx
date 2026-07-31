import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TUTORIAL_STORAGE_KEY } from '../features/tutorial/tutorialStorage'
import { App } from './App'

describe('App reading journey', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'completed')
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
