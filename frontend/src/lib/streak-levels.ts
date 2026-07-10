import type { Icon } from '@phosphor-icons/react'
import { Flame, Star, Medal, Trophy, Diamond, Crown } from '@phosphor-icons/react'
import type { Frequency } from './date-utils'

export interface StreakLevel {
  /** Number of periods (days/weeks/months, depending on frequency) needed to reach this tier. */
  periods: number
  label: string
  message: string
  icon: Icon
  color: string
}

/**
 * One escalating tier ladder per frequency — same icon/color rhythm across
 * all four, but the period-thresholds and wording are scaled to how much
 * real calendar time (and how many check-ins) that frequency actually
 * demands. Copying daily's day-thresholds onto a weekly habit would make
 * the reward either trivial (reused as weeks: "7 weeks" is a much bigger
 * ask than "7 days") or unreachable (reused as-is: a weekly habit can't
 * even have a 30-day streak, since it's only checked ~4 times a month) —
 * so each frequency gets thresholds that represent the *same* calendar
 * milestones (2 weeks, 1 month, 1 quarter, 6 months, 1 year...) in its own
 * period unit.
 */
export const STREAK_LEVELS: Record<Frequency, StreakLevel[]> = {
  daily: [
    { periods: 3, label: 'En racha', message: 'Los primeros días son los más difíciles — y ya los superaste. ¡Esto recién empieza!', icon: Flame, color: '#f97316' },
    { periods: 7, label: 'Una semana fuerte', message: 'Una semana completa. Ya no es suerte, es un hábito de verdad.', icon: Star, color: '#eab308' },
    { periods: 14, label: 'Dos semanas seguidas', message: 'Dos semanas seguidas. Tu constancia ya es más fuerte que tu excusa favorita.', icon: Medal, color: '#a08860' },
    { periods: 30, label: 'Un mes de racha', message: 'Un mes entero. Esto ya es parte de quién sos.', icon: Trophy, color: '#d97706' },
    { periods: 60, label: 'Dos meses fuertes', message: 'Dos meses de constancia. Pocos llegan hasta acá.', icon: Diamond, color: '#0ea5e9' },
    { periods: 100, label: 'Racha centenaria', message: '100 días. Esto ya no se rompe fácil.', icon: Crown, color: '#a855f7' },
  ],
  weekly: [
    { periods: 2, label: 'En racha', message: 'Dos semanas seguidas cumpliendo tu meta semanal. Vas encaminado.', icon: Flame, color: '#f97316' },
    { periods: 4, label: 'Un mes de constancia', message: 'Cuatro semanas sin fallar — un mes entero de compromiso semanal.', icon: Star, color: '#eab308' },
    { periods: 8, label: 'Dos meses seguidos', message: 'Ocho semanas seguidas. Esto ya es una rutina real.', icon: Medal, color: '#a08860' },
    { periods: 13, label: 'Un trimestre completo', message: 'Trece semanas — un trimestre entero sin faltar una sola.', icon: Trophy, color: '#d97706' },
    { periods: 26, label: 'Medio año de racha', message: 'Medio año cumpliendo tu meta semanal. Pocos llegan hasta acá.', icon: Diamond, color: '#0ea5e9' },
    { periods: 52, label: 'Un año sin fallar', message: 'Un año entero, semana tras semana. Esto ya no se rompe fácil.', icon: Crown, color: '#a855f7' },
  ],
  weekend: [
    { periods: 2, label: 'En racha', message: 'Dos fines de semana seguidos. Vas encaminado.', icon: Flame, color: '#f97316' },
    { periods: 4, label: 'Un mes de constancia', message: 'Cuatro fines de semana sin fallar — un mes entero de compromiso.', icon: Star, color: '#eab308' },
    { periods: 8, label: 'Dos meses seguidos', message: 'Ocho fines de semana seguidos. Esto ya es una rutina real.', icon: Medal, color: '#a08860' },
    { periods: 13, label: 'Un trimestre completo', message: 'Trece fines de semana — un trimestre entero sin faltar uno solo.', icon: Trophy, color: '#d97706' },
    { periods: 26, label: 'Medio año de racha', message: 'Medio año de fines de semana cumplidos. Pocos llegan hasta acá.', icon: Diamond, color: '#0ea5e9' },
    { periods: 52, label: 'Un año sin fallar', message: 'Un año entero, fin de semana tras fin de semana.', icon: Crown, color: '#a855f7' },
  ],
  monthly: [
    { periods: 2, label: 'En racha', message: 'Dos meses seguidos cumpliendo tu meta mensual. Vas encaminado.', icon: Flame, color: '#f97316' },
    { periods: 3, label: 'Un trimestre completo', message: 'Tres meses sin fallar — un trimestre entero de compromiso.', icon: Star, color: '#eab308' },
    { periods: 6, label: 'Medio año de racha', message: 'Seis meses seguidos. Medio año de constancia real.', icon: Medal, color: '#a08860' },
    { periods: 12, label: 'Un año sin fallar', message: 'Doce meses — un año entero sin faltar uno solo.', icon: Trophy, color: '#d97706' },
    { periods: 24, label: 'Dos años de racha', message: 'Dos años cumpliendo tu meta mensual. Pocos llegan hasta acá.', icon: Diamond, color: '#0ea5e9' },
    { periods: 36, label: 'Tres años sin fallar', message: 'Tres años enteros. Esto ya no se rompe fácil.', icon: Crown, color: '#a855f7' },
  ],
}

/** Highest tier reached for a given streak under `frequency`, or null if below the first one. */
export function getStreakLevel(periods: number, frequency: Frequency): StreakLevel | null {
  let current: StreakLevel | null = null
  for (const level of STREAK_LEVELS[frequency]) {
    if (periods >= level.periods) current = level
  }
  return current
}

/** First tier not yet reached for a given streak under `frequency`, or null if already at (or past) the top tier. */
export function getNextStreakLevel(periods: number, frequency: Frequency): StreakLevel | null {
  return STREAK_LEVELS[frequency].find((level) => level.periods > periods) ?? null
}

/** Unit word for displaying a raw period count (e.g. "3 semanas", "1 mes"). */
export function periodUnitLabel(frequency: Frequency, periods: number): string {
  const plural = periods !== 1
  if (frequency === 'daily') return plural ? 'días' : 'día'
  if (frequency === 'weekly') return plural ? 'semanas' : 'semana'
  if (frequency === 'weekend') return plural ? 'fines de semana' : 'fin de semana'
  return plural ? 'meses' : 'mes'
}
