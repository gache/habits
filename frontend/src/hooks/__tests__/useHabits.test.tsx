import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import { useHabits, useCreateHabit, useDeleteHabit } from '../useHabits'

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

describe('useHabits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches habits and passes the active filter as a param', async () => {
    const habits = [{ id: '1', name: 'Leer', active: true }]
    vi.mocked(api.get).mockResolvedValue({ data: habits })

    const { result } = renderHook(() => useHabits(true), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(habits)
    expect(api.get).toHaveBeenCalledWith('/api/habits', { params: { active: true } })
  })

  it('omits the active param when not provided', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] })

    const { result } = renderHook(() => useHabits(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/habits', { params: {} })
  })

  it('creates a habit via POST', async () => {
    const created = { id: '2', name: 'Meditar' }
    vi.mocked(api.post).mockResolvedValue({ data: created })

    const { result } = renderHook(() => useCreateHabit(), { wrapper: wrapper() })
    result.current.mutate({ name: 'Meditar' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/habits', { name: 'Meditar' })
  })

  it('deletes a habit via DELETE', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined })

    const { result } = renderHook(() => useDeleteHabit(), { wrapper: wrapper() })
    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/habits/1')
  })
})
