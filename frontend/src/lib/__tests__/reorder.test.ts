import { describe, it, expect } from 'vitest'
import { reorderHabits } from '../reorder'

describe('reorderHabits', () => {
  it('moves an item later in the list', () => {
    expect(reorderHabits(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item earlier in the list', () => {
    expect(reorderHabits(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('moves an item to the start', () => {
    expect(reorderHabits(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('moves an item to the end', () => {
    expect(reorderHabits(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('is a no-op when fromIndex equals toIndex', () => {
    const input = ['a', 'b', 'c']
    expect(reorderHabits(input, 1, 1)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c']
    reorderHabits(input, 0, 2)
    expect(input).toEqual(['a', 'b', 'c'])
  })
})
