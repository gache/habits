import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCreateHabit, useUpdateHabit, type Habit, type HabitCreate } from '@/hooks/useHabits'
import { HABIT_PRESETS, EMOJI_OPTIONS } from '@/lib/habit-presets'

interface AddHabitModalProps {
  onClose: () => void
  editing?: Habit | null
}

const PRESET_COLORS = [
  '#a8d8ea', '#b8e0b8', '#d4a8d4', '#f0c8a0', '#f0e0a0',
  '#a8c8e8', '#b8d8a8', '#e8c8a8', '#f8e0a0', '#f0b8b8',
  '#c8d8f0', '#f0b8c8', '#c8e8d8', '#d8f0b8', '#e8c8f0', '#c8e0f0',
]

const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const

export default function AddHabitModal({ onClose, editing }: AddHabitModalProps) {
  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState<HabitCreate>({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    frequency: editing?.frequency ?? 'daily',
    icon: editing?.icon ?? '⭐',
    color: editing?.color ?? '#a8d8ea',
    order: editing?.order ?? 0,
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
    } else {
      await createHabit.mutateAsync(form)
    }
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cream-800/30 backdrop-blur-sm px-4">
      <div className="bg-cream-50 rounded-xl border border-cream-300 shadow-lg w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-cream-500 hover:text-cream-800 text-xl focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 rounded"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="font-handwritten text-xl text-cream-700 mb-4">
          {editing ? 'Edit Habit' : 'Add New Habit'}
        </h2>

        {!editing && (
          <div className="mb-4">
            <label className="block text-xs text-cream-600 mb-1.5">Quick add</label>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1 rounded-full border border-cream-300 bg-cream-100 hover:bg-cream-200 px-2.5 py-1 text-xs text-cream-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
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
              <label className="block text-xs text-cream-600 mb-1">Icon</label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                aria-haspopup="true"
                aria-expanded={showEmojiPicker}
                aria-label={`Habit icon, currently ${form.icon}. Open emoji picker`}
                className="w-12 h-9 border border-cream-300 rounded text-center text-lg bg-cream-100 hover:bg-cream-200 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
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
                      aria-label={`Use ${emoji} icon`}
                      className={[
                        'w-7 h-7 flex items-center justify-center rounded text-base hover:bg-cream-200 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400',
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
              <label className="block text-xs text-cream-600 mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. DRINK WATER"
                className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-cream-100 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-cream-600 mb-1">Description</label>
            <input
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. 8 glasses"
              className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-cream-100 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400"
            />
          </div>

          <div>
            <label className="block text-xs text-cream-600 mb-1">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => set('frequency', e.target.value)}
              className="w-full border border-cream-300 rounded px-2 py-1.5 text-sm bg-cream-100 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1 focus:border-cream-400"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-cream-600 mb-1">Color</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => set('color', c)}
                  aria-label={`Select color ${c}`}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? '#3d3020' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={createHabit.isPending || updateHabit.isPending}
            className="mt-2 bg-cream-800 text-cream-50 rounded px-4 py-2 text-sm font-bold hover:bg-cream-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-cream-400 focus:ring-offset-1"
          >
            {editing ? 'Save Changes' : 'Add Habit'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
