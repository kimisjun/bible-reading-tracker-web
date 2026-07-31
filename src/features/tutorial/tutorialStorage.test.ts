import {
  hasCompletedTutorial,
  markTutorialCompleted,
  type TutorialStorage,
} from './tutorialStorage'

describe('tutorialStorage', () => {
  it('브라우저 저장소 읽기와 쓰기가 실패해도 앱 사용을 막지 않는다', () => {
    const storage: TutorialStorage = {
      getItem: () => {
        throw new DOMException('접근 거부', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('공간 부족', 'QuotaExceededError')
      },
    }

    expect(hasCompletedTutorial(storage)).toBe(false)
    expect(() => markTutorialCompleted(storage)).not.toThrow()
  })
})
