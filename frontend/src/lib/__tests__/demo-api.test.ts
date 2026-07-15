import { describe, it, expect, beforeEach } from 'vitest'
import axios, { type AxiosInstance } from 'axios'
import { installDemoAdapter } from '../demo-api'

function demoApi(): AxiosInstance {
  const instance = axios.create()
  installDemoAdapter(instance)
  return instance
}

describe('demo-api adapter', () => {
  let api: AxiosInstance

  beforeEach(() => {
    localStorage.clear()
    api = demoApi()
  })

  it('GET /api/habits returns the seeded habits', async () => {
    const res = await api.get('/api/habits')
    expect(res.status).toBe(200)
    expect(res.data.length).toBeGreaterThan(0)
  })

  it('POST /api/habits creates and persists a habit', async () => {
    const res = await api.post('/api/habits', { name: 'Nadar' })
    expect(res.status).toBe(201)
    expect(res.data.name).toBe('Nadar')

    const list = await api.get('/api/habits')
    expect(list.data.find((h: { id: string }) => h.id === res.data.id)).toBeDefined()
  })

  it('PATCH /api/habits/:id updates the habit', async () => {
    const created = await api.post('/api/habits', { name: 'Nadar' })

    const res = await api.patch(`/api/habits/${created.data.id}`, { name: 'Nadar rápido' })

    expect(res.data.name).toBe('Nadar rápido')
  })

  it('POST /api/habits/:id/complete marks a completion', async () => {
    const created = await api.post('/api/habits', { name: 'Nadar' })

    const res = await api.post(`/api/habits/${created.data.id}/complete`, { date: '2026-07-10' })

    expect(res.status).toBe(201)
    const completions = await api.get('/api/completions', { params: { month: '2026-07' } })
    expect(completions.data.find((c: { habit_id: string; date: string }) =>
      c.habit_id === created.data.id && c.date === '2026-07-10',
    )).toBeDefined()
  })

  it('DELETE /api/habits/:id/complete unmarks a completion', async () => {
    const created = await api.post('/api/habits', { name: 'Nadar' })
    await api.post(`/api/habits/${created.data.id}/complete`, { date: '2026-07-10' })

    await api.delete(`/api/habits/${created.data.id}/complete`, { params: { date: '2026-07-10' } })

    const completions = await api.get('/api/completions', { params: { month: '2026-07' } })
    expect(completions.data.find((c: { habit_id: string; date: string }) =>
      c.habit_id === created.data.id && c.date === '2026-07-10',
    )).toBeUndefined()
  })

  it('DELETE /api/habits/:id excludes the month instead of deleting the habit', async () => {
    const created = await api.post('/api/habits', { name: 'Nadar' })
    await api.post(`/api/habits/${created.data.id}/complete`, { date: '2026-07-10' })

    await api.delete(`/api/habits/${created.data.id}`, { params: { month: '2026-07' } })

    const list = await api.get('/api/habits')
    const habit = list.data.find((h: { id: string }) => h.id === created.data.id)
    expect(habit).toBeDefined()
    expect(habit.excluded_months).toEqual(['2026-07'])
    const completions = await api.get('/api/completions', { params: { month: '2026-07' } })
    expect(completions.data.find((c: { habit_id: string }) => c.habit_id === created.data.id)).toBeUndefined()
  })

  it('POST /api/habits/:id/restore un-excludes the month and restores completions', async () => {
    const created = await api.post('/api/habits', { name: 'Nadar' })
    await api.post(`/api/habits/${created.data.id}/complete`, { date: '2026-07-10' })
    await api.delete(`/api/habits/${created.data.id}`, { params: { month: '2026-07' } })

    await api.post(`/api/habits/${created.data.id}/restore`, { month: '2026-07', dates: ['2026-07-10'] })

    const list = await api.get('/api/habits')
    const habit = list.data.find((h: { id: string }) => h.id === created.data.id)
    expect(habit.excluded_months).toEqual([])
    const completions = await api.get('/api/completions', { params: { month: '2026-07' } })
    expect(completions.data.find((c: { habit_id: string; date: string }) =>
      c.habit_id === created.data.id && c.date === '2026-07-10',
    )).toBeDefined()
  })

  it('GET /api/monthly-log 404s when no log exists for the month', async () => {
    await expect(api.get('/api/monthly-log', { params: { month: '2026-07' } }))
      .rejects.toMatchObject({ response: { status: 404 } })
  })

  it('POST /api/monthly-log creates a log', async () => {
    const res = await api.post('/api/monthly-log', { month: '2026-07', goal: 'Leer más' })

    expect(res.status).toBe(201)
    expect(res.data.goal).toBe('Leer más')
  })

  it('PATCH /api/monthly-log/:month upserts the log', async () => {
    const res = await api.patch('/api/monthly-log/2026-07', { goal: 'Leer más' })

    expect(res.data).toMatchObject({ month: '2026-07', goal: 'Leer más' })
  })

  it('GET /health reports demo status', async () => {
    const res = await api.get('/health')
    expect(res.data).toEqual({ status: 'ok (demo)' })
  })

  it('rejects unhandled routes with a 404-shaped error', async () => {
    await expect(api.get('/api/unknown')).rejects.toMatchObject({ response: { status: 404 } })
  })
})
