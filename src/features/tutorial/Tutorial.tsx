import { useEffect, useRef, useState } from 'react'
import './Tutorial.css'

const steps = [
  {
    icon: '🔒',
    title: '기록은 이 기기에 안전하게 저장돼요',
    description: '로그인 없이 사용할 수 있고, 읽기 기록은 현재 브라우저에 저장됩니다.',
  },
  {
    icon: '📖',
    title: '오늘 읽을 말씀부터 시작하세요',
    description: '오늘 화면에서 “읽었어요”를 누르면 다음 장을 추천하고 통독표에도 바로 반영합니다.',
  },
  {
    icon: '🧭',
    title: '네 개의 메뉴를 활용하세요',
    description: '오늘에서 기록하고, 통독표에서 장별 횟수를 조정하며, 진행에서 달력과 통계를 확인하세요.',
  },
] as const

export type TutorialProps = Readonly<{
  onComplete(): void
}>

export function Tutorial({ onComplete }: TutorialProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const step = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleDialogKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onComplete()
      if (event.key !== 'Tab' || dialogRef.current === null) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', handleDialogKeyboard)
    return () => window.removeEventListener('keydown', handleDialogKeyboard)
  }, [onComplete])

  return (
    <div className="tutorial-backdrop">
      <div
        aria-describedby="tutorial-description"
        aria-label="처음 사용 안내"
        aria-modal="true"
        className="tutorial-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="tutorial-topline">
          <span aria-live="polite">{stepIndex + 1} / {steps.length}</span>
          <button
            aria-label="튜토리얼 건너뛰기"
            className="tutorial-skip"
            onClick={onComplete}
            type="button"
          >
            건너뛰기
          </button>
        </div>

        <div aria-live="polite">
          <div aria-hidden="true" className="tutorial-icon">{step.icon}</div>
          <h2 id="tutorial-title">{step.title}</h2>
          <p id="tutorial-description">{step.description}</p>
        </div>

        <div aria-label="튜토리얼 진행" className="tutorial-dots">
          {steps.map((item, index) => (
            <span
              aria-label={`${index + 1}단계${index === stepIndex ? ', 현재 단계' : ''}`}
              className={index === stepIndex ? 'tutorial-dot tutorial-dot--active' : 'tutorial-dot'}
              key={item.title}
            />
          ))}
        </div>

        <div className="tutorial-actions">
          {stepIndex > 0 && (
            <button
              className="tutorial-button tutorial-button--secondary"
              onClick={() => setStepIndex((current) => current - 1)}
              type="button"
            >
              이전
            </button>
          )}
          <button
            className="tutorial-button tutorial-button--primary"
            onClick={isLastStep
              ? onComplete
              : () => setStepIndex((current) => current + 1)}
            type="button"
          >
            {isLastStep ? '시작하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
