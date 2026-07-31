import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReadingEvent } from '../../domain/reading'
import { TodayPage } from './TodayPage'

const event = (overrides: Partial<ReadingEvent> = {}): ReadingEvent => ({
  id: 'event-1',
  bookId: 'genesis',
  chapter: 1,
  delta: 1,
  occurredAt: '2026-07-31T01:00:00.000Z',
  ...overrides,
})

describe('TodayPage', () => {
  it('기록이 없으면 창세기 1장을 추천한다', () => {
    render(<TodayPage events={[]} onRead={() => undefined} onOpenTracker={() => undefined} />)

    expect(screen.getByRole('heading', { name: '오늘 읽기' })).toBeInTheDocument()
    expect(screen.getByText('창세기 1장')).toBeInTheDocument()
  })

  it('읽은 장 중 정경상 가장 뒤 장의 다음 장을 추천한다', () => {
    render(
      <TodayPage
        events={[
          event({ id: 'genesis-1', chapter: 1 }),
          event({ id: 'genesis-3', chapter: 3 }),
          event({ id: 'genesis-2', chapter: 2 }),
        ]}
        onRead={() => undefined}
        onOpenTracker={() => undefined}
      />,
    )

    expect(screen.getByText('창세기 4장')).toBeInTheDocument()
  })

  it('서로 다른 책에서는 정경상 가장 뒤에 읽은 책을 기준으로 추천한다', () => {
    render(
      <TodayPage
        events={[
          event({ id: 'exodus-5', bookId: 'exodus', chapter: 5 }),
          event({ id: 'genesis-50', chapter: 50 }),
        ]}
        onRead={() => undefined}
        onOpenTracker={() => undefined}
      />,
    )

    expect(screen.getByText('출애굽기 6장')).toBeInTheDocument()
  })

  it('책의 마지막 장을 읽었으면 다음 책 1장을 추천한다', () => {
    render(
      <TodayPage
        events={[event({ id: 'genesis-50', chapter: 50 })]}
        onRead={() => undefined}
        onOpenTracker={() => undefined}
      />,
    )

    expect(screen.getByText('출애굽기 1장')).toBeInTheDocument()
  })

  it('요한계시록 22장 다음에는 창세기 1장을 추천한다', () => {
    render(
      <TodayPage
        events={[event({ id: 'revelation-22', bookId: 'revelation', chapter: 22 })]}
        onRead={() => undefined}
        onOpenTracker={() => undefined}
      />,
    )

    expect(screen.getByText('창세기 1장')).toBeInTheDocument()
  })

  it('합계가 0으로 취소된 장은 읽지 않은 장으로 처리한다', () => {
    render(
      <TodayPage
        events={[
          event({ id: 'genesis-2', chapter: 2 }),
          event({ id: 'genesis-5', chapter: 5 }),
          event({ id: 'undo-genesis-5', chapter: 5, delta: -1 }),
        ]}
        onRead={() => undefined}
        onOpenTracker={() => undefined}
      />,
    )

    expect(screen.getByText('창세기 3장')).toBeInTheDocument()
  })

  it('같은 장을 반복 기록해도 추천은 그 다음 한 장으로 유지한다', () => {
    render(
      <TodayPage
        events={[
          event({ id: 'genesis-7-first', chapter: 7 }),
          event({ id: 'genesis-7-second', chapter: 7 }),
          event({ id: 'genesis-7-third', chapter: 7 }),
        ]}
        onRead={() => undefined}
        onOpenTracker={() => undefined}
      />,
    )

    expect(screen.getByText('창세기 8장')).toBeInTheDocument()
  })

  it('읽었어요 버튼을 누르면 추천 장을 읽기 콜백으로 전달한다', async () => {
    const user = userEvent.setup()
    const onRead = vi.fn()
    render(
      <TodayPage
        events={[event({ id: 'exodus-5', bookId: 'exodus', chapter: 5 })]}
        onRead={onRead}
        onOpenTracker={() => undefined}
      />,
    )

    await user.click(screen.getByRole('button', { name: '읽었어요' }))

    expect(onRead).toHaveBeenCalledOnce()
    expect(onRead).toHaveBeenCalledWith('exodus', 6)
  })

  it('전체 통독표에서 선택 버튼을 누르면 통독표 열기 콜백을 호출한다', async () => {
    const user = userEvent.setup()
    const onOpenTracker = vi.fn()
    render(
      <TodayPage events={[]} onRead={() => undefined} onOpenTracker={onOpenTracker} />,
    )

    await user.click(screen.getByRole('button', { name: '전체 통독표에서 선택' }))

    expect(onOpenTracker).toHaveBeenCalledOnce()
  })

  it('추천을 모바일 카드와 최소 터치 영역을 위한 스타일 훅으로 제공한다', () => {
    render(<TodayPage events={[]} onRead={() => undefined} onOpenTracker={() => undefined} />)

    const card = screen.getByRole('article', { name: '오늘 읽기 추천' })
    expect(card).toHaveClass('today-page__card')
    expect(screen.getByRole('button', { name: '읽었어요' })).toHaveClass('today-page__button')
    expect(screen.getByRole('button', { name: '전체 통독표에서 선택' })).toHaveClass(
      'today-page__button',
    )
  })
})
