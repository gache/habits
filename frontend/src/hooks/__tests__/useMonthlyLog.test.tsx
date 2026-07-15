import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import { useMonthlyLog, useUpdateMonthlyLog } from '../useMonthlyLog'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
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

const LOG = {
  month: '2026-07',
  goal: 'Leer más',
  notes: '',
  reflection_well: '',
  reflection_improve: '',
  reflection_proud: '',
}

describe('useMonthlyLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the monthly log for the given month', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: LOG })

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useMonthlyLog('2026-07'), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(LOG)
    expect(api.get).toHaveBeenCalledWith('/api/monthly-log', { params: { month: '2026-07' } })
  })
})

describe('useUpdateMonthlyLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates an existing log via PATCH and caches the result', async () => {
    const updated = { ...LOG, goal: 'Leer 20 páginas' }
    vi.mocked(api.patch).mockResolvedValue({ data: updated })

    const { Wrapper, queryClient } = wrapper()
    const { result } = renderHook(() => useUpdateMonthlyLog('2026-07'), { wrapper: Wrapper })
    result.current.mutate({ goal: 'Leer 20 páginas' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/monthly-log/2026-07', { goal: 'Leer 20 páginas' })
    expect(queryClient.getQueryData(['monthly-log', '2026-07'])).toEqual(updated)
  })

  it('falls back to creating the log via POST when PATCH 404s', async () => {
    const notFound = Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404 },
    })
    vi.mocked(api.patch).mockRejectedValue(notFound)
    vi.mocked(api.post).mockResolvedValue({ data: LOG })

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useUpdateMonthlyLog('2026-07'), { wrapper: Wrapper })
    result.current.mutate({ goal: 'Leer más' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/monthly-log', { month: '2026-07', goal: 'Leer más' })
  })

  it('propagates non-404 errors without falling back to POST', async () => {
    const serverError = Object.assign(new Error('Server Error'), {
      isAxiosError: true,
      response: { status: 500 },
    })
    vi.mocked(api.patch).mockRejectedValue(serverError)

    const { Wrapper } = wrapper()
    const { result } = renderHook(() => useUpdateMonthlyLog('2026-07'), { wrapper: Wrapper })
    result.current.mutate({ goal: 'Leer más' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(api.post).not.toHaveBeenCalled()
  })
})
