import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Toast from '../Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the message', () => {
    render(<Toast message="Guardado" onTimeout={vi.fn()} />)
    expect(screen.getByText('Guardado')).toBeInTheDocument()
  })

  it('calls onTimeout after durationMs elapses', () => {
    const onTimeout = vi.fn()
    render(<Toast message="Guardado" onTimeout={onTimeout} durationMs={3000} />)

    expect(onTimeout).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2999)
    expect(onTimeout).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('does not render an action button when actionLabel/onAction are omitted', () => {
    render(<Toast message="Guardado" onTimeout={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onAction when the action button is clicked', () => {
    const onAction = vi.fn()
    render(
      <Toast message="Eliminado" actionLabel="Deshacer" onAction={onAction} onTimeout={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
