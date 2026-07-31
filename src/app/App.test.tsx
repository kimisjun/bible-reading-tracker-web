import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

describe('App', () => {
  it('앱 이름과 개인 오프라인판 안내를 보여준다', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '말씀과 함께 걷기' })).toBeInTheDocument()
    expect(screen.getByText('개인 오프라인판')).toBeInTheDocument()
  })

  it('오늘을 현재 탭으로 표시하고 오늘 빈 상태를 안내한다', () => {
    render(<App />)

    const tabs = screen.getAllByRole('tab')

    expect(tabs).toHaveLength(4)
    expect(screen.getByRole('tab', { name: '오늘' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: '오늘 읽기' })).toBeInTheDocument()
    expect(screen.getByText('아직 읽기 기록이 없어요. 첫 장부터 함께 시작해 보세요.')).toBeInTheDocument()
  })

  it('하단 탭을 누르면 선택 상태와 빈 상태 안내를 함께 바꾼다', async () => {
    const user = userEvent.setup()
    render(<App />)

    const destinations = [
      ['통독표', '나의 통독표', '읽은 장이 아직 없어요. 통독을 시작하면 장별 기록이 여기에 나타나요.'],
      ['진행', '나의 진행', '첫 읽기를 기록하면 전체 진행률과 읽은 날을 확인할 수 있어요.'],
      ['설정', '설정', '통독 계획과 화면, 데이터 설정을 여기에서 관리할 수 있어요.'],
    ] as const

    for (const [tabName, heading, description] of destinations) {
      await user.click(screen.getByRole('tab', { name: tabName }))

      expect(screen.getByRole('tab', { name: tabName })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
      expect(screen.getByText(description)).toBeInTheDocument()
    }
  })
})
