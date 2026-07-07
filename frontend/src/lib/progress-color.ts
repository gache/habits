/** Shared color/bg thresholds for progress percentages — used by Tracker's
 * global badge, History's month cards and detail table. Keeping one
 * definition avoids the three copies drifting apart if a threshold changes. */

export function getProgressColor(pct: number): string {
  if (pct >= 80) return '#457040' // sage-600
  if (pct >= 50) return '#c2603a' // terracotta-600
  return '#ef4444' // red-500
}

export function getProgressBg(pct: number): string {
  if (pct >= 80) return 'bg-sage-50 dark:bg-sage-900/30'
  if (pct >= 50) return 'bg-terracotta-50 dark:bg-terracotta-900/30'
  return 'bg-red-50 dark:bg-red-950/20'
}
