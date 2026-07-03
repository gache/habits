interface MonthNavProps {
  year: number
  month: number // 1-based
  onPrev: () => void
  onNext: () => void
}

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

export default function MonthNav({ year, month, onPrev, onNext }: MonthNavProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onPrev}
        className="w-7 h-7 rounded-full border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-700 dark:text-cream-200 font-bold text-sm flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400"
        aria-label="Previous month"
      >
        ‹
      </button>
      <span className="font-sans font-bold text-sm text-cream-800 dark:text-cream-100 tracking-widest uppercase">
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={onNext}
        className="w-7 h-7 rounded-full border border-cream-300 dark:border-cream-600 bg-cream-50 dark:bg-cream-800 hover:bg-cream-200 dark:hover:bg-cream-700 text-cream-700 dark:text-cream-200 font-bold text-sm flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cream-400"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  )
}
