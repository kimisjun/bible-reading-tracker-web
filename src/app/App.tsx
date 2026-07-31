import { useRef, useState, type KeyboardEvent } from 'react'

const pages = {
  today: {
    tab: '오늘',
    iconPath: 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
    heading: '오늘 읽기',
    description: '아직 읽기 기록이 없어요. 첫 장부터 함께 시작해 보세요.',
  },
  table: {
    tab: '통독표',
    iconPath: 'M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm16 0A3.5 3.5 0 0 0 16.5 2H13v17h3.5a3.5 3.5 0 0 1 3.5 3V5.5Z',
    heading: '나의 통독표',
    description: '읽은 장이 아직 없어요. 통독을 시작하면 장별 기록이 여기에 나타나요.',
  },
  progress: {
    tab: '진행',
    iconPath: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
    heading: '나의 진행',
    description: '첫 읽기를 기록하면 전체 진행률과 읽은 날을 확인할 수 있어요.',
  },
  settings: {
    tab: '설정',
    iconPath: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3 2-1-2-3-2 .5-1.5-1L16 5h-4l-.5 2.5-1.5 1L8 8 6 11l2 1v2l-2 1 2 3 2-.5 1.5 1L12 21h4l.5-2.5 1.5-1 2 .5 2-3-2-1v-2Z',
    heading: '설정',
    description: '통독 계획과 화면, 데이터 설정을 여기에서 관리할 수 있어요.',
  },
} as const

type PageId = keyof typeof pages

export function App() {
  const [activePage, setActivePage] = useState<PageId>('today')
  const pageEntries = Object.entries(pages) as [PageId, (typeof pages)[PageId]][]
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectTab = (index: number) => {
    const [pageId] = pageEntries[index]
    setActivePage(pageId)
    tabRefs.current[index]?.focus()
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % pageEntries.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + pageEntries.length) % pageEntries.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = pageEntries.length - 1

    if (nextIndex !== undefined) {
      event.preventDefault()
      selectTab(nextIndex)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">개인 오프라인판</p>
        <h1>말씀과 함께 걷기</h1>
        <p className="subtitle">성경 66권 1,189장을 차근차근 기록해 보세요.</p>
      </header>

      <main>
        {pageEntries.map(([pageId, page]) => (
          <section
            aria-labelledby={`${pageId}-tab`}
            hidden={activePage !== pageId}
            id={`${pageId}-panel`}
            key={pageId}
            role="tabpanel"
          >
            <h2>{page.heading}</h2>
            <p>{page.description}</p>
            {pageId === 'today' && (
              <div className="empty-state-action">
                <strong>창세기 1장</strong>
                <button type="button" onClick={() => selectTab(1)}>
                  전체 통독표에서 선택
                </button>
              </div>
            )}
          </section>
        ))}
      </main>

      <nav aria-label="주요 메뉴">
        <div role="tablist" aria-label="앱 화면">
          {pageEntries.map(
            ([pageId, item], index) => (
              <button
                aria-controls={`${pageId}-panel`}
                aria-selected={activePage === pageId}
                id={`${pageId}-tab`}
                key={pageId}
                onClick={() => setActivePage(pageId)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(element) => { tabRefs.current[index] = element }}
                role="tab"
                tabIndex={activePage === pageId ? 0 : -1}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d={item.iconPath} />
                </svg>
                <span>{item.tab}</span>
              </button>
            ),
          )}
        </div>
      </nav>
    </div>
  )
}
