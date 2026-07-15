/**
 * Demo-mode API adapter.
 * Replaces axios's HTTP adapter so every request is handled in-memory.
 */

import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import * as store from './demo-store'
import type { HabitCreate, HabitUpdate } from '@/hooks/useHabits'
import type { MonthlyLog } from '@/hooks/useMonthlyLog'

type FakeAxiosError = Error & { response: { status: number; data: unknown } }

function fakeError(message: string, status: number): FakeAxiosError {
  const err = new Error(message) as FakeAxiosError
  err.response = { status, data: {} }
  return err
}

function ok<T>(data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: {}, config: {} as InternalAxiosRequestConfig }
}

function notFound(): never {
  throw fakeError('Not found', 404)
}

export function installDemoAdapter(api: AxiosInstance) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase()
    const url = config.url ?? ''

    let body: Record<string, unknown> = {}
    if (config.data) {
      try { body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data } catch { /* ignore */ }
    }

    // GET /api/habits
    if (method === 'get' && url === '/api/habits') {
      return ok(store.listHabits(config.params?.active))
    }

    // POST /api/habits
    if (method === 'post' && url === '/api/habits') {
      return ok(store.createHabit(body as unknown as HabitCreate), 201)
    }

    // POST /api/habits/:id/complete
    const completeMatch = url.match(/^\/api\/habits\/([^/]+)\/complete$/)
    if (completeMatch) {
      if (method === 'post') {
        return ok(store.markComplete(completeMatch[1], body.date as string), 201)
      }
      if (method === 'delete') {
        store.unmarkComplete(completeMatch[1], config.params?.date)
        return ok(null, 204)
      }
    }

    // POST /api/habits/:id/restore
    const restoreMatch = url.match(/^\/api\/habits\/([^/]+)\/restore$/)
    if (method === 'post' && restoreMatch) {
      store.restoreHabit(restoreMatch[1], body.month as string, (body.dates as string[]) ?? [])
      return ok(null, 204)
    }

    // PATCH /api/habits/:id   or   DELETE /api/habits/:id
    const habitMatch = url.match(/^\/api\/habits\/([^/]+)$/)
    if (habitMatch) {
      if (method === 'patch') return ok(store.updateHabit(habitMatch[1], body as HabitUpdate))
      if (method === 'delete') {
        store.excludeHabitFromMonth(habitMatch[1], config.params?.month ?? '')
        return ok(null, 204)
      }
    }

    // GET /api/completions
    if (method === 'get' && url === '/api/completions') {
      return ok(store.listCompletions(config.params?.month ?? ''))
    }

    // GET /api/monthly-log
    if (method === 'get' && url === '/api/monthly-log') {
      const log = store.getMonthlyLog(config.params?.month ?? '')
      if (!log) notFound()
      return ok(log)
    }

    // POST /api/monthly-log
    if (method === 'post' && url === '/api/monthly-log') {
      return ok(store.upsertMonthlyLog(body.month as string, body as Partial<MonthlyLog>), 201)
    }

    // PATCH /api/monthly-log/:month
    const logMatch = url.match(/^\/api\/monthly-log\/(.+)$/)
    if (method === 'patch' && logMatch) {
      return ok(store.upsertMonthlyLog(logMatch[1], body as Partial<MonthlyLog>))
    }

    // /health
    if (url === '/health') return ok({ status: 'ok (demo)' })

    throw fakeError(`[demo] unhandled: ${method.toUpperCase()} ${url}`, 404)
  }
}
