export const TUTORIAL_STORAGE_KEY = 'bible-reading-tracker:tutorial:v1'

export type TutorialStorage = Pick<Storage, 'getItem' | 'setItem'>

export function hasCompletedTutorial(
  storage: TutorialStorage = window.localStorage,
): boolean {
  try {
    return storage.getItem(TUTORIAL_STORAGE_KEY) === 'completed'
  } catch {
    return false
  }
}

export function markTutorialCompleted(
  storage: TutorialStorage = window.localStorage,
): void {
  try {
    storage.setItem(TUTORIAL_STORAGE_KEY, 'completed')
  } catch {
    // 튜토리얼 저장 실패가 읽기 기록 사용을 막아서는 안 된다.
  }
}
