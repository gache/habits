import { useCallback, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

const TOGGLE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Revisa tu conexión.'

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
  // A failed toggle (e.g. offline) used to roll back silently — the
  // checkbox flashed on then reverted with no indication anything went
  // wrong. This surfaces a message the caller can show in a toast.
  const [toggleError, setToggleError] = useState<string | null>(null)

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
      setToggleError(TOGGLE_ERROR_MESSAGE)
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
      setToggleError(TOGGLE_ERROR_MESSAGE)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['completions', month] }),
  })

  // Stable across renders (mutate identities are stable per React Query) —
  // passed straight down through HabitGrid/HabitRow/DayCell, where a fresh
  // function every render would defeat React.memo on every row and cell.
  const toggle = useCallback((habitId: string, date: string, isCompleted: boolean) => {
    if (isCompleted) {
      unmarkMutation.mutate({ habitId, date })
    } else {
      markMutation.mutate({ habitId, date })
    }
    // Depending on the full mutation objects (rather than their stable
    // .mutate) would recreate `toggle` every render, defeating its purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markMutation.mutate, unmarkMutation.mutate])

  const dismissToggleError = useCallback(() => setToggleError(null), [])

  return { toggle, toggleError, dismissToggleError }
}
