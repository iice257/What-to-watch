import { describe, expect, it } from 'vitest'
import { createHoneycombSpherePositions } from './honeycomb-layout'

describe('infinite movie menu geometry', () => {
  it('spaces all 750 honeycomb positions beyond the poster footprint', () => {
    const positions = createHoneycombSpherePositions(750)
    let minimumDistance = Number.POSITIVE_INFINITY
    const nearestDistances = positions.map(() => Number.POSITIVE_INFINITY)

    for (let left = 0; left < positions.length; left += 1) {
      for (let right = left + 1; right < positions.length; right += 1) {
        const dx = positions[left][0] - positions[right][0]
        const dy = positions[left][1] - positions[right][1]
        const dz = positions[left][2] - positions[right][2]
        const distance = Math.hypot(dx, dy, dz)
        minimumDistance = Math.min(minimumDistance, distance)
        nearestDistances[left] = Math.min(nearestDistances[left], distance)
        nearestDistances[right] = Math.min(nearestDistances[right], distance)
      }
    }

    const averageNearestDistance =
      nearestDistances.reduce((sum, distance) => sum + distance, 0) /
      nearestDistances.length
    const maximumNearestDeviation = Math.max(
      ...nearestDistances.map((distance) =>
        Math.abs(distance - averageNearestDistance),
      ),
    )

    expect(positions).toHaveLength(750)
    expect(minimumDistance).toBeGreaterThan(0.28)
    expect(maximumNearestDeviation / averageNearestDistance).toBeLessThan(0.08)
  })
})
