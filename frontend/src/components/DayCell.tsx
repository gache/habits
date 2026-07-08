import { Check } from '@phosphor-icons/react'

interface DayCellProps {
  completed: boolean
  color: string
  isToday: boolean
  disabled?: boolean // future date, weekend on a weekly habit, or period already fulfilled
  disabledReason?: 'future' | 'period-locked' | 'weekend'
  dateLabel: string  // e.g. "2025-06-15" — for aria-label
  /** Hidden below the `sm` breakpoint — used to show only the current week on narrow screens. */
  hiddenOnMobile?: boolean
  onClick: () => void
}

const DISABLED_TITLE = {
  future: 'No se puede completar una fecha futura',
  'period-locked': 'Este hábito ya tiene un check en este período',
  weekend: 'Este hábito solo se puede marcar de lunes a viernes',
}

export default function DayCell({ completed, color, isToday, disabled, disabledReason = 'future', dateLabel, hiddenOnMobile, onClick }: DayCellProps) {
  return (
    <td className={['p-0 text-center align-middle', hiddenOnMobile ? 'hidden sm:table-cell' : ''].join(' ').trim()}>
      {/* Button is a larger tap target than the visual swatch inside it, so
          the grid stays visually compact. Desktop (`sm`+) shows all ~31 days
          of the month in one row, where 1px gaps make a full 44px WCAG 2.5.5
          target impossible without collapsing into neighboring cells — 32px
          is the practical ceiling there. Mobile only ever shows 5 days at a
          time (see dayChunks), which leaves room for a proper 40px target. */}
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={`${dateLabel}, ${completed ? 'completado' : 'no completado'}${disabled ? `, ${DISABLED_TITLE[disabledReason]}` : ''}`}
        title={disabled ? DISABLED_TITLE[disabledReason] : completed ? 'Marcar como no hecho' : 'Marcar como hecho'}
        className={[
          'w-10 h-10 sm:w-[30px] sm:h-[30px] mx-auto flex items-center justify-center transition-all',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-90',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-600 focus-visible:ring-offset-1',
        ].join(' ')}
      >
        <span
          className={[
            'w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center shadow-sm',
            disabled ? '' : 'hover:scale-110',
            completed ? 'day-pop shadow-md' : '',
            isToday && !completed ? 'ring-2 ring-cream-500 ring-offset-1' : '',
            isToday && completed  ? 'ring-2 ring-offset-1' : '',
          ].join(' ')}
          style={{
            backgroundColor: completed ? color : 'transparent',
            // #a08860 (cream-500) clears the 3:1 non-text contrast minimum
            // against both the light and dark card backgrounds; the previous
            // '#d4c4a8' (cream-300) default sat at ~1.6:1.
            borderColor: completed ? color : '#a08860',
          }}
        >
          {completed && <Check size={14} weight="bold" color="#3d3020" aria-hidden="true" />}
          {/* Period-locked (already fulfilled elsewhere this week/month) reads
              as "done, just not here" — a soft dot in the habit's own color —
              rather than the fully blank look of a future date. */}
          {!completed && disabled && disabledReason === 'period-locked' && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color, opacity: 0.55 }}
              aria-hidden="true"
            />
          )}
        </span>
      </button>
    </td>
  )
}
