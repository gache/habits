import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import { useCompletions, useCompletionsForMonths, useToggleCompletion } from '../useCompletions'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    queryClient,
  }
}

describe('useCompletions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches completions for the given month', async () => {
    const completions = [{ id: 'c1', habit_id: 'h1', date: '2026-07-02', created_at: null }]
    vi.mocked(api.get).mockResolvedValue({ data: completions })

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useCompletions('2026-07'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(completions)
    expect(api.get).toHaveBeenCalledWith('/api/completions', { params: { month: '2026-07' } })
  })
})

describe('useCompletionsForMonths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches each month and flattens the results into one array', async () => {
    vi.mocked(api.get).mockImplementation((_url: string, config?: { params?: { month?: string } }) => {
      const month = config?.params?.month
      if (month === '2026-07') return Promise.resolve({ data: [{ id: 'c1', habit_id: 'h1', date: '2026-07-02', created_at: null }] })
      if (month === '2026-06') return Promise.resolve({ data: [{ id: 'c2', habit_id: 'h1', date: '2026-06-15', created_at: null }] })
      return Promise.resolve({ data: [] })
    })

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useCompletionsForMonths(['2026-07', '2026-06']), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([
      { id: 'c1', habit_id: 'h1', date: '2026-07-02', created_at: null },
      { id: 'c2', habit_id: 'h1', date: '2026-06-15', created_at: null },
    ])
  })

  it('reports loading while any month is still fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useCompletionsForMonths(['2026-07']), { wrapper: Wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toEqual([])
  })
})

describe('useToggleCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // onSettled invalidates the completions query, which refetches via
    // api.get in the background — give it a resolved value so that
    // background refetch doesn't throw an unhandled rejection.
    vi.mocked(api.get).mockResolvedValue({ data: [] })
  })

  it('marks a habit complete via POST when not yet completed', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'c1', habit_id: 'h1', date: '2026-07-02', created_at: null } })

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useToggleCompletion('2026-07'), { wrapper: Wrapper })
    result.current.toggle('h1', '2026-07-02', false)

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/habits/h1/complete', { date: '2026-07-02' })
    })
  })

  it('unmarks a habit via DELETE when already completed', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined })

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useToggleCompletion('2026-07'), { wrapper: Wrapper })
    result.current.toggle('h1', '2026-07-02', true)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/habits/h1/complete', { params: { date: '2026-07-02' } })
    })
  })

  it('optimistically adds the completion to the cache before the request resolves', async () => {
    let resolvePost: (v: { data: unknown }) => void
    vi.mocked(api.post).mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))

    const { Wrapper, queryClient } = wrapper()
    queryClient.setQueryData(['completions', '2026-07'], [])
    const { result } = renderHook(() => useToggleCompletion('2026-07'), { wrapper: Wrapper })
    result.current.toggle('h1', '2026-07-02', false)

    await waitFor(() => {
      const cached = queryClient.getQueryData<{ habit_id: string; date: string }[]>(['completions', '2026-07'])
      expect(cached).toEqual([{ id: 'opt-h1-2026-07-02', habit_id: 'h1', date: '2026-07-02', created_at: null }])
    })

    resolvePost!({ data: { id: 'c1', habit_id: 'h1', date: '2026-07-02', created_at: null } })
  })

  it('rolls back the optimistic update if the mark request fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('network error'))

    const { Wrapper, queryClient } = wrapper()
    queryClient.setQueryData(['completions', '2026-07'], [])
    const { result } = renderHook(() => useToggleCompletion('2026-07'), { wrapper: Wrapper })
    result.current.toggle('h1', '2026-07-02', false)

    await waitFor(() => {
      const cached = queryClient.getQueryData(['completions', '2026-07'])
      expect(cached).toEqual([])
    })
  })

  it('surfaces a toggleError message when the mark request fails (e.g. offline)', async () => {
    // Before this, a failed toggle rolled back silently: the checkbox
    // flashed on then reverted with zero indication anything went wrong —
    // easy to miss, especially offline where it happens on every tap.
    vi.mocked(api.post).mockRejectedValue(new Error('network error'))

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useToggleCompletion('2026-07'), { wrapper: Wrapper })
    expect(result.current.toggleError).toBeNull()
    result.current.toggle('h1', '2026-07-02', false)

    await waitFor(() => {
      expect(result.current.toggleError).toEqual(expect.any(String))
    })
  })

  it('surfaces a toggleError message when the unmark request fails (e.g. offline)', async () => {
    vi.mocked(api.delete).mockRejectedValue(new Error('network error'))

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useToggleCompletion('2026-07'), { wrapper: Wrapper })
    result.current.toggle('h1', '2026-07-02', true)

    await waitFor(() => {
      expect(result.current.toggleError).toEqual(expect.any(String))
    })
  })

  it('clears toggleError when dismissToggleError is called', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('network error'))

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useToggleCompletion('2026-07'), { wrapper: Wrapper })
    result.current.toggle('h1', '2026-07-02', false)
    await waitFor(() => expect(result.current.toggleError).not.toBeNull())

    act(() => result.current.dismissToggleError())
    expect(result.current.toggleError).toBeNull()
  })

  it('returns a referentially stable toggle function across re-renders', () => {
    // HabitGrid/HabitRow/DayCell pass `toggle` straight down as a prop —
    // if it were a fresh function every render, it would defeat
    // React.memo on every row and every day cell on any unrelated re-render.
    const { Wrapper } = wrapper()
    const { result, rerender } = renderHook(() => useToggleCompletion('2026-07'), { wrapper: Wrapper })
    const first = result.current.toggle
    rerender()
    expect(result.current.toggle).toBe(first)
  })
})
