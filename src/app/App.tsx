import { useState } from 'react'

const pages = {
  today: {
    tab: '오늘',
    heading: '오늘 읽기',
    description: '아직 읽기 기록이 없어요. 첫 장부터 함께 시작해 보세요.',
  },
  table: {
    tab: '통독표',
    heading: '나의 통독표',
    description: '읽은 장이 아직 없어요. 통독을 시작하면 장별 기록이 여기에 나타나요.',
  },
  progress: {
    tab: '진행',
    heading: '나의 진행',
    description: '첫 읽기를 기록하면 전체 진행률과 읽은 날을 확인할 수 있어요.',
  },
  settings: {
    tab: '설정',
    heading: '설정',
    description: '통독 계획과 화면, 데이터 설정을 여기에서 관리할 수 있어요.',
  },
} as const

type PageId = keyof typeof pages

export function App() {
  const [activePage, setActivePage] = useState<PageId>('today')
  const page = pages[activePage]

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">개인 오프라인판</p>
        <h1>말씀과 함께 걷기</h1>
        <p className="subtitle">성경 66권 1,189장을 차근차근 기록해 보세요.</p>
      </header>

      <main>
        <section
          aria-labelledby={`${activePage}-title`}
          id={`${activePage}-panel`}
          role="tabpanel"
        >
          <h2 id={`${activePage}-title`}>{page.heading}</h2>
          <p>{page.description}</p>
        </section>
      </main>

      <nav aria-label="주요 메뉴">
        <div role="tablist" aria-label="앱 화면">
          {(Object.entries(pages) as [PageId, (typeof pages)[PageId]][]).map(
            ([pageId, item]) => (
              <button
                aria-controls={`${pageId}-panel`}
                aria-selected={activePage === pageId}
                id={`${pageId}-tab`}
                key={pageId}
                onClick={() => setActivePage(pageId)}
                role="tab"
                type="button"
              >
                {item.tab}
              </button>
            ),
          )}
        </div>
      </nav>
    </div>
  )
}
