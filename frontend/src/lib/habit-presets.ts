export interface HabitPreset {
  icon: string
  name: string
  description?: string
  color: string
}

export const FREQUENCY_LABELS: Record<'daily' | 'weekly' | 'monthly', string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  monthly: 'Mensual',
}

/** Eye-catching badge colors per frequency — one glance tells the category apart. */
export const FREQUENCY_BADGE_STYLES: Record<'daily' | 'weekly' | 'monthly', string> = {
  daily: 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300',
  weekly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  monthly: 'bg-terracotta-100 text-terracotta-700 dark:bg-terracotta-900/40 dark:text-terracotta-300',
}

/** Quick-pick suggestions shown when creating a new habit — each with a color that fits the habit. */
export const HABIT_PRESETS: HabitPreset[] = [
  { icon: '💧', name: 'Tomar Agua', description: '8 vasos', color: '#a8c8e8' },
  { icon: '🏃', name: 'Ejercicio', description: '30 min', color: '#f0c8a0' },
  { icon: '🧘', name: 'Meditar', description: '10 min', color: '#d4a8d4' },
  { icon: '📚', name: 'Leer', description: '20 páginas', color: '#b8d8a8' },
  { icon: '🗣️', name: 'Aprender Inglés', description: '30 min', color: '#f0e0a0' },
  { icon: '😴', name: 'Dormir Temprano', color: '#c8d8f0' },
  { icon: '✍️', name: 'Escribir Diario', color: '#e8c8a8' },
  { icon: '🥗', name: 'Comer Sano', color: '#b8e0b8' },
  { icon: '💰', name: 'Ahorrar Dinero', color: '#f8e0a0' },
  { icon: '🚭', name: 'Dejar de Fumar', color: '#f0b8b8' },
  { icon: '📵', name: 'Reducir Pantallas', color: '#c8e0f0' },
  { icon: '🎨', name: 'Dibujar', color: '#f0b8c8' },
  { icon: '🎸', name: 'Practicar Música', color: '#c8e8d8' },
  { icon: '☕', name: 'Tomar Menos Café', color: '#e8c8f0' },
  { icon: '🚶', name: 'Caminar 10K Pasos', color: '#d8f0b8' },
  { icon: '🧹', name: 'Limpiar el Cuarto', color: '#a8d8ea' },
  { icon: '🦷', name: 'Usar Hilo Dental', color: '#c8e0f0' },
]

/** Emoji options offered in the icon picker, grouped loosely by theme. */
export const EMOJI_OPTIONS: string[] = [
  '💧', '🏃', '🧘', '📚', '😴', '✍️', '🥗', '💰',
  '🚭', '📵', '🎨', '🎸', '☕', '🚶', '🧹', '🦷',
  '🏋️', '🚴', '🏊', '🎯', '🌱', '🔥', '⏰', '📖',
  '🧠', '❤️', '🙏', '🌞', '🛌', '🍎', '🪥', '⭐',
]
