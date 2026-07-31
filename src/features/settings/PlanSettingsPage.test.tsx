import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

describe('PlanSettingsPage', () => {
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
    expect(within(personal).getByLabelText('계획 이름')).toHaveValue('복음서 읽기')
    await user.clear(within(personal).getByLabelText('계획 이름'))
    expect(within(personal).getByRole('alert')).toHaveTextContent('계획 이름을 입력해 주세요.')
    expect(within(personal).getByRole('button', { name: '개인 계획 저장' })).toBeDisabled()
    expect(within(personal).getByText('현재 계획: 복음서 읽기')).toBeInTheDocument()
    expect(onSavePlan).not.toHaveBeenCalled()
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
