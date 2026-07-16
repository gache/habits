import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { WarningCircle, Question } from '@phosphor-icons/react'

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
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="fixed inset-0 bg-cream-800/30 backdrop-blur-sm cursor-default"
        aria-label="Cerrar"
        onClick={onCancel}
      />
      <div
        className="dialog-in relative bg-cream-50 dark:bg-cream-800 rounded-2xl border border-cream-300 dark:border-cream-600 shadow-soft w-full max-w-sm p-6 text-center"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div
          className={[
            'mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center',
            danger ? 'bg-red-100 dark:bg-red-950/40' : 'bg-terracotta-100 dark:bg-terracotta-900/40',
          ].join(' ')}
          aria-hidden="true"
        >
          {danger
            ? <WarningCircle size={26} weight="fill" className="text-red-600 dark:text-red-400" />
            : <Question size={26} weight="fill" className="text-terracotta-600 dark:text-terracotta-400" />}
        </div>
        <h2 id="confirm-dialog-title" className="font-sans font-extrabold text-xl text-cream-800 dark:text-cream-100 mb-1.5">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="font-sans text-base text-cream-600 dark:text-cream-300 leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex justify-center gap-2">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-full text-base font-bold text-cream-600 dark:text-cream-300 border border-cream-300 dark:border-cream-600 hover:bg-cream-200 dark:hover:bg-cream-700 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={[
              'px-5 py-2 rounded-full text-base font-bold text-cream-50 shadow-xs transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1',
              danger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-terracotta-600 hover:bg-terracotta-700 focus:ring-terracotta-400',
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
