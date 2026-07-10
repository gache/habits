import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrendChart from '../TrendChart'

describe('TrendChart', () => {
  it('renders an accessible text point for each month in the trend', () => {
    render(
      <TrendChart
        points={[
          { monthStr: '2026-02', pct: 40 },
          { monthStr: '2026-03', pct: 55 },
          { monthStr: '2026-04', pct: 60 },
          { monthStr: '2026-05', pct: 70 },
          { monthStr: '2026-06', pct: 65 },
          { monthStr: '2026-07', pct: 80 },
        ]}
      />,
    )
    expect(screen.getByText('2026-07: 80%')).toBeInTheDocument()
    expect(screen.getByText('2026-02: 40%')).toBeInTheDocument()
  })

  it('renders the trend heading', () => {
    render(<TrendChart points={[{ monthStr: '2026-07', pct: 50 }]} />)
    expect(screen.getByText(/TENDENCIA/)).toBeInTheDocument()
  })
})
