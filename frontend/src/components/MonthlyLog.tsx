import { useRef } from 'react'
import { useMonthlyLog, useUpdateMonthlyLog } from '@/hooks/useMonthlyLog'

interface MonthlyLogProps {
  month: string // "YYYY-MM"
}

export default function MonthlyLog({ month }: MonthlyLogProps) {
  const { data: log } = useMonthlyLog(month)
  const { mutate: update } = useUpdateMonthlyLog(month)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debounce = (field: string, value: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => update({ [field]: value }), 800)
  }

  return (
    <div className="mt-6 border-t border-cream-300 dark:border-cream-600 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Notes */}
      <div>
        <h3 className="font-handwritten text-cream-600 dark:text-cream-400 text-base mb-2 tracking-wide">NOTES</h3>
        <textarea
          defaultValue={log?.notes ?? ''}
          key={`notes-${month}`}
          onChange={(e) => debounce('notes', e.target.value)}
          rows={6}
          placeholder="Free notes for the month..."
          className="w-full resize-none rounded border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-700 px-3 py-2 text-sm text-cream-800 dark:text-cream-100 placeholder-cream-400 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400 font-sans"
        />
      </div>

      {/* Reflections */}
      <div className="flex flex-col gap-3">
        <h3 className="font-handwritten text-cream-600 dark:text-cream-400 text-base tracking-wide">MONTHLY REFLECTION</h3>
        {[
          { field: 'reflection_well',    label: 'What went well this month?' },
          { field: 'reflection_improve', label: 'What can I improve?' },
          { field: 'reflection_proud',   label: 'I am proud of myself for...' },
        ].map(({ field, label }) => (
          <div key={field}>
            <label className="block text-xs text-cream-600 dark:text-cream-400 mb-1 font-sans">{label}</label>
            <textarea
              defaultValue={(log as any)?.[field] ?? ''}
              key={`${field}-${month}`}
              onChange={(e) => debounce(field, e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-700 px-3 py-2 text-sm text-cream-800 dark:text-cream-100 placeholder-cream-400 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400 font-sans"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
