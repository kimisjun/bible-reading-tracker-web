import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReadingEvent } from '../../domain/reading'
import { ProgressPage } from './ProgressPage'

const events: readonly ReadingEvent[] = [
  { id: 'old-1', bookId: 'genesis', chapter: 1, delta: 1, occurredAt: '2026-07-03T09:00:00' },
  { id: 'old-2', bookId: 'genesis', chapter: 1, delta: 1, occurredAt: '2026-07-04T09:00:00' },
  { id: 'new-1', bookId: 'luke', chapter: 5, delta: 1, occurredAt: '2026-07-05T09:00:00' },
]

describe('ProgressPage', () => {
  it('전체·구약·신약의 고유 완료 장과 진행률, 반복 읽기 합계를 보여준다', () => {
    render(<ProgressPage events={events} onUndo={() => undefined} initialMonth="2026-07" />)

    expect(screen.getByRole('heading', { name: '나의 진행' })).toBeInTheDocument()
    expect(screen.getByText('2 / 1,189장')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: '전체 진행률' })).toHaveAttribute('aria-valuenow', '0.2')
    expect(screen.getByText('구약 1 / 929장 · 0.1%')).toBeInTheDocument()
    expect(screen.getByText('신약 1 / 260장 · 0.4%')).toBeInTheDocument()
    expect(screen.getByText('총 3회 읽었어요')).toBeInTheDocument()
  })

  it('요일 헤더·선행 빈칸·월의 모든 날짜와 읽기 상태를 실제 월 달력 grid로 보여준다', () => {
    render(<ProgressPage events={events} onUndo={() => undefined} initialMonth="2026-07" />)

    const calendar = screen.getByRole('grid', { name: '2026년 7월 달력' })
    expect(within(calendar).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      '일', '월', '화', '수', '목', '금', '토',
    ])
    expect(calendar.querySelectorAll('.progress-calendar__blank')).toHaveLength(3)
    expect(within(calendar).getAllByRole('gridcell')).toHaveLength(31)
    expect(within(calendar).getByRole('gridcell', { name: '7월 3일, 읽은 날' })).toHaveTextContent('3읽은 날')
    expect(within(calendar).getByRole('gridcell', { name: '7월 6일, 기록 없음' })).toHaveTextContent('6기록 없음')
  })

  it('12월과 1월 경계를 오가고 변경된 제목을 live region으로 알린다', async () => {
    const user = userEvent.setup()
    render(<ProgressPage events={[]} onUndo={() => undefined} initialMonth="2026-12" />)

    const title = screen.getByRole('heading', { name: '2026년 12월' })
    expect(title).toHaveAttribute('aria-live', 'polite')

    await user.click(screen.getByRole('button', { name: '다음 달' }))
    expect(screen.getByRole('heading', { name: '2027년 1월' })).toBe(title)
    expect(screen.getByRole('grid', { name: '2027년 1월 달력' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '이전 달' }))
    expect(screen.getByRole('heading', { name: '2026년 12월' })).toBe(title)
  })

  it('잘못된 initialMonth는 현재 로컬 월로 대체한다', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 15, 12))

    try {
      render(<ProgressPage events={[]} onUndo={() => undefined} initialMonth="2026-13" />)

      expect(screen.getByRole('heading', { name: '2026년 7월' })).toBeInTheDocument()
      expect(screen.getByRole('grid', { name: '2026년 7월 달력' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('잘못된 occurredAt 기록은 최근 목록과 월 활동에서 제외해 UI를 안전하게 렌더링한다', () => {
    const invalidEvent: ReadingEvent = {
      id: 'invalid-time',
      bookId: 'genesis',
      chapter: 1,
      delta: 1,
      occurredAt: 'not-a-date',
    }

    render(<ProgressPage events={[invalidEvent]} onUndo={() => undefined} initialMonth="2026-07" />)

    expect(screen.getByText('최근 읽기 기록이 없어요.')).toBeInTheDocument()
    expect(screen.queryByText('not-a-date')).not.toBeInTheDocument()
    expect(screen.getAllByRole('gridcell', { name: /기록 없음/ })).toHaveLength(31)
  })

  it('최근 기록 5개를 최신순 한국어 이름으로 표시하고 취소 가능한 원본 +1·-1만 콜백을 호출한다', async () => {
    const onUndo = vi.fn()
    const recentEvents: readonly ReadingEvent[] = [
      { id: 'older', bookId: 'genesis', chapter: 2, delta: 1, occurredAt: '2026-07-01T10:00:00' },
      { id: 'eligible', bookId: 'luke', chapter: 5, delta: 1, occurredAt: '2026-07-02T11:00:00' },
      { id: 'minus', bookId: 'john', chapter: 3, delta: -1, occurredAt: '2026-07-02T12:00:00' },
      { id: 'cancelled', bookId: 'genesis', chapter: 1, delta: 1, occurredAt: '2026-07-02T13:00:00' },
      { id: 'undo', bookId: 'genesis', chapter: 1, delta: -1, occurredAt: '2026-07-02T14:00:00', undoneEventId: 'cancelled' },
      { id: 'latest', bookId: 'mark', chapter: 2, delta: 1, occurredAt: '2026-07-02T15:00:00' },
    ]
    const user = userEvent.setup()

    render(<ProgressPage events={recentEvents} onUndo={onUndo} initialMonth="2026-07" />)

    const list = screen.getByRole('list', { name: '최근 읽기 기록' })
    const items = Array.from(list.querySelectorAll('li'))
    expect(items).toHaveLength(5)
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('마가복음 2장 +1'),
      expect.stringContaining('창세기 1장 -1'),
      expect.stringContaining('창세기 1장 +1'),
      expect.stringContaining('요한복음 3장 -1'),
      expect.stringContaining('누가복음 5장 +1'),
    ])
    expect(screen.queryByRole('button', { name: '창세기 1장 기록 취소' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '요한복음 3장 기록 취소' }))
    await user.click(screen.getByRole('button', { name: '누가복음 5장 기록 취소' }))
    expect(onUndo).toHaveBeenNthCalledWith(1, 'minus')
    expect(onUndo).toHaveBeenNthCalledWith(2, 'eligible')
  })

  it('월 이동과 기록 취소 버튼에 최소 44px 터치 영역을 제공한다', () => {
    render(<ProgressPage events={events} onUndo={() => undefined} initialMonth="2026-07" />)

    expect(getComputedStyle(screen.getByRole('button', { name: '이전 달' })).minHeight).toBe('44px')
    expect(getComputedStyle(screen.getByRole('button', { name: '누가복음 5장 기록 취소' })).minHeight).toBe('44px')
  })
})
