import { useMemo, useState, type FormEvent } from 'react'
import { bibleBooks } from '../../data/bibleBooks'
import { createPresetPlanRequest } from '../../data/commonPlans'
import { createPlanPreview, generateReadingPlan } from '../../domain/plans'
import type {
  MissedDayPolicy,
  PlanKind,
  PlanPreset,
  PlanPreview,
  PlanRange,
  ReadingOrder,
  ReadingPlan,
  Weekday,
} from '../../domain/planTypes'
import './PlanSettingsPage.css'

export type PlanSettingsPageProps = Readonly<{
  commonPlan: ReadingPlan | null
  personalPlan: ReadingPlan | null
  onSavePlan: (kind: PlanKind, plan: ReadingPlan) => void
  onRemovePlan: (kind: PlanKind) => void
  today?: string
  createId?: (kind: PlanKind) => string
  now?: () => string
}>

type PreviewResult = Readonly<
  { plan: ReadingPlan; preview: PlanPreview } |
  { error: string; fieldId?: string }
>

const WEEKDAYS: readonly Readonly<{ value: Weekday; label: string }>[] = [
  { value: 0, label: '일' }, { value: 1, label: '월' }, { value: 2, label: '화' },
  { value: 3, label: '수' }, { value: 4, label: '목' }, { value: 5, label: '금' },
  { value: 6, label: '토' },
]
const ALL_WEEKDAYS = WEEKDAYS.map(({ value }) => value)
const PRESET_NAMES: Record<PlanPreset, string> = {
  'one-year': '1년 성경 일독',
  'six-month': '6개월 성경 일독',
  'ninety-days': '90일 성경 일독',
}
const PLAN_PRESETS = Object.keys(PRESET_NAMES) as PlanPreset[]

function inferCommonPreset(plan: ReadingPlan): PlanPreset {
  return PLAN_PRESETS.find((preset) => createPresetPlanRequest({
    id: plan.request.id,
    name: plan.request.name,
    preset,
    startDate: plan.request.startDate,
    weekdays: plan.request.weekdays,
  }).endDate === plan.request.endDate) ?? 'one-year'
}

