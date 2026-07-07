import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Completion {
  id: string
  habit_id: string
  date: string
  created_at: string | null
}

function completionsQueryOptions(month: string) {
  return {
    queryKey: ['completions', month],
    queryFn: async () => {
      const { data } = await api.get('/api/completions', { params: { month } })
      return data as Completion[]
    },
  }
}

export function useCompletions(month: string) {
  return useQuery<Completion[]>(completionsQueryOptions(month))
}

/** Fetches completions for several months at once, sharing cache with useCompletions. */
export function useCompletionsForMonths(months: string[]) {
  const results = useQueries({ queries: months.map((m) => completionsQueryOptions(m)) })
  const isLoading = results.some((r) => r.isLoading)
  const all = results.flatMap((r) => r.data ?? [])
  return { data: all, isLoading }
}

export function useToggleCompletion(month: string) {
  const qc = useQueryClient()

  const markMutation = useMutation<Completion, Error, { habitId: string; date: string }, { prev: Completion[] }>({
    mutationFn: async ({ habitId, date }) => {
      const { data } = await api.post(`/api/habits/${habitId}/complete`, { date })
      return data
    },
    onMutate: async ({ habitId, date }) => {
      await qc.cancelQueries({ queryKey: ['completions', month] })
      const prev = qc.getQueryData<Completion[]>(['completions', month]) ?? []
      const optimistic: Completion = { id: `opt-${habitId}-${date}`, habit_id: habitId, date, created_at: null }
      qc.setQueryData<Completion[]>(['completions', month], [...prev, optimistic])
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['completions', month], ctx?.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['completions', month] }),
  })

  const unmarkMutation = useMutation<void, Error, { habitId: string; date: string }, { prev: Completion[] }>({
    mutationFn: async ({ habitId, date }) => {
      await api.delete(`/api/habits/${habitId}/complete`, { params: { date } })
    },
    onMutate: async ({ habitId, date }) => {
      await qc.cancelQueries({ queryKey: ['completions', month] })
      const prev = qc.getQueryData<Completion[]>(['completions', month]) ?? []
      qc.setQueryData<Completion[]>(
        ['completions', month],
        prev.filter((c) => !(c.habit_id === habitId && c.date === date)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['completions', month], ctx?.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['completions', month] }),
  })

  const toggle = (habitId: string, date: string, isCompleted: boolean) => {
    if (isCompleted) {
      unmarkMutation.mutate({ habitId, date })
    } else {
      markMutation.mutate({ habitId, date })
    }
  }

  return { toggle }
}
