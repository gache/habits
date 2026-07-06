interface DayCellProps {
  completed: boolean
  color: string
  isToday: boolean
  disabled?: boolean // future date with nothing to undo — can't be marked complete
  dateLabel: string  // e.g. "2025-06-15" — for aria-label
  onClick: () => void
}

export default function DayCell({ completed, color, isToday, disabled, dateLabel, onClick }: DayCellProps) {
  return (
    <td className="p-0 text-center align-middle">
      {/* Button is a larger tap target (32px, WCAG 2.5.8 AA) than the visual
          swatch inside it (20px), so the dense month grid stays compact. */}
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={`${dateLabel}, ${completed ? 'completado' : 'no completado'}${disabled ? ', fecha futura' : ''}`}
        title={disabled ? 'No se puede completar una fecha futura' : completed ? 'Marcar como no hecho' : 'Marcar como hecho'}
        className={[
          'w-7 h-7 mx-auto flex items-center justify-center transition-all',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-600 focus-visible:ring-offset-1',
        ].join(' ')}
      >
        <span
          className={[
            'w-5 h-5 rounded-sm border transition-all',
            disabled ? '' : 'hover:scale-110',
            completed ? 'day-pop' : '',
            isToday && !completed ? 'ring-2 ring-cream-500 ring-offset-1' : '',
            isToday && completed  ? 'ring-2 ring-offset-1' : '',
          ].join(' ')}
          style={{
            backgroundColor: completed ? color : 'transparent',
            borderColor: completed ? color : isToday ? '#a08860' : '#d4c4a8',
          }}
        />
      </button>
    </td>
  )
}
