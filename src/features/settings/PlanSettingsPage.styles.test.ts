/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/features/settings/PlanSettingsPage.css'), 'utf8')

describe('PlanSettingsPage styles', () => {
  it('요일 터치 영역을 320px에서도 가로·세로 44px 이상으로 유지한다', () => {
    expect(css).toContain('grid-template-columns: repeat(auto-fit, minmax(44px, 1fr))')
    expect(css).toMatch(/\.plan-settings__card input,[\s\S]*min-height: 44px/)
    expect(css).toContain('@media (max-width: 360px)')
  })

  it('다크 모드와 움직임 감소 환경을 명시적으로 지원한다', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
