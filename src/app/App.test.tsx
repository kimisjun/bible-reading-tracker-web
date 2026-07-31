import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TUTORIAL_STORAGE_KEY } from '../features/tutorial/tutorialStorage'
import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'completed')
  })

  it('저장 데이터를 불러오지 못하면 자동 초기화하지 않고 복구 안내를 alert로 보여준다', () => {
    window.localStorage.setItem('bible-reading-tracker:app-state', '{broken')

    render(<App />)

    expect(screen.getByRole('alert')).toHaveTextContent('저장 데이터를 불러오거나 저장하지 못했습니다')
    expect(screen.getByRole('alert')).toHaveTextContent('백업을 복원하거나 브라우저 저장소 설정을 확인해 주세요')
    expect(window.localStorage.getItem('bible-reading-tracker:app-state')).toBe('{broken')
  })

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
    expect(screen.getByText('창세기 1장')).toBeInTheDocument()
  })

  it('각 탭에 보조 기술에서 숨긴 아이콘과 이름을 함께 표시한다', () => {
    render(<App />)

    for (const name of ['오늘', '통독표', '진행', '설정']) {
      const tab = screen.getByRole('tab', { name })
      expect(tab.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
    }
  })

  it('기록이 없으면 창세기 1장을 추천하고 전체 통독표 CTA로 이동한다', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('창세기 1장')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '전체 통독표에서 선택' }))

    const tableTab = screen.getByRole('tab', { name: '통독표' })
    expect(tableTab).toHaveAttribute('aria-selected', 'true')
    expect(tableTab).toHaveFocus()
    expect(screen.getByRole('heading', { name: '나의 통독표' })).toBeInTheDocument()
  })

  it('화살표, Home, End 키로 탭을 순환하며 선택한 패널로 바로 이동한다', async () => {
    const user = userEvent.setup()
    render(<App />)

    const todayTab = screen.getByRole('tab', { name: '오늘' })
    const tableTab = screen.getByRole('tab', { name: '통독표' })
    const settingsTab = screen.getByRole('tab', { name: '설정' })

    expect(todayTab).toHaveAttribute('tabindex', '0')
    expect(tableTab).toHaveAttribute('tabindex', '-1')

    todayTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(tableTab).toHaveFocus()
    expect(tableTab).toHaveAttribute('aria-selected', 'true')
    expect(tableTab).toHaveAttribute('aria-controls', 'table-panel')
    const activePanel = screen.getByRole('tabpanel')
    expect(activePanel).toHaveAttribute('id', 'table-panel')
    expect(activePanel).toHaveAttribute('aria-labelledby', 'table-tab')
    expect(activePanel).toHaveAccessibleName('통독표')

    await user.keyboard('{ArrowLeft}')
    expect(todayTab).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(settingsTab).toHaveFocus()
    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()

    await user.keyboard('{Home}')
    expect(todayTab).toHaveFocus()
    await user.keyboard('{End}')
    expect(settingsTab).toHaveFocus()
  })

  it('비활성 탭의 무거운 통독표를 마운트하지 않는다', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(document.querySelector('.tracker')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '통독표' }))
    expect(document.querySelector('.tracker')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '오늘' }))
    expect(document.querySelector('.tracker')).not.toBeInTheDocument()
  })

  it('하단 탭을 누르면 선택 상태와 빈 상태 안내를 함께 바꾼다', async () => {
    const user = userEvent.setup()
    render(<App />)

    const destinations = [
      ['통독표', '나의 통독표', '책 이름 검색'],
      ['진행', '나의 진행', '최근 읽기 기록이 없어요.'],
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
