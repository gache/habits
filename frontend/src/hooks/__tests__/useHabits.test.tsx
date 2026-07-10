import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import { useHabits, useCreateHabit, useDeleteHabit, useRestoreHabit, useReorderHabits } from '../useHabits'

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

  it('deletes a habit for one month via DELETE', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined })

    const { result } = renderHook(() => useDeleteHabit(), { wrapper: wrapper() })
    result.current.mutate({ id: '1', month: '2026-07' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/habits/1', { params: { month: '2026-07' } })
  })

  it('restores a habit and its completions for one month via POST', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: undefined })

    const { result } = renderHook(() => useRestoreHabit(), { wrapper: wrapper() })
    result.current.mutate({ id: '1', month: '2026-07', dates: ['2026-07-02'] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/habits/1/restore', {
      month: '2026-07',
      dates: ['2026-07-02'],
    })
  })
})

describe('useReorderHabits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('PATCHes only habits whose order actually changed, as 1-based positions', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} })
    const habits = [
      { id: 'a', order: 2 },
      { id: 'b', order: 1 },
      { id: 'c', order: 3 },
    ] as never

    const { result } = renderHook(() => useReorderHabits(), { wrapper: wrapper() })
    result.current.mutate(habits)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // 'a' moves from order 2 -> 1, 'b' moves from order 1 -> 2, 'c' stays at 3
    expect(api.patch).toHaveBeenCalledWith('/api/habits/a', { order: 1 })
    expect(api.patch).toHaveBeenCalledWith('/api/habits/b', { order: 2 })
    expect(api.patch).toHaveBeenCalledTimes(2)
  })

  it('does nothing when the order is already correct', async () => {
    const habits = [
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
    ] as never

    const { result } = renderHook(() => useReorderHabits(), { wrapper: wrapper() })
    result.current.mutate(habits)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).not.toHaveBeenCalled()
  })
})
