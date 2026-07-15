import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

describe('api', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('../firebase')
  })

  it('installs the demo adapter and serves requests locally when VITE_DEMO_MODE is true', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    vi.doMock('../firebase', () => ({ auth: {} }))

    const { default: api } = await import('../api')
    const res = await api.get('/health')

    expect(res.data).toEqual({ status: 'ok (demo)' })
  })

  it('attaches a bearer token from the current user when not in demo mode', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    vi.doMock('../firebase', () => ({
      auth: { currentUser: { getIdToken: async () => 'tok123' } },
    }))

    const { default: api } = await import('../api')
    let captured: InternalAxiosRequestConfig | undefined
    api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      captured = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }

    await (api as AxiosInstance).get('/api/habits')

    expect(captured?.headers.Authorization).toBe('Bearer tok123')
  })

  it('sends no Authorization header when there is no current user', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'false')
    vi.doMock('../firebase', () => ({ auth: { currentUser: null } }))

    const { default: api } = await import('../api')
    let captured: InternalAxiosRequestConfig | undefined
    api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      captured = config
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
    }

    await (api as AxiosInstance).get('/api/habits')

    expect(captured?.headers.Authorization).toBeUndefined()
  })
})
