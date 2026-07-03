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
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={`${dateLabel}, ${completed ? 'completed' : 'not completed'}${disabled ? ', future date' : ''}`}
        title={disabled ? "Can't complete a future date" : completed ? 'Mark incomplete' : 'Mark complete'}
        className={[
          'w-5 h-5 mx-auto block rounded-sm border transition-all',
          disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-600 focus-visible:ring-offset-1',
          completed ? 'day-pop' : '',
          isToday && !completed ? 'ring-2 ring-cream-500 ring-offset-1' : '',
          isToday && completed  ? 'ring-2 ring-offset-1' : '',
        ].join(' ')}
        style={{
          backgroundColor: completed ? color : 'transparent',
          borderColor: completed ? color : isToday ? '#a08860' : '#d4c4a8',
        }}
      />
    </td>
  )
}
