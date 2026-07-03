import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cream-800/30 backdrop-blur-sm px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={onCancel}
    >
      <div
        className="bg-cream-50 dark:bg-cream-800 rounded-xl border border-cream-300 dark:border-cream-600 shadow-lg w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-sans font-bold text-base text-cream-800 dark:text-cream-100 mb-2">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="font-sans text-sm text-cream-600 dark:text-cream-300 mb-5">
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-sm font-bold text-cream-600 dark:text-cream-300 hover:bg-cream-200 dark:hover:bg-cream-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={[
              'px-3 py-1.5 rounded text-sm font-bold text-cream-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
              danger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-cream-800 hover:bg-cream-700 focus:ring-cream-400',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
