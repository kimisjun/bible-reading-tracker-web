import { getBibleAppleChapterUrl } from './bibleApple'

describe('getBibleAppleChapterUrl', () => {
  it.each([
    ['genesis', 1, 'https://goodtvbible.goodtv.co.kr/onbibleread/0/1/1'],
    ['exodus', 1, 'https://goodtvbible.goodtv.co.kr/onbibleread/0/2/1'],
    ['psalms', 23, 'https://goodtvbible.goodtv.co.kr/onbibleread/0/19/23'],
    ['matthew', 1, 'https://goodtvbible.goodtv.co.kr/onbibleread/0/40/1'],
    ['john', 3, 'https://goodtvbible.goodtv.co.kr/onbibleread/0/43/3'],
    ['revelation', 22, 'https://goodtvbible.goodtv.co.kr/onbibleread/0/66/22'],
  ])('%s %i장의 개역개정 바이블 애플 링크를 만든다', (bookId, chapter, expected) => {
    expect(getBibleAppleChapterUrl(bookId, chapter)).toBe(expected)
  })

  it.each([
    ['unknown-book', 1],
    ['genesis', 0],
    ['genesis', 51],
    ['revelation', 23],
  ])('유효하지 않은 책이나 장에는 링크를 만들지 않는다', (bookId, chapter) => {
    expect(getBibleAppleChapterUrl(bookId, chapter)).toBeNull()
  })
})
