import { createDefaultAppState } from './schema'

describe('createDefaultAppState', () => {
  it('schemaVersion 1의 최소 앱 상태를 새로 만든다', () => {
    expect(createDefaultAppState()).toEqual({
      schemaVersion: 1,
      readingEvents: [],
      commonPlan: null,
      personalPlan: null,
      settings: {
        theme: 'light',
        readerName: '',
        reminder: null,
      },
    })
  })
})
