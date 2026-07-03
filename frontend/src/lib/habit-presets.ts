export interface HabitPreset {
  icon: string
  name: string
  description?: string
  color: string
}

/** Quick-pick suggestions shown when creating a new habit — each with a color that fits the habit. */
export const HABIT_PRESETS: HabitPreset[] = [
  { icon: '💧', name: 'Drink Water', description: '8 glasses', color: '#a8c8e8' },
  { icon: '🏃', name: 'Exercise', description: '30 min', color: '#f0c8a0' },
  { icon: '🧘', name: 'Meditate', description: '10 min', color: '#d4a8d4' },
  { icon: '📚', name: 'Read', description: '20 pages', color: '#b8d8a8' },
  { icon: '🗣️', name: 'Aprender Ingles', description: '30 min', color: '#f0e0a0' },
  { icon: '😴', name: 'Sleep Early', color: '#c8d8f0' },
  { icon: '✍️', name: 'Journal', color: '#e8c8a8' },
  { icon: '🥗', name: 'Eat Healthy', color: '#b8e0b8' },
  { icon: '💰', name: 'Save Money', color: '#f8e0a0' },
  { icon: '🚭', name: 'Quit Smoking', color: '#f0b8b8' },
  { icon: '📵', name: 'Less Screen Time', color: '#c8e0f0' },
  { icon: '🎨', name: 'Draw', color: '#f0b8c8' },
  { icon: '🎸', name: 'Practice Music', color: '#c8e8d8' },
  { icon: '☕', name: 'Less Coffee', color: '#e8c8f0' },
  { icon: '🚶', name: 'Walk 10K Steps', color: '#d8f0b8' },
  { icon: '🧹', name: 'Clean Room', color: '#a8d8ea' },
  { icon: '🦷', name: 'Floss Teeth', color: '#c8e0f0' },
]

/** Emoji options offered in the icon picker, grouped loosely by theme. */
export const EMOJI_OPTIONS: string[] = [
  '💧', '🏃', '🧘', '📚', '😴', '✍️', '🥗', '💰',
  '🚭', '📵', '🎨', '🎸', '☕', '🚶', '🧹', '🦷',
  '🏋️', '🚴', '🏊', '🎯', '🌱', '🔥', '⏰', '📖',
  '🧠', '❤️', '🙏', '🌞', '🛌', '🍎', '🪥', '⭐',
]
