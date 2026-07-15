import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import App from '../App'

vi.mock('@/lib/firebase', () => ({ auth: {} }))
vi.mock('@/components/UpdatePrompt', () => ({ default: () => null }))

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
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

describe('App', () => {
  beforeEach(() => {
    authCallback = undefined
    window.history.pushState({}, '', '/')
  })

  it('shows a loading state before the auth state resolves', () => {
    renderApp()

    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('renders the Login page when there is no authenticated user', async () => {
    renderApp()
    act(() => authCallback?.(null))

    expect(await screen.findByRole('button', { name: 'Continuar con Google' }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders the Tracker page when a user is authenticated', async () => {
    renderApp()
    act(() => authCallback?.({ uid: 'u1', email: 'user@example.com' } as User))

    expect(await screen.findByText('Historial')).toBeInTheDocument()
  })

  it('redirects an unknown path to the tracker for an authenticated user', async () => {
    window.history.pushState({}, '', '/does-not-exist')
    renderApp()
    act(() => authCallback?.({ uid: 'u1', email: 'user@example.com' } as User))

    expect(await screen.findByText('Historial')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })
})
