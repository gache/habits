import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCreateHabit, useUpdateHabit, type Habit, type HabitCreate } from '@/hooks/useHabits'
import { HABIT_PRESETS, EMOJI_OPTIONS, FREQUENCY_LABELS } from '@/lib/habit-presets'

interface AddHabitModalProps {
  onClose: () => void
  editing?: Habit | null
  /** Called with a confirmation message right before onClose, once the save succeeds. */
  onSaved?: (message: string) => void
}

const PRESET_COLORS = [
  '#a8d8ea', '#b8e0b8', '#d4a8d4', '#f0c8a0', '#f0e0a0',
  '#a8c8e8', '#b8d8a8', '#e8c8a8', '#f8e0a0', '#f0b8b8',
  '#c8d8f0', '#f0b8c8', '#c8e8d8', '#d8f0b8', '#e8c8f0', '#c8e0f0',
]

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const

export default function AddHabitModal({ onClose, editing, onSaved }: AddHabitModalProps) {
  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  useEffect(() => {
    // Emoji picker gets first claim on Escape (closes itself via its own
    // effect below); only close the whole modal when it's not open.
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showEmojiPicker) onClose()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [onClose, showEmojiPicker])

  const [form, setForm] = useState<HabitCreate>({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    frequency: editing?.frequency ?? 'daily',
    icon: editing?.icon ?? '⭐',
    color: editing?.color ?? '#a8d8ea',
    order: editing?.order,
    active: editing?.active ?? true,
  })

  const set = (key: keyof HabitCreate, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const applyPreset = (preset: (typeof HABIT_PRESETS)[number]) => {
    setForm((f) => ({
      ...f,
      icon: preset.icon,
      name: preset.name,
      description: preset.description ?? f.description,
      color: preset.color,
    }))
  }

  useEffect(() => {
    if (!showEmojiPicker) return
    const onClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowEmojiPicker(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [showEmojiPicker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      await updateHabit.mutateAsync({ id: editing.id, updates: form })
      onSaved?.(`"${form.name}" actualizado`)
    } else {
      await createHabit.mutateAsync(form)
      onSaved?.(`"${form.name}" agregado`)
    }
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-800/30 backdrop-blur-sm px-4">
      <div className="dialog-in bg-cream-50 rounded-xl border border-cream-300 shadow-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-cream-500 hover:text-cream-800 text-2xl transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 rounded"
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="font-handwritten text-2xl text-cream-700 mb-4">
          {editing ? 'Editar Hábito' : 'Agregar Nuevo Hábito'}
        </h2>

        {!editing && (
          <div className="mb-4">
            <label className="block text-sm text-cream-700 mb-1.5">Agregar rápido</label>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1 rounded-full border border-cream-300 bg-cream-100 hover:bg-cream-200 px-2.5 py-1 text-sm text-cream-700 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
                >
                  <span aria-hidden="true">{preset.icon}</span>
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative">
              <label className="block text-sm text-cream-700 mb-1">Ícono</label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                aria-haspopup="true"
                aria-expanded={showEmojiPicker}
                aria-label={`Ícono del hábito, actualmente ${form.icon}. Abrir selector de emojis`}
                className="w-12 h-9 border border-cream-300 rounded text-center text-xl bg-cream-100 hover:bg-cream-200 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
              >
                {form.icon}
              </button>

              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  role="menu"
                  className="absolute z-10 top-full mt-1 left-0 bg-cream-50 border border-cream-300 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 w-64"
                >
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      role="menuitem"
                      onClick={() => {
                        set('icon', emoji)
                        setShowEmojiPicker(false)
                      }}
                      aria-label={`Usar ícono ${emoji}`}
                      className={[
                        'w-7 h-7 flex items-center justify-center rounded text-lg hover:bg-cream-200 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400',
                        form.icon === emoji ? 'bg-cream-200' : '',
                      ].join(' ')}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1">
              <label htmlFor="habit-name" className="block text-sm text-cream-700 mb-1">Nombre *</label>
              <input
                id="habit-name"
                ref={nameInputRef}
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="ej. TOMAR AGUA"
                className="w-full border border-cream-300 rounded px-2 py-1.5 text-base bg-cream-100 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400 uppercase"
              />
            </div>
          </div>

          <div>
            <label htmlFor="habit-description" className="block text-sm text-cream-700 mb-1">Descripción</label>
            <input
              id="habit-description"
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="ej. 8 vasos"
              className="w-full border border-cream-300 rounded px-2 py-1.5 text-base bg-cream-100 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400"
            />
          </div>

          <div>
            <label htmlFor="habit-frequency" className="block text-sm text-cream-700 mb-1">Frecuencia</label>
            <select
              id="habit-frequency"
              value={form.frequency}
              onChange={(e) => set('frequency', e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1.5 text-base bg-cream-100 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-cream-700 mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => set('color', c)}
                  aria-label={`Seleccionar color ${c}`}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? '#a84d2c' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={createHabit.isPending || updateHabit.isPending}
            className="mt-2 bg-terracotta-600 text-cream-50 rounded px-4 py-2 text-base font-bold hover:bg-terracotta-700 disabled:opacity-50 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-terracotta-400 focus:ring-offset-1"
          >
            {editing ? 'Guardar Cambios' : 'Agregar Hábito'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
