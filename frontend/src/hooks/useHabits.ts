import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Habit {
  id: string
  name: string
  description: string | null
  frequency: 'daily' | 'weekly' | 'monthly'
  active: boolean
  icon: string
  color: string
  order: number
  created_at: string | null
  updated_at: string | null
}

export interface HabitCreate {
  name: string
  description?: string
  frequency?: 'daily' | 'weekly' | 'monthly'
  active?: boolean
  icon?: string
  color?: string
  order?: number
}

export interface HabitUpdate extends Partial<HabitCreate> {}

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

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/api/habits/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}
