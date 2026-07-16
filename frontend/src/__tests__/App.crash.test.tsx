import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import App from '../App'

vi.mock('@/lib/firebase', () => ({ auth: {} }))
vi.mock('@/components/UpdatePrompt', () => ({ default: () => null }))
vi.mock('@/pages/Tracker', () => ({
  default: () => {
    throw new Error('boom')
  },
}))

let authCallback: ((user: User | null) => void) | undefined
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: User | null) => void) => {
    authCallback = cb
    return () => {}
  },
}))

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App crash handling', () => {
  beforeEach(() => {
    authCallback = undefined
    window.history.pushState({}, '', '/')
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('shows a fallback instead of a blank screen when a page crashes', async () => {
    renderApp()
    act(() => authCallback?.({ uid: 'u1', email: 'user@example.com' } as User))

    expect(await screen.findByText('Algo salió mal.')).toBeInTheDocument()
  })
})
