import { isPeriodLocked, isWeekday, isWeekend, type Frequency } from '@/lib/date-utils'
import { getStreakLevel, type StreakLevel } from '@/lib/streak-levels'

export type DisabledReason = 'future' | 'weekend' | 'weekday' | 'period-locked'

export interface DayCellState {
  isDisabled: boolean
  disabledReason: DisabledReason
}

export function computeDayCellState(
  frequency: Frequency,
  dateStr: string,
  today: string,
  completedDates: Set<string>,
): DayCellState {
  const completed = completedDates.has(dateStr)
  const isFutureUncompleted = dateStr > today && !completed
  const isWeekendOnWeekly = !completed && frequency === 'weekly' && !isWeekday(dateStr)
  const isWeekdayOnWeekend = !completed && frequency === 'weekend' && !isWeekend(dateStr)
  const periodLocked = !isFutureUncompleted && !isWeekendOnWeekly && !isWeekdayOnWeekend && isPeriodLocked(frequency, dateStr, completedDates)
  const isDisabled = isFutureUncompleted || isWeekendOnWeekly || isWeekdayOnWeekend || periodLocked
  const disabledReason: DisabledReason = isFutureUncompleted ? 'future' : isWeekendOnWeekly ? 'weekend' : isWeekdayOnWeekend ? 'weekday' : 'period-locked'
  return { isDisabled, disabledReason }
}

interface MilestoneInput {
  frequency: Frequency
  bestStreak: number
  lastBest: number
  lastCelebrated: number
}

interface MilestoneUpdate {
  /** The best streak dropped since it was last seen (a backfilled day got unchecked) — forget which tiers were celebrated so rebuilding past them celebrates again. */
  forgetPrevious: boolean
  milestone: { level: StreakLevel; streak: number } | null
  newCelebratedValue: number | null
}

export function computeMilestoneUpdate({ frequency, bestStreak, lastBest, lastCelebrated }: MilestoneInput): MilestoneUpdate {
  const forgetPrevious = bestStreak < lastBest
  // Mirrors the localStorage reset a caller performs when forgetPrevious is
  // true: the just-forgotten tier no longer gates a re-celebration this run.
  const effectiveLastCelebrated = forgetPrevious ? 0 : lastCelebrated
  const bestLevel = getStreakLevel(bestStreak, frequency)
  if (!bestLevel) return { forgetPrevious, milestone: null, newCelebratedValue: null }

  // Daily check-ins are frequent enough that the fixed 3/7/14/30 ladder
  // leaves long silent stretches (nothing between 8 and 13 days, say) — so
  // daily celebrates every 3rd consecutive day instead. Weekly, monthly and
  // weekend habits keep the fixed ladder: their periods are already spaced
  // out enough (a week, a month) that every-3rd-period would barely differ
  // from the ladder while losing the escalating milestone messages.
  const newMilestone = frequency === 'daily'
    ? bestStreak % 3 === 0 && bestStreak > effectiveLastCelebrated
    : bestLevel.periods > effectiveLastCelebrated

  if (!newMilestone) return { forgetPrevious, milestone: null, newCelebratedValue: null }

  const newCelebratedValue = frequency === 'daily' ? bestStreak : bestLevel.periods
  return { forgetPrevious, milestone: { level: bestLevel, streak: bestStreak }, newCelebratedValue }
}
