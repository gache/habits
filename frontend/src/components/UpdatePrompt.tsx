import { useRegisterSW } from 'virtual:pwa-register/react'
import { ArrowClockwise } from '@phosphor-icons/react'

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast-in fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-cream-800 dark:bg-cream-700 text-cream-50 rounded-full pl-4 pr-1.5 py-1.5 shadow-lg text-base font-sans"
    >
      <span>Nueva versión disponible</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="flex items-center gap-1 text-terracotta-300 hover:text-terracotta-200 font-bold px-3 h-9 rounded-full hover:bg-cream-700 dark:hover:bg-cream-600 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <ArrowClockwise size={14} weight="bold" aria-hidden="true" />
        Actualizar
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Cerrar aviso de actualización"
        className="text-cream-300 hover:text-cream-100 text-lg leading-none w-9 h-9 rounded-full hover:bg-cream-700 dark:hover:bg-cream-600 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        ×
      </button>
    </div>
  )
}
