import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import DayCell from '../DayCell'

function baseProps(overrides: Partial<Parameters<typeof DayCell>[0]> = {}) {
  return {
    habitId: 'h1',
    date: '2026-07-10',
    completed: false,
    color: '#b8d8a8',
    isToday: false,
    hiddenOnMobile: false,
    onToggle: vi.fn(),
    ...overrides,
  }
}

describe('DayCell', () => {
  it('renders an accessible label reflecting the completed state', () => {
    render(<table><tbody><tr><DayCell {...baseProps({ completed: true })} /></tr></tbody></table>)
    expect(screen.getByRole('button', { name: /2026-07-10, completado/ })).toBeInTheDocument()
  })

  it('calls onToggle with habitId, date and the current completed state when clicked', () => {
    const onToggle = vi.fn()
    render(<table><tbody><tr><DayCell {...baseProps({ onToggle, completed: false })} /></tr></tbody></table>)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledWith('h1', '2026-07-10', false)
  })

  it('does not call onToggle when disabled', () => {
    const onToggle = vi.fn()
    render(<table><tbody><tr><DayCell {...baseProps({ onToggle, disabled: true, disabledReason: 'future' })} /></tr></tbody></table>)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('does not re-render when re-rendered with the same props (React.memo)', () => {
    const renderSpy = vi.fn(DayCell.type)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(DayCell as any).type = renderSpy
    const stableProps = baseProps()

    function Harness() {
      const [tick, setTick] = useState(0)
      return (
        <div>
          <button onClick={() => setTick((t) => t + 1)}>bump</button>
          <span data-testid="tick">{tick}</span>
          <table><tbody><tr><DayCell {...stableProps} /></tr></tbody></table>
        </div>
      )
    }

    render(<Harness />)
    expect(renderSpy).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('bump'))
    expect(screen.getByTestId('tick').textContent).toBe('1')
    expect(renderSpy).toHaveBeenCalledTimes(1)
  })

  it('re-renders when the completed prop changes', () => {
    const renderSpy = vi.fn(DayCell.type)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(DayCell as any).type = renderSpy

    function Harness() {
      const [completed, setCompleted] = useState(false)
      return (
        <div>
          <button onClick={() => setCompleted((c) => !c)}>bump</button>
          <table><tbody><tr><DayCell {...baseProps({ completed })} /></tr></tbody></table>
        </div>
      )
    }

    render(<Harness />)
    expect(renderSpy).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('bump'))
    expect(renderSpy).toHaveBeenCalledTimes(2)
  })
})
