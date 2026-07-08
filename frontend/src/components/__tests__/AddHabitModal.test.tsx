import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import AddHabitModal from '../AddHabitModal'
import { type Habit } from '@/hooks/useHabits'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

const existingHabit: Habit = {
  id: 'h1',
  name: 'Meditar',
  description: '10 min',
  frequency: 'weekly',
  active: true,
  icon: '🧘',
  color: '#d4a8d4',
  order: 1,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: null,
}

describe('AddHabitModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the create title and an empty name field when not editing', () => {
    render(<AddHabitModal onClose={vi.fn()} />, { wrapper: wrapper() })
    expect(screen.getByText('Agregar Nuevo Hábito')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ej. TOMAR AGUA')).toHaveValue('')
  })

  it('shows the edit title and pre-fills fields from the habit being edited', () => {
    render(<AddHabitModal editing={existingHabit} onClose={vi.fn()} />, { wrapper: wrapper() })
    expect(screen.getByText('Editar Hábito')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ej. TOMAR AGUA')).toHaveValue('Meditar')
    expect(screen.getByPlaceholderText('ej. 8 vasos')).toHaveValue('10 min')
    expect(screen.getByLabelText('Frecuencia')).toHaveValue('weekly')
  })

  it('submits a POST with the form values and calls onSaved + onClose on create', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { ...existingHabit, id: 'new-id' } })
    const onClose = vi.fn()
    const onSaved = vi.fn()
    render(<AddHabitModal onClose={onClose} onSaved={onSaved} />, { wrapper: wrapper() })

    fireEvent.change(screen.getByPlaceholderText('ej. TOMAR AGUA'), { target: { value: 'Correr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Hábito' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/habits', expect.objectContaining({ name: 'Correr' })))
    expect(onSaved).toHaveBeenCalledWith('"Correr" agregado')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submits a PATCH with the habit id and calls onSaved with an "actualizado" message on edit', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: existingHabit })
    const onClose = vi.fn()
    const onSaved = vi.fn()
    render(<AddHabitModal editing={existingHabit} onClose={onClose} onSaved={onSaved} />, { wrapper: wrapper() })

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }))

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/habits/h1', expect.objectContaining({ name: 'Meditar' })))
    expect(onSaved).toHaveBeenCalledWith('"Meditar" actualizado')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('applies a quick preset to icon, name, description, and color', () => {
    render(<AddHabitModal onClose={vi.fn()} />, { wrapper: wrapper() })
    fireEvent.click(screen.getByRole('button', { name: /Tomar Agua/ }))
    expect(screen.getByPlaceholderText('ej. TOMAR AGUA')).toHaveValue('Tomar Agua')
    expect(screen.getByPlaceholderText('ej. 8 vasos')).toHaveValue('8 vasos')
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<AddHabitModal onClose={onClose} />, { wrapper: wrapper() })
    fireEvent.click(screen.getByLabelText('Cerrar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
