/**
 * Demo-mode API adapter.
 * Replaces axios's HTTP adapter so every request is handled in-memory.
 */

import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import * as store from './demo-store'

function ok<T>(data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: {}, config: {} as InternalAxiosRequestConfig }
}

function notFound(): never {
  const err: any = new Error('Not found')
  err.response = { status: 404, data: {} }
  throw err
}

export function installDemoAdapter(api: AxiosInstance) {
  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const method = (config.method ?? 'get').toLowerCase()
    const url = config.url ?? ''

    let body: any = {}
    if (config.data) {
      try { body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data } catch { /* ignore */ }
    }

    // GET /api/habits
    if (method === 'get' && url === '/api/habits') {
      return ok(store.listHabits(config.params?.active))
    }

    // POST /api/habits
    if (method === 'post' && url === '/api/habits') {
      return ok(store.createHabit(body), 201)
    }

    // POST /api/habits/:id/complete
    const completeMatch = url.match(/^\/api\/habits\/([^/]+)\/complete$/)
    if (completeMatch) {
      if (method === 'post') {
        return ok(store.markComplete(completeMatch[1], body.date), 201)
      }
      if (method === 'delete') {
        store.unmarkComplete(completeMatch[1], config.params?.date)
        return ok(null, 204)
      }
    }

    // PATCH /api/habits/:id   or   DELETE /api/habits/:id
    const habitMatch = url.match(/^\/api\/habits\/([^/]+)$/)
    if (habitMatch) {
      if (method === 'patch') return ok(store.updateHabit(habitMatch[1], body))
      if (method === 'delete') { store.deleteHabit(habitMatch[1]); return ok(null, 204) }
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
      return ok(store.upsertMonthlyLog(body.month, body), 201)
    }

    // PATCH /api/monthly-log/:month
    const logMatch = url.match(/^\/api\/monthly-log\/(.+)$/)
    if (method === 'patch' && logMatch) {
      return ok(store.upsertMonthlyLog(logMatch[1], body))
    }

    // /health
    if (url === '/health') return ok({ status: 'ok (demo)' })

    const err: any = new Error(`[demo] unhandled: ${method.toUpperCase()} ${url}`)
    err.response = { status: 404, data: {} }
    throw err
  }
}
