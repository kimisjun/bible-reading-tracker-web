import { bibleBooks } from '../../data/bibleBooks'

const BIBLE_APPLE_REVISED_KOREAN_BASE_URL = 'https://goodtvbible.goodtv.co.kr/onbibleread/0'

export function getBibleAppleChapterUrl(bookId: string, chapter: number): string | null {
  const bookIndex = bibleBooks.findIndex((book) => book.id === bookId)
  if (bookIndex < 0) return null

  const book = bibleBooks[bookIndex]
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return null

  return `${BIBLE_APPLE_REVISED_KOREAN_BASE_URL}/${bookIndex + 1}/${chapter}`
}
