import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tutorial } from './Tutorial'

describe('Tutorial', () => {
  it('세 단계를 앞뒤로 이동하고 마지막에 시작한다', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Tutorial onComplete={onComplete} />)

    expect(screen.getByRole('dialog', { name: '처음 사용 안내' })).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '읽기 기록은 이 브라우저에만 저장돼요' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('heading', { name: '오늘 읽을 말씀부터 시작하세요' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '이전' }))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('heading', { name: '네 개의 메뉴를 활용하세요' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '시작하기' }))

    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('건너뛰기를 선택하면 완료 처리한다', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Tutorial onComplete={onComplete} />)

    await user.click(screen.getByRole('button', { name: '튜토리얼 건너뛰기' }))

    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('키보드 포커스를 대화상자 안에 유지하고 Escape로 닫는다', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Tutorial onComplete={onComplete} />)

    const dialog = screen.getByRole('dialog', { name: '처음 사용 안내' })
    const skip = screen.getByRole('button', { name: '튜토리얼 건너뛰기' })
    const next = screen.getByRole('button', { name: '다음' })
    expect(dialog).toHaveFocus()

    await user.tab({ shift: true })
    expect(next).toHaveFocus()
    await user.tab()
    expect(skip).toHaveFocus()
    await user.tab({ shift: true })
    expect(next).toHaveFocus()
    await user.tab()
    expect(skip).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
