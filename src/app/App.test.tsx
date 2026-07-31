import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('앱 이름과 개인 오프라인판 안내를 보여준다', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '말씀과 함께 걷기' })).toBeInTheDocument()
    expect(screen.getByText('개인 오프라인판')).toBeInTheDocument()
  })
})
