import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { type StreakLevel } from '@/lib/streak-levels'

interface StreakCelebrationProps {
  habitName: string
  level: StreakLevel
  streak: number
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 3500

export default function StreakCelebration({ habitName, level, streak, onDismiss }: StreakCelebrationProps) {
  const [entered, setEntered] = useState(false)
  const Icon = level.icon

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
          'bg-cream-50 dark:bg-cream-800 rounded-2xl border border-cream-300 dark:border-cream-600 shadow-lg w-full max-w-xs p-6 flex flex-col items-center text-center',
          'transition-all motion-reduce:transition-none duration-300 ease-out',
          entered ? 'opacity-100 scale-100' : 'opacity-0 scale-75',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: `${level.color}22` }}
        >
          <Icon size={36} weight="fill" color={level.color} aria-hidden="true" />
        </div>
        <p className="font-sans font-extrabold text-lg text-cream-800 dark:text-cream-100">
          ¡{streak} días seguidos!
        </p>
        <p className="font-handwritten text-cream-600 dark:text-cream-300 text-base mt-1">
          {level.label} — {habitName}
        </p>
        <button
          onClick={onDismiss}
          className="mt-4 px-4 py-1.5 rounded-full bg-terracotta-600 text-cream-50 text-sm font-bold hover:bg-terracotta-700 transition-colors focus:outline-none focus:ring-2 focus:ring-terracotta-400 focus:ring-offset-1"
        >
          ¡Genial!
        </button>
      </div>
    </div>,
    document.body,
  )
}
