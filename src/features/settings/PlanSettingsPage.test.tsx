import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createPresetPlanRequest } from '../../data/commonPlans'
import { generateReadingPlan } from '../../domain/plans'
import type { PlanRequest, ReadingPlan } from '../../domain/planTypes'
import { PlanSettingsPage } from './PlanSettingsPage'

const NOW = '2026-08-01T09:00:00.000Z'

function personalPlan(overrides: Partial<PlanRequest> = {}): ReadingPlan {
  return generateReadingPlan({
    id: 'existing-personal',
    name: '복음서 읽기',
    kind: 'personal',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    range: { type: 'new' },
    order: 'canonical',
    missedDayPolicy: 'carry',
    ...overrides,
  }, NOW)
}

function commonPlan(): ReadingPlan {
  return generateReadingPlan({
    ...createPresetPlanRequest({
      id: 'existing-common',
      name: '6개월 성경 일독',
      preset: 'six-month',
      startDate: '2026-08-03',
      weekdays: [1, 3, 5],
    }),
    order: 'old-new-parallel',
    missedDayPolicy: 'redistribute',
  }, NOW)
}

describe('PlanSettingsPage', () => {
  it('다른 탭에서 공통 계획이 바뀌면 편집 폼도 새 계획으로 동기화한다', () => {
    const props = {
      personalPlan: null,
      onSavePlan: vi.fn(),
      onRemovePlan: vi.fn(),
      today: '2026-08-01',
      now: () => NOW,
    }
    const { rerender } = render(<PlanSettingsPage {...props} commonPlan={null} />)
    const common = screen.getByRole('region', { name: '공통 통독 계획' })
    expect(within(common).getByLabelText('기간')).toHaveValue('one-year')

    rerender(<PlanSettingsPage {...props} commonPlan={commonPlan()} />)
    const updatedCommon = screen.getByRole('region', { name: '공통 통독 계획' })

    expect(within(updatedCommon).getByLabelText('기간')).toHaveValue('six-month')
    expect(within(updatedCommon).getByLabelText('시작일')).toHaveValue('2026-08-03')
    expect(within(updatedCommon).getByRole('button', { name: '화' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(updatedCommon).getByLabelText('놓친 일정 처리')).toHaveValue('redistribute')
  })

  it('기존 공통 계획의 기간과 모든 편집 값을 폼에 불러와 그대로 저장한다', async () => {
    const user = userEvent.setup()
    const onSavePlan = vi.fn()
    render(
      <PlanSettingsPage
        commonPlan={commonPlan()}
        personalPlan={null}
        onSavePlan={onSavePlan}
        onRemovePlan={vi.fn()}
        today="2026-08-01"
        now={() => NOW}
      />,
    )

    const common = screen.getByRole('region', { name: '공통 통독 계획' })
    expect(within(common).getByLabelText('기간')).toHaveValue('six-month')
    expect(within(common).getByLabelText('시작일')).toHaveValue('2026-08-03')
    expect(within(common).getByRole('button', { name: '월' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(common).getByRole('button', { name: '화' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(common).getByRole('button', { name: '수' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(common).getByRole('button', { name: '금' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(common).getByLabelText('읽기 순서')).toHaveValue('old-new-parallel')
    expect(within(common).getByLabelText('놓친 일정 처리')).toHaveValue('redistribute')

    await user.click(within(common).getByRole('button', { name: '공통 계획 저장' }))
    expect(onSavePlan).toHaveBeenCalledWith('common', expect.objectContaining({
      request: expect.objectContaining({
        id: 'existing-common',
        startDate: '2026-08-03',
        weekdays: [1, 3, 5],
        order: 'old-new-parallel',
        missedDayPolicy: 'redistribute',
      }),
    }))
  })

  it('잘못된 공통 시작일 오류를 해당 입력에 연결한다', async () => {
    const user = userEvent.setup()
    render(
      <PlanSettingsPage
        commonPlan={null}
        personalPlan={null}
        onSavePlan={vi.fn()}
        onRemovePlan={vi.fn()}
        today="2026-08-01"
        now={() => NOW}
      />,
    )
    const common = screen.getByRole('region', { name: '공통 통독 계획' })
    const startDate = within(common).getByLabelText('시작일')

    await user.clear(startDate)

    expect(within(common).getByRole('alert')).toHaveTextContent('입력 내용을 확인해 주세요.')
    expect(startDate).toHaveAttribute('aria-invalid', 'true')
    expect(startDate).toHaveAttribute('aria-describedby', 'common-start-error')
    expect(within(common).getByText(/유효한 YYYY-MM-DD 시작일/, { selector: '#common-start-error' })).toBeInTheDocument()
  })

  it('공통 프리셋의 실제 일정을 미리 보고 결정적 ID와 시각으로 저장한다', async () => {
    const user = userEvent.setup()
    const onSavePlan = vi.fn()
    render(
      <PlanSettingsPage
        commonPlan={null}
        personalPlan={null}
        onSavePlan={onSavePlan}
        onRemovePlan={vi.fn()}
        today="2026-08-01"
        createId={(kind) => `${kind}-fixed`}
        now={() => NOW}
      />,
    )

    const common = screen.getByRole('region', { name: '공통 통독 계획' })
    expect(within(common).getByText('총 1,189장')).toBeInTheDocument()
    expect(within(common).getByText('읽는 날 365일')).toBeInTheDocument()
    expect(within(common).getByText('하루 평균 3.3장')).toBeInTheDocument()
    expect(within(common).getByText('완료 예정 2027-07-31')).toBeInTheDocument()
    expect(within(common).getAllByRole('listitem')).toHaveLength(7)

    await user.selectOptions(within(common).getByLabelText('기간'), 'ninety-days')
    expect(within(common).getByText('읽는 날 90일')).toBeInTheDocument()
    expect(within(common).getByText('하루 평균 13.2장')).toBeInTheDocument()
    expect(within(common).getByRole('status')).toHaveTextContent('하루 10장 이상')

    await user.click(within(common).getByRole('button', { name: '공통 계획 저장' }))
    expect(onSavePlan).toHaveBeenCalledWith('common', expect.objectContaining({
      createdAt: NOW,
      request: expect.objectContaining({
        id: 'common-fixed',
        kind: 'common',
        range: { type: 'all' },
        startDate: '2026-08-01',
        endDate: '2026-10-29',
      }),
    }))
  })

  it('개인 계획에서 특정 책을 복수 선택해 실제 미리보기와 저장 계획을 만든다', async () => {
    const user = userEvent.setup()
    const onSavePlan = vi.fn()
    render(
      <PlanSettingsPage
        commonPlan={null}
        personalPlan={null}
        onSavePlan={onSavePlan}
        onRemovePlan={vi.fn()}
        today="2026-08-01"
        createId={(kind) => `${kind}-fixed`}
        now={() => NOW}
      />,
    )

    const personal = screen.getByRole('region', { name: '개인 통독 계획' })
    await user.clear(within(personal).getByLabelText('계획 이름'))
    await user.type(within(personal).getByLabelText('계획 이름'), '복음서 집중 읽기')
    await user.selectOptions(within(personal).getByLabelText('범위'), 'books')
    expect(within(personal).getAllByRole('checkbox')).toHaveLength(66)
    await user.click(within(personal).getByRole('checkbox', { name: '마태복음 28장' }))
    await user.click(within(personal).getByRole('checkbox', { name: '마가복음 16장' }))
    await user.clear(within(personal).getByLabelText('종료일'))
    await user.type(within(personal).getByLabelText('종료일'), '2026-08-10')

    expect(within(personal).getByText('총 44장')).toBeInTheDocument()
    expect(within(personal).getByText('읽는 날 10일')).toBeInTheDocument()
    expect(within(personal).getByText('하루 평균 4.4장')).toBeInTheDocument()
    expect(within(personal).getAllByRole('listitem')).toHaveLength(7)

    await user.selectOptions(within(personal).getByLabelText('읽기 순서'), 'old-new-parallel')
    await user.selectOptions(within(personal).getByLabelText('놓친 일정 처리'), 'redistribute')
    await user.click(within(personal).getByRole('button', { name: '개인 계획 저장' }))

    expect(onSavePlan).toHaveBeenCalledWith('personal', expect.objectContaining({
      createdAt: NOW,
      request: expect.objectContaining({
        id: 'personal-fixed',
        name: '복음서 집중 읽기',
        kind: 'personal',
        range: { type: 'books', bookIds: ['matthew', 'mark'] },
        order: 'old-new-parallel',
        missedDayPolicy: 'redistribute',
      }),
    }))
  })

  it('잘못된 개인 입력은 한국어 오류를 알리고 기존 계획과 저장 콜백을 보존한다', async () => {
    const user = userEvent.setup()
    const existing = personalPlan()
    const onSavePlan = vi.fn()
    render(
      <PlanSettingsPage
        commonPlan={null}
        personalPlan={existing}
        onSavePlan={onSavePlan}
        onRemovePlan={vi.fn()}
        today="2026-08-01"
        now={() => NOW}
      />,
    )

    const personal = screen.getByRole('region', { name: '개인 통독 계획' })
    const nameInput = within(personal).getByLabelText('계획 이름')
    expect(nameInput).toHaveValue('복음서 읽기')
    await user.clear(nameInput)
    expect(within(personal).getByRole('alert')).toHaveTextContent('입력 내용을 확인해 주세요.')
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    expect(nameInput).toHaveAttribute('aria-describedby', 'personal-name-error')
    expect(within(personal).getByText('계획 이름을 입력해 주세요.', { selector: '#personal-name-error' })).toBeInTheDocument()
    expect(within(personal).getByRole('button', { name: '개인 계획 저장' })).toBeDisabled()
    expect(within(personal).getByText('현재 계획: 복음서 읽기')).toBeInTheDocument()
    expect(onSavePlan).not.toHaveBeenCalled()
  })

  it('빈 책·요일과 잘못된 날짜 오류를 각각의 필드에 연결한다', async () => {
    const user = userEvent.setup()
    render(
      <PlanSettingsPage
        commonPlan={null}
        personalPlan={personalPlan({ weekdays: [1] })}
        onSavePlan={vi.fn()}
        onRemovePlan={vi.fn()}
        today="2026-08-01"
        now={() => NOW}
      />,
    )

    const personal = screen.getByRole('region', { name: '개인 통독 계획' })
    await user.selectOptions(within(personal).getByLabelText('범위'), 'books')
    const books = within(personal).getByRole('group', { name: '읽을 책' })
    expect(books).toHaveAttribute('aria-invalid', 'true')
    expect(books).toHaveAttribute('aria-describedby', 'personal-books-error')
    expect(within(personal).getByText('계획 범위에 책이 없습니다.', { selector: '#personal-books-error' })).toBeInTheDocument()

    await user.selectOptions(within(personal).getByLabelText('범위'), 'all')
    await user.click(within(personal).getByRole('button', { name: '월' }))
    const weekdays = within(personal).getByRole('group', { name: '읽는 요일' })
    expect(weekdays).toHaveAttribute('aria-invalid', 'true')
    expect(weekdays).toHaveAttribute('aria-describedby', 'personal-weekdays-error')
    expect(within(personal).getByText('읽는 요일을 하나 이상 선택해야 합니다.', { selector: '#personal-weekdays-error' })).toBeInTheDocument()

    await user.click(within(personal).getByRole('button', { name: '월' }))
    const endDate = within(personal).getByLabelText('종료일')
    await user.clear(endDate)
    expect(endDate).toHaveAttribute('aria-invalid', 'true')
    expect(endDate).toHaveAttribute('aria-describedby', 'personal-end-error')
    expect(within(personal).getByText(/종료일이 유효한/, { selector: '#personal-end-error' })).toBeInTheDocument()

    await user.type(endDate, '2026-07-31')
    const startDate = within(personal).getByLabelText('시작일')
    expect(startDate).not.toHaveAttribute('aria-invalid')
    expect(endDate).toHaveAttribute('aria-invalid', 'true')
    expect(endDate).toHaveAttribute('aria-describedby', 'personal-end-error')
    expect(within(personal).getByText('종료일은 시작일보다 빠를 수 없습니다.', {
      selector: '#personal-end-error',
    })).toBeInTheDocument()
  })

  it('현재 계획 요약을 표시하고 삭제 콜백을 종류별로 호출한다', async () => {
    const user = userEvent.setup()
    const onRemovePlan = vi.fn()
    render(
      <PlanSettingsPage
        commonPlan={null}
        personalPlan={personalPlan()}
        onSavePlan={vi.fn()}
        onRemovePlan={onRemovePlan}
        today="2026-08-01"
        now={() => NOW}
      />,
    )

    const personal = screen.getByRole('region', { name: '개인 통독 계획' })
    expect(within(personal).getByText('현재 계획: 복음서 읽기')).toBeInTheDocument()
    expect(within(personal).getByText(/2026-08-01 ~ 2026-08-31/)).toBeInTheDocument()
    await user.click(within(personal).getByRole('button', { name: '개인 계획 삭제' }))
    expect(onRemovePlan).toHaveBeenCalledWith('personal')
  })
})
