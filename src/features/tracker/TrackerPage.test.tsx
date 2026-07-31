import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReadingEvent } from '../../domain/reading'
import { TrackerPage } from './TrackerPage'

const event = (
  bookId: string,
  chapter: number,
  delta: 1 | -1 = 1,
  id = `${bookId}-${chapter}-${delta}`,
): ReadingEvent => ({
  id,
  bookId,
  chapter,
  delta,
  occurredAt: '2026-07-31T09:00:00.000Z',
})

describe('TrackerPage', () => {
  it('66권을 정경 순서로 보여주고 책을 펼칠 때만 장 버튼을 렌더링한다', async () => {
    const user = userEvent.setup()
    render(<TrackerPage events={[]} onChange={vi.fn()} />)

    const bookButtons = screen.getAllByRole('button', { name: /장, (펼치기|접기)$/ })
    expect(bookButtons).toHaveLength(66)
    expect(bookButtons[0]).toHaveAccessibleName('창세기, 0/50장, 펼치기')
    expect(bookButtons[65]).toHaveAccessibleName('요한계시록, 0/22장, 펼치기')
    expect(screen.queryByRole('button', { name: '창세기 1장, 읽지 않음' })).not.toBeInTheDocument()

    await user.click(bookButtons[0])

    const genesis = screen.getByRole('region', { name: '창세기 장 목록' })
    expect(within(genesis).getAllByRole('button', { name: /창세기 \d+장/ })).toHaveLength(50)
    expect(screen.getByRole('button', { name: '창세기, 0/50장, 접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('정식 한국어 책 이름을 검색하고 일치하는 책이 없으면 빈 상태를 보여준다', async () => {
    const user = userEvent.setup()
    render(<TrackerPage events={[]} onChange={vi.fn()} />)

    const search = screen.getByRole('searchbox', { name: '책 이름 검색' })
    await user.type(search, '요한복음')

    expect(screen.getAllByRole('button', { name: /장, 펼치기$/ })).toHaveLength(1)
    expect(screen.getByRole('button', { name: '요한복음, 0/21장, 펼치기' })).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, '없는책')

    expect(screen.getByText('검색과 필터에 맞는 성경책이 없어요.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /장, 펼치기$/ })).not.toBeInTheDocument()
  })

  it('전체·구약·신약·읽는 중 필터를 적용하고 범위 밖 이벤트는 무시한다', async () => {
    const user = userEvent.setup()
    const events = [
      event('genesis', 1),
      event('matthew', 1),
      event('exodus', 41),
      event('unknown-book', 1),
    ]
    render(<TrackerPage events={events} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '구약' }))
    expect(screen.getAllByRole('button', { name: /장, 펼치기$/ })).toHaveLength(39)
    expect(screen.getByRole('button', { name: '창세기, 1/50장, 펼치기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '출애굽기, 0/40장, 펼치기' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '신약' }))
    expect(screen.getAllByRole('button', { name: /장, 펼치기$/ })).toHaveLength(27)

    await user.click(screen.getByRole('button', { name: '읽는 중' }))
    expect(screen.getAllByRole('button', { name: /장, 펼치기$/ })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /출애굽기/ })).not.toBeInTheDocument()
  })

  it('장 횟수 배지와 상세를 보여주고 증가·감소 콜백을 정확히 전달한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <TrackerPage
        events={[event('genesis', 1, 1, 'read-1'), event('genesis', 1, 1, 'read-2')]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: '창세기, 1/50장, 펼치기' }))
    const firstChapter = screen.getByRole('button', { name: '창세기 1장, 2회 읽음' })
    expect(within(firstChapter).getByText('×2')).toBeInTheDocument()

    await user.click(firstChapter)
    const detail = screen.getByRole('region', { name: '창세기 1장 상세' })
    expect(within(detail).getByText('현재 2회 읽음')).toBeInTheDocument()

    await user.click(within(detail).getByRole('button', { name: '창세기 1장 + 읽었어요' }))
    await user.click(within(detail).getByRole('button', { name: '창세기 1장 -1회' }))
    expect(onChange).toHaveBeenNthCalledWith(1, 'genesis', 1, 1)
    expect(onChange).toHaveBeenNthCalledWith(2, 'genesis', 1, -1)

    await user.click(screen.getByRole('button', { name: '창세기 2장, 읽지 않음' }))
    expect(screen.getByRole('button', { name: '창세기 2장 -1회' })).toBeDisabled()
  })

  it('검색·필터·책·장·상세 동작에 44px 이상의 터치 영역을 제공한다', async () => {
    const user = userEvent.setup()
    render(<TrackerPage events={[]} onChange={vi.fn()} />)

    const search = screen.getByRole('searchbox', { name: '책 이름 검색' })
    const filter = screen.getByRole('button', { name: '전체' })
    const book = screen.getByRole('button', { name: '창세기, 0/50장, 펼치기' })
    expect(getComputedStyle(search).minHeight).toBe('44px')
    expect(getComputedStyle(filter).minHeight).toBe('44px')
    expect(getComputedStyle(book).minHeight).toBe('44px')

    await user.click(book)
    const chapter = screen.getByRole('button', { name: '창세기 1장, 읽지 않음' })
    expect(getComputedStyle(chapter).minHeight).toBe('44px')
    await user.click(chapter)
    expect(getComputedStyle(screen.getByRole('button', { name: '창세기 1장 + 읽었어요' })).minHeight).toBe(
      '44px',
    )
  })
})
