/**
 * Moves the item at fromIndex to toIndex, returning a new array — used to
 * compute a habit's new display order after a drag-and-drop reorder.
 */
export function reorderHabits<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return items
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}