function localToday(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function defaultId(kind: PlanKind): string {
  return globalThis.crypto?.randomUUID?.() ?? `${kind}-${Date.now()}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '계획을 미리 볼 수 없습니다.'
}

function previewError(error: unknown, kind: PlanKind): PreviewResult {
  const message = errorMessage(error)
  let fieldId: string | undefined
  if (message.includes('계획 이름')) fieldId = 'personal-name'
  else if (message.includes('책')) fieldId = 'personal-books'
  else if (message.includes('요일')) fieldId = `${kind}-weekdays`
  else if (message.includes('종료일')) fieldId = `${kind}-end`
  else if (message.includes('시작일')) fieldId = `${kind}-start`
  return { error: message, fieldId }
}

function fieldError(result: PreviewResult, fieldId: string): string | undefined {
  return 'error' in result && result.fieldId === fieldId ? result.error : undefined
}

function formatChapterList(planDay: ReadingPlan['schedule'][number]): string {
  return planDay.chapters.map((chapter) => {
    const book = bibleBooks.find(({ id }) => id === chapter.bookId)
    return `${book?.shortName ?? chapter.bookId} ${chapter.chapter}장`
  }).join(', ')
}

function PlanSummary({ kind, plan, onRemove }: Readonly<{
  kind: PlanKind
  plan: ReadingPlan | null
  onRemove: (kind: PlanKind) => void
}>) {
  const label = kind === 'common' ? '공통' : '개인'
  if (!plan) return <p className="plan-settings__empty">현재 저장된 {label} 계획이 없습니다.</p>
  return (
    <div className="plan-settings__current">
      <p><strong>현재 계획: {plan.request.name}</strong></p>
      <p>{plan.request.startDate} ~ {plan.request.endDate} · {plan.schedule.length}일</p>
      <button className="plan-settings__danger" type="button" onClick={() => onRemove(kind)}>
        {label} 계획 삭제
      </button>
    </div>
  )
}

function WeekdayPicker({ id, value, onChange, error }: Readonly<{
  id: string
  value: readonly Weekday[]
  onChange: (weekdays: Weekday[]) => void
  error?: string
}>) {
  return (
    <fieldset
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={error ? true : undefined}
      className="plan-settings__fieldset"
    >
      <legend>읽는 요일</legend>
      <div className="plan-settings__weekdays" id={id}>
        {WEEKDAYS.map((weekday) => {
          const selected = value.includes(weekday.value)
          return (
            <button
              aria-pressed={selected}
              key={weekday.value}
              type="button"
              onClick={() => onChange(selected
                ? value.filter((item) => item !== weekday.value)
                : [...value, weekday.value].sort((a, b) => a - b))}
            >
              {weekday.label}
            </button>
          )
        })}
      </div>
      {error && <p className="plan-settings__field-error" id={`${id}-error`}>{error}</p>}
    </fieldset>
  )
}

function Preview({ result }: Readonly<{ result: PreviewResult }>) {
  if ('error' in result) return null
  const { preview } = result
  return (
    <section className="plan-settings__preview" aria-live="polite" aria-label="계획 미리보기">
      <h4>미리보기</h4>
      <div className="plan-settings__metrics">
        <span>총 {preview.totalChapters.toLocaleString('ko-KR')}장</span>
        <span>읽는 날 {preview.readingDays.toLocaleString('ko-KR')}일</span>
        <span>하루 평균 {preview.averageChaptersPerDay.toFixed(1)}장</span>
        <span>완료 예정 {preview.lastScheduledDate}</span>
      </div>
      {preview.hasHeavyDay && <p className="plan-settings__warning" role="status">하루 10장 이상 읽는 날이 있어요. 저장은 가능합니다.</p>}
      <ol className="plan-settings__days">
        {preview.firstSevenDays.map((day) => <li key={day.date}><time dateTime={day.date}>{day.date}</time><span>{formatChapterList(day)}</span></li>)}
      </ol>
    </section>
  )
}

function ErrorSummary({ result }: Readonly<{ result: PreviewResult }>) {
  if (!('error' in result)) return null
  return (
    <div className="plan-settings__alert" role="alert">
      <strong>입력 내용을 확인해 주세요.</strong>
      <p>{result.error}</p>
    </div>
  )
}

function PlanSettingsForm({
  commonPlan,
  personalPlan,
  onSavePlan,
  onRemovePlan,
  today = localToday(),
  createId = defaultId,
  now = () => new Date().toISOString(),
}: PlanSettingsPageProps) {
  const [commonPreset, setCommonPreset] = useState<PlanPreset>(() =>
    commonPlan ? inferCommonPreset(commonPlan) : 'one-year')
  const [commonStart, setCommonStart] = useState(commonPlan?.request.startDate ?? today)
  const [commonWeekdays, setCommonWeekdays] = useState<Weekday[]>(
    commonPlan ? [...commonPlan.request.weekdays] : [...ALL_WEEKDAYS],
  )
  const [commonOrder, setCommonOrder] = useState<ReadingOrder>(
    commonPlan?.request.order ?? 'canonical',
  )
  const [commonPolicy, setCommonPolicy] = useState<MissedDayPolicy>(
    commonPlan?.request.missedDayPolicy ?? 'carry',
  )
  const [commonId] = useState(() => commonPlan?.request.id ?? createId('common'))
  const [personalId] = useState(() => personalPlan?.request.id ?? createId('personal'))
  const [personalName, setPersonalName] = useState(personalPlan?.request.name ?? '나의 통독 계획')
  const [personalRangeType, setPersonalRangeType] = useState<PlanRange['type']>(personalPlan?.request.range.type ?? 'all')
  const [personalBookIds, setPersonalBookIds] = useState<string[]>(
    personalPlan?.request.range.type === 'books' ? [...personalPlan.request.range.bookIds] : [],
  )
  const [personalStart, setPersonalStart] = useState(personalPlan?.request.startDate ?? today)
  const [personalEnd, setPersonalEnd] = useState(personalPlan?.request.endDate ?? (() => {
    try {
      return createPresetPlanRequest({ id: 'default', name: 'default', preset: 'one-year', startDate: today }).endDate
    } catch {
      return today
    }
  })())
  const [personalWeekdays, setPersonalWeekdays] = useState<Weekday[]>(
    personalPlan ? [...personalPlan.request.weekdays] : [...ALL_WEEKDAYS],
  )
  const [personalOrder, setPersonalOrder] = useState<ReadingOrder>(personalPlan?.request.order ?? 'canonical')
  const [personalPolicy, setPersonalPolicy] = useState<MissedDayPolicy>(personalPlan?.request.missedDayPolicy ?? 'carry')

  const commonResult = useMemo<PreviewResult>(() => {
    try {
      const request = {
        ...createPresetPlanRequest({
          id: commonId,
          name: PRESET_NAMES[commonPreset],
          preset: commonPreset,
          startDate: commonStart,
          weekdays: commonWeekdays,
        }),
        order: commonOrder,
        missedDayPolicy: commonPolicy,
      }
      const plan = generateReadingPlan(request, now())
      return { plan, preview: createPlanPreview(plan) }
    } catch (error) {
      return previewError(error, 'common')
    }
  }, [commonId, commonOrder, commonPolicy, commonPreset, commonStart, commonWeekdays, now])

  const personalResult = useMemo<PreviewResult>(() => {
    try {
      if (!personalName.trim()) throw new Error('계획 이름을 입력해 주세요.')
      const range: PlanRange = personalRangeType === 'books'
        ? { type: 'books', bookIds: personalBookIds }
        : { type: personalRangeType }
      const plan = generateReadingPlan({
        id: personalId,
        name: personalName.trim(),
        kind: 'personal',
        startDate: personalStart,
        endDate: personalEnd,
        weekdays: personalWeekdays,
        range,
        order: personalOrder,
        missedDayPolicy: personalPolicy,
      }, now())
      return { plan, preview: createPlanPreview(plan) }
    } catch (error) {
      return previewError(error, 'personal')
    }
  }, [now, personalBookIds, personalEnd, personalId, personalName, personalOrder, personalPolicy, personalRangeType, personalStart, personalWeekdays])

  function saveCommon(event: FormEvent) {
    event.preventDefault()
    if (!('error' in commonResult)) onSavePlan('common', commonResult.plan)
  }

  function savePersonal(event: FormEvent) {
    event.preventDefault()
    if (!('error' in personalResult)) onSavePlan('personal', personalResult.plan)
  }

  return (
    <div className="plan-settings">
      <section aria-labelledby="common-plan-title" className="plan-settings__card" role="region">
        <h2 id="common-plan-title">공통 통독 계획</h2>
        <PlanSummary kind="common" plan={commonPlan} onRemove={onRemovePlan} />
        <ErrorSummary result={commonResult} />
        <form onSubmit={saveCommon}>
          <label htmlFor="common-preset">기간</label>
          <select id="common-preset" value={commonPreset} onChange={(event) => setCommonPreset(event.target.value as PlanPreset)}>
            <option value="one-year">1년</option><option value="six-month">6개월</option><option value="ninety-days">90일</option>
          </select>
          <label htmlFor="common-start">시작일</label>
          <input
            aria-describedby={fieldError(commonResult, 'common-start') ? 'common-start-error' : undefined}
            aria-invalid={fieldError(commonResult, 'common-start') ? true : undefined}
            id="common-start"
            type="date"
            value={commonStart}
            onChange={(event) => setCommonStart(event.target.value)}
          />
          {fieldError(commonResult, 'common-start') && (
            <p className="plan-settings__field-error" id="common-start-error">
              {fieldError(commonResult, 'common-start')}
            </p>
          )}
          <WeekdayPicker
            id="common-weekdays"
            value={commonWeekdays}
            onChange={setCommonWeekdays}
            error={fieldError(commonResult, 'common-weekdays')}
          />
          <label htmlFor="common-order">읽기 순서</label>
          <select id="common-order" value={commonOrder} onChange={(event) => setCommonOrder(event.target.value as ReadingOrder)}>
            <option value="canonical">성경 순서</option><option value="old-new-parallel">구약 + 신약 병행</option>
          </select>
          <label htmlFor="common-policy">놓친 일정 처리</label>
          <select id="common-policy" value={commonPolicy} onChange={(event) => setCommonPolicy(event.target.value as MissedDayPolicy)}>
            <option value="carry">밀린 분량 누적</option><option value="redistribute">남은 날짜에 재분배</option><option value="restart-today">오늘부터 다시 계산</option>
          </select>
          <Preview result={commonResult} />
          <button className="plan-settings__primary" type="submit" disabled={'error' in commonResult}>공통 계획 저장</button>
        </form>
      </section>

      <section aria-labelledby="personal-plan-title" className="plan-settings__card" role="region">
        <h2 id="personal-plan-title">개인 통독 계획</h2>
        <PlanSummary kind="personal" plan={personalPlan} onRemove={onRemovePlan} />
        <ErrorSummary result={personalResult} />
        <form onSubmit={savePersonal}>
          <label htmlFor="personal-name">계획 이름</label>
          <input
            aria-describedby={!personalName.trim() ? 'personal-name-error' : undefined}
            aria-invalid={!personalName.trim() || undefined}
            id="personal-name"
            value={personalName}
            onChange={(event) => setPersonalName(event.target.value)}
          />
          {!personalName.trim() && (
            <p className="plan-settings__field-error" id="personal-name-error">
              계획 이름을 입력해 주세요.
            </p>
          )}
          <label htmlFor="personal-range">범위</label>
          <select id="personal-range" value={personalRangeType} onChange={(event) => setPersonalRangeType(event.target.value as PlanRange['type'])}>
            <option value="all">전체 성경</option><option value="old">구약</option><option value="new">신약</option><option value="books">특정 책</option>
          </select>
          {personalRangeType === 'books' && (
            <fieldset
              aria-describedby={fieldError(personalResult, 'personal-books') ? 'personal-books-error' : undefined}
              aria-invalid={fieldError(personalResult, 'personal-books') ? true : undefined}
              className="plan-settings__fieldset plan-settings__books"
            >
              <legend>읽을 책</legend>
              <div className="plan-settings__book-grid">
                {bibleBooks.map((book) => (
                  <label key={book.id}>
                    <input
                      checked={personalBookIds.includes(book.id)}
                      type="checkbox"
                      aria-label={`${book.name} ${book.chapters}장`}
                      onChange={(event) => setPersonalBookIds(event.target.checked
                        ? [...personalBookIds, book.id]
                        : personalBookIds.filter((bookId) => bookId !== book.id))}
                    />
                    <span>{book.name}<small>{book.chapters}장</small></span>
                  </label>
                ))}
              </div>
              {fieldError(personalResult, 'personal-books') && (
                <p className="plan-settings__field-error" id="personal-books-error">
                  {fieldError(personalResult, 'personal-books')}
                </p>
              )}
            </fieldset>
          )}
          <div className="plan-settings__date-grid">
            <div className="plan-settings__date-field">
              <label htmlFor="personal-start">시작일</label>
              <input
                aria-describedby={fieldError(personalResult, 'personal-start') ? 'personal-start-error' : undefined}
                aria-invalid={fieldError(personalResult, 'personal-start') ? true : undefined}
                id="personal-start"
                type="date"
                value={personalStart}
                onChange={(event) => setPersonalStart(event.target.value)}
              />
              {fieldError(personalResult, 'personal-start') && (
                <span className="plan-settings__field-error" id="personal-start-error">
                  {fieldError(personalResult, 'personal-start')}
                </span>
              )}
            </div>
            <div className="plan-settings__date-field">
              <label htmlFor="personal-end">종료일</label>
              <input
                aria-describedby={fieldError(personalResult, 'personal-end') ? 'personal-end-error' : undefined}
                aria-invalid={fieldError(personalResult, 'personal-end') ? true : undefined}
                id="personal-end"
                type="date"
                value={personalEnd}
                onChange={(event) => setPersonalEnd(event.target.value)}
              />
              {fieldError(personalResult, 'personal-end') && (
                <span className="plan-settings__field-error" id="personal-end-error">
                  {fieldError(personalResult, 'personal-end')}
                </span>
              )}
            </div>
          </div>
          <WeekdayPicker
            id="personal-weekdays"
            value={personalWeekdays}
            onChange={setPersonalWeekdays}
            error={fieldError(personalResult, 'personal-weekdays')}
          />
          <label htmlFor="personal-order">읽기 순서</label>
          <select id="personal-order" value={personalOrder} onChange={(event) => setPersonalOrder(event.target.value as ReadingOrder)}>
            <option value="canonical">성경 순서</option><option value="old-new-parallel">구약 + 신약 병행</option>
          </select>
          <label htmlFor="personal-policy">놓친 일정 처리</label>
          <select id="personal-policy" value={personalPolicy} onChange={(event) => setPersonalPolicy(event.target.value as MissedDayPolicy)}>
            <option value="carry">밀린 분량 누적</option><option value="redistribute">남은 날짜에 재분배</option><option value="restart-today">오늘부터 다시 계산</option>
          </select>
          <Preview result={personalResult} />
          <button className="plan-settings__primary" type="submit" disabled={'error' in personalResult}>개인 계획 저장</button>
        </form>
      </section>
    </div>
  )
}

export function PlanSettingsPage(props: PlanSettingsPageProps) {
  const formKey = JSON.stringify([
    props.commonPlan?.request ?? null,
    props.commonPlan?.createdAt ?? null,
    props.personalPlan?.request ?? null,
    props.personalPlan?.createdAt ?? null,
  ])
  return <PlanSettingsForm key={formKey} {...props} />
}

export type { PlanRange }
