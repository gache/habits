import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { type StreakLevel, periodUnitLabel, getNextStreakLevel } from '@/lib/streak-levels'
import type { Frequency } from '@/lib/date-utils'

interface StreakCelebrationProps {
  habitName: string
  level: StreakLevel
  streak: number
  frequency: Frequency
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 6000

export default function StreakCelebration({ habitName, level, streak, frequency, onDismiss }: StreakCelebrationProps) {
  const [entered, setEntered] = useState(false)
  const Icon = level.icon
  const nextLevel = getNextStreakLevel(streak, frequency)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onEscape)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      document.removeEventListener('keydown', onEscape)
    }
  }, [onDismiss])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cream-800/30 backdrop-blur-sm px-4"
      role="status"
      aria-live="polite"
      onClick={onDismiss}
    >
      <div
        className={[
          'bg-cream-50 dark:bg-cream-800 rounded-3xl border border-cream-300 dark:border-cream-600 shadow-lg w-full max-w-sm sm:max-w-md p-8 sm:p-10 flex flex-col items-center text-center',
          'transition-all motion-reduce:transition-none duration-300 ease-out',
          entered ? 'opacity-100 scale-100' : 'opacity-0 scale-75',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${level.color}22` }}
        >
          <Icon size={56} weight="fill" color={level.color} aria-hidden="true" />
        </div>
        <p className="font-sans font-extrabold text-3xl sm:text-4xl text-cream-800 dark:text-cream-100">
          ¡{streak} {periodUnitLabel(frequency, streak)} seguidos!
        </p>
        <p className="font-handwritten text-cream-500 dark:text-cream-400 text-xl mt-1">
          {level.label} — {habitName}
        </p>
        <p className="font-sans text-cream-700 dark:text-cream-300 text-lg mt-4 leading-relaxed">
          {level.message}
        </p>
        {nextLevel ? (
          <div className="w-full mt-5">
            <div className="flex items-center justify-between text-sm text-cream-600 dark:text-cream-400 mb-1">
              <span>Próxima meta: {nextLevel.label}</span>
              <span className="font-sans font-bold tabular-nums">
                {streak}/{nextLevel.periods} {periodUnitLabel(frequency, nextLevel.periods)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-cream-200 dark:bg-cream-700 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (streak / nextLevel.periods) * 100)}%`, backgroundColor: nextLevel.color }}
              />
            </div>
          </div>
        ) : (
          <p className="w-full mt-5 font-sans font-bold text-sm" style={{ color: level.color }}>
            ¡Nivel máximo alcanzado! No hay meta más alta que esta.
          </p>
        )}
        <button
          onClick={onDismiss}
          className="mt-6 px-6 h-11 rounded-full bg-terracotta-600 text-cream-50 text-base font-bold hover:bg-terracotta-700 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-terracotta-400 focus:ring-offset-1"
        >
          ¡Genial!
        </button>
      </div>
    </div>,
    document.body,
  )
}
