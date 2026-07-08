import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from '../ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders the title and message', () => {
    render(
      <ConfirmDialog title="Eliminar hábito" message="¿Estás seguro?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText('Eliminar hábito')).toBeInTheDocument()
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument()
  })

  it('uses default button labels when none are given', () => {
    render(<ConfirmDialog title="T" message="M" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })

  it('uses custom button labels when given', () => {
    render(
      <ConfirmDialog
        title="T"
        message="M"
        confirmLabel="Eliminar"
        cancelLabel="Volver"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog title="T" message="M" onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when clicking the backdrop', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole('alertdialog'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel on Escape', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not call onCancel when clicking inside the dialog panel', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog title="T" message="M" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('T'))
    expect(onCancel).not.toHaveBeenCalled()
  })
})
