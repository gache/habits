import { useRef } from 'react'
import { useMonthlyLog, useUpdateMonthlyLog, type MonthlyLog as MonthlyLogData } from '@/hooks/useMonthlyLog'

type ReflectionField = Exclude<keyof MonthlyLogData, 'month'>

interface MonthlyLogProps {
  month: string // "YYYY-MM"
}

export default function MonthlyLog({ month }: MonthlyLogProps) {
  const { data: log } = useMonthlyLog(month)
  const { mutate: update } = useUpdateMonthlyLog(month)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const debounce = (field: ReflectionField, value: string) => {
    if (timers.current[field]) clearTimeout(timers.current[field])
    timers.current[field] = setTimeout(() => update({ [field]: value }), 800)
  }

  return (
    <div className="mt-6 border-t border-cream-300 dark:border-cream-600 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Notes */}
      <div>
        <h3 className="font-handwritten text-cream-600 dark:text-cream-400 text-lg mb-2 tracking-wide">NOTAS</h3>
        <textarea
          defaultValue={log?.notes ?? ''}
          key={`notes-${month}`}
          onChange={(e) => debounce('notes', e.target.value)}
          rows={6}
          placeholder="Notas libres del mes..."
          className="w-full resize-none rounded border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-700 px-3 py-2 text-base text-cream-800 dark:text-cream-100 placeholder-cream-400 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400 font-sans"
        />
      </div>

      {/* Reflections */}
      <div className="flex flex-col gap-3">
        <h3 className="font-handwritten text-cream-600 dark:text-cream-400 text-lg tracking-wide">REFLEXIÓN MENSUAL</h3>
        {(
          [
            { field: 'reflection_well',    label: '¿Qué salió bien este mes?' },
            { field: 'reflection_improve', label: '¿Qué puedo mejorar?' },
            { field: 'reflection_proud',   label: 'Estoy orgulloso/a de mí por...' },
          ] as const
        ).map(({ field, label }) => (
          <div key={field}>
            <label className="block text-sm text-cream-600 dark:text-cream-400 mb-1 font-sans">{label}</label>
            <textarea
              defaultValue={log?.[field] ?? ''}
              key={`${field}-${month}`}
              onChange={(e) => debounce(field, e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-700 px-3 py-2 text-base text-cream-800 dark:text-cream-100 placeholder-cream-400 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400 font-sans"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
