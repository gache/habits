import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Habit {
  id: string
  name: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'monthly' | 'weekend'
  active: boolean
  icon: string
  color: string
  order: number
  created_at: string | null
  updated_at: string | null
  excluded_months?: string[]
}

export interface HabitCreate {
  name: string
  description?: string
  frequency?: 'daily' | 'weekly' | 'monthly' | 'weekend'
  active?: boolean
  icon?: string
  color?: string
  order?: number
}

export type HabitUpdate = Partial<HabitCreate>

export function useHabits(active?: boolean) {
  return useQuery<Habit[]>({
    queryKey: ['habits', { active }],
    queryFn: async () => {
      const params = active !== undefined ? { active } : {}
      const { data } = await api.get('/api/habits', { params })
      return data
    },
  })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation<Habit, Error, HabitCreate>({
    mutationFn: async (body) => {
      const { data } = await api.post('/api/habits', body)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation<Habit, Error, { id: string; updates: HabitUpdate }>({
    mutationFn: async ({ id, updates }) => {
      const { data } = await api.patch(`/api/habits/${id}`, updates)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useReorderHabits() {
  const qc = useQueryClient()
  return useMutation<void, Error, Habit[]>({
    mutationFn: async (orderedHabits) => {
      const changed = orderedHabits
        .map((habit, index) => ({ habit, order: index + 1 }))
        .filter(({ habit, order }) => habit.order !== order)
      await Promise.all(
        changed.map(({ habit, order }) => api.patch(`/api/habits/${habit.id}`, { order })),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
    onError: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

// Cache invalidation deliberately isn't wired into onSuccess here: the
// caller (HabitRow) keeps rendering the deleted habit's row as an undo
// toast until the undo window closes, and invalidating `habits` right away
// would drop it from the parent's filtered list and unmount that toast
// early, losing the undo option. HabitRow invalidates once the window
// actually closes (or useRestoreHabit's onSuccess does, on undo).
export function useDeleteHabit() {
  return useMutation<void, Error, { id: string; month: string }>({
    mutationFn: async ({ id, month }) => {
      await api.delete(`/api/habits/${id}`, { params: { month } })
    },
  })
}

export function useRestoreHabit() {
  const qc = useQueryClient()
  return useMutation<void, Error, { id: string; month: string; dates: string[] }>({
    mutationFn: async ({ id, month, dates }) => {
      await api.post(`/api/habits/${id}/restore`, { month, dates })
    },
    onSuccess: (_data, { month }) => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      qc.invalidateQueries({ queryKey: ['completions', month] })
    },
  })
}
