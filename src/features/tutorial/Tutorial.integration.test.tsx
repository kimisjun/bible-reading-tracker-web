import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../app/App'
import { TUTORIAL_STORAGE_KEY } from './tutorialStorage'

describe('first-run tutorial', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('첫 방문에만 나타나고 설정에서 다시 열 수 있다', async () => {
    const user = userEvent.setup()
    const firstVisit = render(<App />)

    expect(screen.getByRole('dialog', { name: '처음 사용 안내' })).toBeInTheDocument()
    expect(document.querySelector('main')).toHaveAttribute('inert')
    expect(document.querySelector('nav')).toHaveAttribute('inert')
    await user.click(screen.getByRole('button', { name: '튜토리얼 건너뛰기' }))
    expect(screen.queryByRole('dialog', { name: '처음 사용 안내' })).not.toBeInTheDocument()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
    expect(document.querySelector('nav')).not.toHaveAttribute('inert')
    expect(window.localStorage.getItem(TUTORIAL_STORAGE_KEY)).toBe('completed')

    firstVisit.unmount()
    render(<App />)
    expect(screen.queryByRole('dialog', { name: '처음 사용 안내' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '설정' }))
    const reopenButton = screen.getByRole('button', { name: '튜토리얼 다시 보기' })
    await user.click(reopenButton)
    expect(screen.getByRole('dialog', { name: '처음 사용 안내' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(reopenButton).toHaveFocus()
  })
})
