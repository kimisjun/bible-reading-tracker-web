import { useState } from 'react'
import { bibleBooks } from '../../data/bibleBooks'
import { getReadingCount, type ReadingEvent } from '../../domain/reading'
import './TrackerPage.css'

type BookFilter = 'all' | 'old' | 'new' | 'reading'
const touchTargetStyle = { minHeight: '44px' } as const

function getBookCounts(events: readonly ReadingEvent[], bookId: string, chapters: number) {
  return Array.from({ length: chapters }, (_, index) =>
    Math.max(0, getReadingCount(events, bookId, index + 1)),
  )
}

export type TrackerPageProps = Readonly<{
  events: readonly ReadingEvent[]
  onChange(bookId: string, chapter: number, delta: 1 | -1): void
}>

export function TrackerPage({ events, onChange }: TrackerPageProps) {
  const [expandedBookIds, setExpandedBookIds] = useState<ReadonlySet<string>>(new Set())
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<BookFilter>('all')
  const [selectedChapter, setSelectedChapter] = useState<
    Readonly<{ bookId: string; chapter: number }> | undefined
  >()

  const visibleBooks = bibleBooks.filter((book) => {
    const matchesQuery = book.name.includes(query.trim())
    if (!matchesQuery) return false
    if (filter === 'old' || filter === 'new') return book.testament === filter
    if (filter === 'reading') {
      return getBookCounts(events, book.id, book.chapters).some((count) => count > 0)
    }
    return true
  })

  const toggleBook = (bookId: string) => {
    setExpandedBookIds((current) => {
      const next = new Set(current)
      if (next.has(bookId)) next.delete(bookId)
      else next.add(bookId)
      return next
    })
  }

  return (
    <section className="tracker" aria-labelledby="tracker-title">
      <h2 id="tracker-title">나의 통독표</h2>
      <label className="tracker__search">
        <span className="tracker__label">책 이름 검색</span>
        <input
          type="search"
          style={touchTargetStyle}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
      </label>
      <div className="tracker__filters" aria-label="성경책 필터">
        {([
          ['all', '전체'],
          ['old', '구약'],
          ['new', '신약'],
          ['reading', '읽는 중'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            style={touchTargetStyle}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {visibleBooks.length === 0 && <p>검색과 필터에 맞는 성경책이 없어요.</p>}
      <div className="tracker__books">
        {visibleBooks.map((book) => {
          const expanded = expandedBookIds.has(book.id)
          const counts = getBookCounts(events, book.id, book.chapters)
          const completed = counts.filter((count) => count > 0).length
          const panelId = `tracker-book-${book.id}`

          return (
            <article className="tracker__book" key={book.id}>
              <button
                type="button"
                style={touchTargetStyle}
                aria-expanded={expanded}
                aria-controls={panelId}
                aria-label={`${book.name}, ${completed}/${book.chapters}장, ${expanded ? '접기' : '펼치기'}`}
                className="tracker__book-toggle"
                onClick={() => toggleBook(book.id)}
              >
                <span>{book.name}</span>
                <span aria-hidden="true">{completed}/{book.chapters}장</span>
              </button>
              {expanded && (
                <div
                  id={panelId}
                  className="tracker__chapters"
                  role="region"
                  aria-label={`${book.name} 장 목록`}
                >
                  {counts.map((count, index) => {
                    const chapter = index + 1
                    const selected =
                      selectedChapter?.bookId === book.id && selectedChapter.chapter === chapter
                    return (
                      <button
                        key={chapter}
                        type="button"
                        style={touchTargetStyle}
                        aria-pressed={selected}
                        aria-label={`${book.name} ${chapter}장, ${count > 0 ? `${count}회 읽음` : '읽지 않음'}`}
                        className="tracker__chapter"
                        onClick={() => setSelectedChapter({ bookId: book.id, chapter })}
                      >
                        {chapter}
                        {count > 0 && <span aria-hidden="true">×{count}</span>}
                      </button>
                    )
                  })}
                  {selectedChapter?.bookId === book.id && (
                    <div
                      className="tracker__detail"
                      role="region"
                      aria-label={`${book.name} ${selectedChapter.chapter}장 상세`}
                    >
                      <h3>{book.name} {selectedChapter.chapter}장</h3>
                      <p>현재 {counts[selectedChapter.chapter - 1]}회 읽음</p>
                      <button
                        type="button"
                        style={touchTargetStyle}
                        aria-label={`${book.name} ${selectedChapter.chapter}장 -1회`}
                        disabled={counts[selectedChapter.chapter - 1] === 0}
                        onClick={() => onChange(book.id, selectedChapter.chapter, -1)}
                      >
                        − 1회
                      </button>
                      <button
                        type="button"
                        style={touchTargetStyle}
                        aria-label={`${book.name} ${selectedChapter.chapter}장 + 읽었어요`}
                        onClick={() => onChange(book.id, selectedChapter.chapter, 1)}
                      >
                        + 읽었어요
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
