import type { Icon } from '@phosphor-icons/react'
import { Flame, Star, Medal, Trophy, Diamond, Crown } from '@phosphor-icons/react'

export interface StreakLevel {
  days: number
  label: string
  icon: Icon
  color: string
}

/** Streak milestones, lowest to highest. */
export const STREAK_LEVELS: StreakLevel[] = [
  { days: 3, label: 'En racha', icon: Flame, color: '#f97316' },
  { days: 7, label: 'Una semana fuerte', icon: Star, color: '#eab308' },
  { days: 14, label: 'Dos semanas seguidas', icon: Medal, color: '#a08860' },
  { days: 30, label: 'Un mes de racha', icon: Trophy, color: '#d97706' },
  { days: 60, label: 'Dos meses fuertes', icon: Diamond, color: '#0ea5e9' },
  { days: 100, label: 'Racha centenaria', icon: Crown, color: '#a855f7' },
]

/** Highest level reached for a given streak, or null if below the first tier. */
export function getStreakLevel(streak: number): StreakLevel | null {
  let current: StreakLevel | null = null
  for (const level of STREAK_LEVELS) {
    if (streak >= level.days) current = level
  }
  return current
}
