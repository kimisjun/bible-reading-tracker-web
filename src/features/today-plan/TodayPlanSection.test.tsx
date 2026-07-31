import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodayPlanSection, type TodayPlanView } from './TodayPlanSection'

const { readFileSync } = await import(['node', 'fs'].join(':'))
const styles = readFileSync('src/features/today-plan/TodayPlanSection.css', 'utf8') as string

const views: readonly TodayPlanView[] = [
  {
    planId: 'common-1',
    kind: 'common',
    name: '1년 성경 일독',
    date: '2026-08-01',
    chapters: [
      { bookId: 'genesis', chapter: 1, bookName: '창세기', completed: true },
      { bookId: 'genesis', chapter: 2, bookName: '창세기', completed: false },
    ],
  },
  {
    planId: 'personal-1',
    kind: 'personal',
    name: '복음서 90일',
    date: '2026-08-01',
    chapters: [{ bookId: 'matthew', chapter: 5, bookName: '마태복음', completed: false }],
  },
]

describe('TodayPlanSection', () => {
  it('공통 계획과 개인 계획을 종류, 이름, 날짜, 장 완료 상태와 함께 표시한다', () => {
    render(
      <TodayPlanSection
        views={views}
        onRead={vi.fn()}
        onCompleteAll={vi.fn()}
        onUndoBatch={vi.fn()}
      />,
    )

    const commonCard = screen.getByRole('article', { name: '공통 계획 1년 성경 일독' })
    const personalCard = screen.getByRole('article', { name: '개인 계획 복음서 90일' })

    expect(within(commonCard).getByText('공통 계획')).toBeInTheDocument()
    expect(within(commonCard).getByRole('heading', { name: '1년 성경 일독' })).toBeInTheDocument()
    expect(within(commonCard).getByText('2026-08-01')).toBeInTheDocument()
    expect(within(commonCard).getByText('✓ 창세기 1장 · 완료')).toBeInTheDocument()
    expect(within(commonCard).getByText('창세기 2장')).toBeInTheDocument()
    expect(within(personalCard).getByText('개인 계획')).toBeInTheDocument()
    expect(within(personalCard).getByText('마태복음 5장')).toBeInTheDocument()
  })

  it('미완료 장 읽기와 전체 완료에 계획 식별자 및 정확한 장을 전달한다', async () => {
    const user = userEvent.setup()
    const onRead = vi.fn()
    const onCompleteAll = vi.fn()
    render(
      <TodayPlanSection
        views={views}
        onRead={onRead}
        onCompleteAll={onCompleteAll}
        onUndoBatch={vi.fn()}
      />,
    )

    const commonCard = screen.getByRole('article', { name: '공통 계획 1년 성경 일독' })
    expect(within(commonCard).queryByRole('button', { name: '창세기 1장 읽었어요' })).not.toBeInTheDocument()

    await user.click(within(commonCard).getByRole('button', { name: '창세기 2장 읽었어요' }))
    expect(onRead).toHaveBeenCalledWith('common-1', 'genesis', 2)

    await user.click(within(commonCard).getByRole('button', { name: '1년 성경 일독 미완료 1장 전체 완료' }))
    expect(onCompleteAll).toHaveBeenCalledWith('common-1', [{ bookId: 'genesis', chapter: 2 }])
  })

  it('상태 안내, 완료 축하, 새 종료일을 라이브 영역에 표시한다', () => {
    const completedView: TodayPlanView = {
      ...views[0],
      chapters: [{ ...views[0].chapters[0], completed: true }],
      statusMessage: '밀린 분량 3장 포함 · 남은 기간에 다시 나누었습니다',
      lastScheduledDate: '2027-07-31',
    }
    render(
      <TodayPlanSection
        views={[completedView]}
        onRead={vi.fn()}
        onCompleteAll={vi.fn()}
        onUndoBatch={vi.fn()}
      />,
    )

    const live = screen.getByRole('status')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveTextContent('밀린 분량 3장 포함 · 남은 기간에 다시 나누었습니다')
    expect(live).toHaveTextContent('새 완료 예정일 2027-07-31')
    expect(live).toHaveTextContent('오늘도 말씀과 함께 걸으셨습니다')
    expect(screen.getByRole('button', { name: '1년 성경 일독 미완료 0장 전체 완료' })).toBeDisabled()
  })

  it('최근 전체 완료 묶음을 계획별로 취소한다', async () => {
    const user = userEvent.setup()
    const onUndoBatch = vi.fn()
    render(
      <TodayPlanSection
        views={[{ ...views[0], recentBatchId: 'batch-7' }]}
        onRead={vi.fn()}
        onCompleteAll={vi.fn()}
        onUndoBatch={onUndoBatch}
      />,
    )

    await user.click(screen.getByRole('button', { name: '1년 성경 일독 전체 완료 취소' }))
    expect(onUndoBatch).toHaveBeenCalledWith('common-1', 'batch-7')
  })

  it('계획이 없으면 섹션을 렌더링하지 않는다', () => {
    const { container } = render(
      <TodayPlanSection views={[]} onRead={vi.fn()} onCompleteAll={vi.fn()} onUndoBatch={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('44px 터치 영역, 320px 레이아웃, 다크 모드와 모션 감소 스타일을 제공한다', () => {
    expect(styles).toMatch(/min-height:\s*44px/)
    expect(styles).toMatch(/@media\s*\(max-width:\s*320px\)/)
    expect(styles).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/)
    expect(styles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })
})
