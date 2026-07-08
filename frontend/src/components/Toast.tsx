import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ToastProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  /** Fires once, after durationMs, if the toast isn't dismissed first. */
  onTimeout: () => void
  durationMs?: number
}

export default function Toast({ message, actionLabel, onAction, onTimeout, durationMs = 5000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onTimeout, durationMs)
    return () => clearTimeout(t)
  // onTimeout is expected to be stable per mount (the caller re-mounts a
  // fresh toast for a new action rather than reusing one instance).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs])

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="toast-in fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-cream-800 dark:bg-cream-700 text-cream-50 rounded-full pl-4 pr-1.5 py-1.5 shadow-lg text-base font-sans"
    >
      <span>{message}</span>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-terracotta-300 hover:text-terracotta-200 font-bold px-3 h-9 rounded-full hover:bg-cream-700 dark:hover:bg-cream-600 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {actionLabel}
        </button>
      )}
    </div>,
    document.body,
  )
}
