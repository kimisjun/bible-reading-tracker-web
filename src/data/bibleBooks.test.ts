import { bibleBooks } from './bibleBooks'

describe('bibleBooks', () => {
  it('개신교 정경 66권을 구약 39권과 신약 27권으로 제공한다', () => {
    expect(bibleBooks).toHaveLength(66)
    expect(bibleBooks.filter((book) => book.testament === 'old')).toHaveLength(39)
    expect(bibleBooks.filter((book) => book.testament === 'new')).toHaveLength(27)
  })

  it('전체 장 수가 1,189장이다', () => {
    const totalChapters = bibleBooks.reduce((sum, book) => sum + book.chapters, 0)
    expect(totalChapters).toBe(1189)
  })

  it('ID와 한국어 이름이 모두 고유하고 유효한 장 수를 가진다', () => {
    const ids = bibleBooks.map((book) => book.id)
    const names = bibleBooks.map((book) => book.name)

    expect(new Set(ids).size).toBe(66)
    expect(new Set(names).size).toBe(66)
    expect(bibleBooks.every((book) => book.chapters > 0)).toBe(true)
  })

  it('창세기부터 요한계시록까지 정경 순서를 보존한다', () => {
    expect(bibleBooks[0]).toMatchObject({ id: 'genesis', name: '창세기', chapters: 50 })
    expect(bibleBooks.at(-1)).toMatchObject({ id: 'revelation', name: '요한계시록', chapters: 22 })
  })
})
