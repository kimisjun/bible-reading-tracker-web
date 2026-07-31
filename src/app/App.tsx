import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { ProgressPage } from '../features/progress/ProgressPage'
import { TodayPage } from '../features/today/TodayPage'
import { TrackerPage } from '../features/tracker/TrackerPage'
import { Tutorial } from '../features/tutorial/Tutorial'
import {
  hasCompletedTutorial,
  markTutorialCompleted,
} from '../features/tutorial/tutorialStorage'
import { useReadingState } from './useReadingState'

const pages = {
  today: {
    tab: '오늘',
    iconPath: 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',

  },
  table: {
    tab: '통독표',
    iconPath: 'M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm16 0A3.5 3.5 0 0 0 16.5 2H13v17h3.5a3.5 3.5 0 0 1 3.5 3V5.5Z',

  },
  progress: {
    tab: '진행',
    iconPath: 'M4 20V10m6 10V4m6 16v-7m4 7H2',

  },
  settings: {
    tab: '설정',
    iconPath: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3 2-1-2-3-2 .5-1.5-1L16 5h-4l-.5 2.5-1.5 1L8 8 6 11l2 1v2l-2 1 2 3 2-.5 1.5 1L12 21h4l.5-2.5 1.5-1 2 .5 2-3-2-1v-2Z',

  },
} as const

type PageId = keyof typeof pages

export function App() {
  const [activePage, setActivePage] = useState<PageId>('today')
  const [showTutorial, setShowTutorial] = useState(() => !hasCompletedTutorial())
  const reading = useReadingState()
  const pageEntries = Object.entries(pages) as [PageId, (typeof pages)[PageId]][]
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const completeTutorial = useCallback(() => {
    markTutorialCompleted()
    setShowTutorial(false)
  }, [])

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

      {reading.error && (
        <div role="alert" className="storage-error">
          <strong>저장 데이터를 불러오거나 저장하지 못했습니다.</strong>
          <p>백업을 복원하거나 브라우저 저장소 설정을 확인해 주세요.</p>
          <small>{reading.error.message}</small>
        </div>
      )}

      <main>
        {pageEntries.map(([pageId]) => (
          <section
            aria-labelledby={`${pageId}-tab`}
            hidden={activePage !== pageId}
            id={`${pageId}-panel`}
            key={pageId}
            role="tabpanel"
          >
            {pageId === 'today' && (
              <TodayPage
                events={reading.events}
                onRead={reading.read}
                onOpenTracker={() => selectTab(1)}
              />
            )}
            {pageId === 'table' && activePage === 'table' && (
              <TrackerPage events={reading.events} onChange={reading.change} />
            )}
            {pageId === 'progress' && (
              <ProgressPage events={reading.events} onUndo={reading.undo} />
            )}
            {pageId === 'settings' && (
              <div className="settings-placeholder">
                <h2>설정</h2>
                <p>통독 계획과 화면, 데이터 설정을 여기에서 관리할 수 있어요.</p>
                <button
                  className="settings-tutorial-button"
                  type="button"
                  onClick={() => setShowTutorial(true)}
                >
                  튜토리얼 다시 보기
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
      {showTutorial && <Tutorial onComplete={completeTutorial} />}
    </div>
  )
}
