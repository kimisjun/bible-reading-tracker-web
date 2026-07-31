export type Testament = 'old' | 'new'

export type BibleBook = Readonly<{
  id: string
  name: string
  shortName: string
  testament: Testament
  chapters: number
}>

const oldTestament: BibleBook[] = [
  { id: 'genesis', name: '창세기', shortName: '창', testament: 'old', chapters: 50 },
  { id: 'exodus', name: '출애굽기', shortName: '출', testament: 'old', chapters: 40 },
  { id: 'leviticus', name: '레위기', shortName: '레', testament: 'old', chapters: 27 },
  { id: 'numbers', name: '민수기', shortName: '민', testament: 'old', chapters: 36 },
  { id: 'deuteronomy', name: '신명기', shortName: '신', testament: 'old', chapters: 34 },
  { id: 'joshua', name: '여호수아', shortName: '수', testament: 'old', chapters: 24 },
  { id: 'judges', name: '사사기', shortName: '삿', testament: 'old', chapters: 21 },
  { id: 'ruth', name: '룻기', shortName: '룻', testament: 'old', chapters: 4 },
  { id: 'first-samuel', name: '사무엘상', shortName: '삼상', testament: 'old', chapters: 31 },
  { id: 'second-samuel', name: '사무엘하', shortName: '삼하', testament: 'old', chapters: 24 },
  { id: 'first-kings', name: '열왕기상', shortName: '왕상', testament: 'old', chapters: 22 },
  { id: 'second-kings', name: '열왕기하', shortName: '왕하', testament: 'old', chapters: 25 },
  { id: 'first-chronicles', name: '역대상', shortName: '대상', testament: 'old', chapters: 29 },
  { id: 'second-chronicles', name: '역대하', shortName: '대하', testament: 'old', chapters: 36 },
  { id: 'ezra', name: '에스라', shortName: '스', testament: 'old', chapters: 10 },
  { id: 'nehemiah', name: '느헤미야', shortName: '느', testament: 'old', chapters: 13 },
  { id: 'esther', name: '에스더', shortName: '에', testament: 'old', chapters: 10 },
  { id: 'job', name: '욥기', shortName: '욥', testament: 'old', chapters: 42 },
  { id: 'psalms', name: '시편', shortName: '시', testament: 'old', chapters: 150 },
  { id: 'proverbs', name: '잠언', shortName: '잠', testament: 'old', chapters: 31 },
  { id: 'ecclesiastes', name: '전도서', shortName: '전', testament: 'old', chapters: 12 },
  { id: 'song-of-songs', name: '아가', shortName: '아', testament: 'old', chapters: 8 },
  { id: 'isaiah', name: '이사야', shortName: '사', testament: 'old', chapters: 66 },
  { id: 'jeremiah', name: '예레미야', shortName: '렘', testament: 'old', chapters: 52 },
  { id: 'lamentations', name: '예레미야애가', shortName: '애', testament: 'old', chapters: 5 },
  { id: 'ezekiel', name: '에스겔', shortName: '겔', testament: 'old', chapters: 48 },
  { id: 'daniel', name: '다니엘', shortName: '단', testament: 'old', chapters: 12 },
  { id: 'hosea', name: '호세아', shortName: '호', testament: 'old', chapters: 14 },
  { id: 'joel', name: '요엘', shortName: '욜', testament: 'old', chapters: 3 },
  { id: 'amos', name: '아모스', shortName: '암', testament: 'old', chapters: 9 },
  { id: 'obadiah', name: '오바댜', shortName: '옵', testament: 'old', chapters: 1 },
  { id: 'jonah', name: '요나', shortName: '욘', testament: 'old', chapters: 4 },
  { id: 'micah', name: '미가', shortName: '미', testament: 'old', chapters: 7 },
  { id: 'nahum', name: '나훔', shortName: '나', testament: 'old', chapters: 3 },
  { id: 'habakkuk', name: '하박국', shortName: '합', testament: 'old', chapters: 3 },
  { id: 'zephaniah', name: '스바냐', shortName: '습', testament: 'old', chapters: 3 },
  { id: 'haggai', name: '학개', shortName: '학', testament: 'old', chapters: 2 },
  { id: 'zechariah', name: '스가랴', shortName: '슥', testament: 'old', chapters: 14 },
  { id: 'malachi', name: '말라기', shortName: '말', testament: 'old', chapters: 4 },
]

const newTestament: BibleBook[] = [
  { id: 'matthew', name: '마태복음', shortName: '마', testament: 'new', chapters: 28 },
  { id: 'mark', name: '마가복음', shortName: '막', testament: 'new', chapters: 16 },
  { id: 'luke', name: '누가복음', shortName: '눅', testament: 'new', chapters: 24 },
  { id: 'john', name: '요한복음', shortName: '요', testament: 'new', chapters: 21 },
  { id: 'acts', name: '사도행전', shortName: '행', testament: 'new', chapters: 28 },
  { id: 'romans', name: '로마서', shortName: '롬', testament: 'new', chapters: 16 },
  { id: 'first-corinthians', name: '고린도전서', shortName: '고전', testament: 'new', chapters: 16 },
  { id: 'second-corinthians', name: '고린도후서', shortName: '고후', testament: 'new', chapters: 13 },
  { id: 'galatians', name: '갈라디아서', shortName: '갈', testament: 'new', chapters: 6 },
  { id: 'ephesians', name: '에베소서', shortName: '엡', testament: 'new', chapters: 6 },
  { id: 'philippians', name: '빌립보서', shortName: '빌', testament: 'new', chapters: 4 },
  { id: 'colossians', name: '골로새서', shortName: '골', testament: 'new', chapters: 4 },
  { id: 'first-thessalonians', name: '데살로니가전서', shortName: '살전', testament: 'new', chapters: 5 },
  { id: 'second-thessalonians', name: '데살로니가후서', shortName: '살후', testament: 'new', chapters: 3 },
  { id: 'first-timothy', name: '디모데전서', shortName: '딤전', testament: 'new', chapters: 6 },
  { id: 'second-timothy', name: '디모데후서', shortName: '딤후', testament: 'new', chapters: 4 },
  { id: 'titus', name: '디도서', shortName: '딛', testament: 'new', chapters: 3 },
  { id: 'philemon', name: '빌레몬서', shortName: '몬', testament: 'new', chapters: 1 },
  { id: 'hebrews', name: '히브리서', shortName: '히', testament: 'new', chapters: 13 },
  { id: 'james', name: '야고보서', shortName: '약', testament: 'new', chapters: 5 },
  { id: 'first-peter', name: '베드로전서', shortName: '벧전', testament: 'new', chapters: 5 },
  { id: 'second-peter', name: '베드로후서', shortName: '벧후', testament: 'new', chapters: 3 },
  { id: 'first-john', name: '요한일서', shortName: '요일', testament: 'new', chapters: 5 },
  { id: 'second-john', name: '요한이서', shortName: '요이', testament: 'new', chapters: 1 },
  { id: 'third-john', name: '요한삼서', shortName: '요삼', testament: 'new', chapters: 1 },
  { id: 'jude', name: '유다서', shortName: '유', testament: 'new', chapters: 1 },
  { id: 'revelation', name: '요한계시록', shortName: '계', testament: 'new', chapters: 22 },
]

export const bibleBooks: readonly BibleBook[] = Object.freeze([
  ...oldTestament,
  ...newTestament,
])
