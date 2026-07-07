import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import api from '@/lib/api'

export interface MonthlyLog {
  month: string
  goal: string
  notes: string
  reflection_well: string
  reflection_improve: string
  reflection_proud: string
}

export function useMonthlyLog(month: string) {
  return useQuery<MonthlyLog>({
    queryKey: ['monthly-log', month],
    queryFn: async () => {
      const { data } = await api.get('/api/monthly-log', { params: { month } })
      return data
    },
  })
}

export function useUpdateMonthlyLog(month: string) {
  const qc = useQueryClient()
  return useMutation<MonthlyLog, Error, Partial<MonthlyLog>>({
    mutationFn: async (updates) => {
      try {
        const { data } = await api.patch(`/api/monthly-log/${month}`, updates)
        return data
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          const { data } = await api.post('/api/monthly-log', { month, ...updates })
          return data
        }
        throw err
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(['monthly-log', month], data)
    },
  })
}
