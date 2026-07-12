export type HoneycombVec3 = [number, number, number]

const DEFAULT_POINT_COUNT = 750
const DEFAULT_RADIUS = 2.58
const RELAXATION_PASSES = 48
const RELAXATION_STRENGTH = 0.025

const createSeedPositions = (count: number, radius: number) => {
  const positions: HoneycombVec3[] = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let index = 0; index < count; index += 1) {
    const y = 1 - ((index + 0.5) / Math.max(1, count)) * 2
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = index * goldenAngle
    positions.push([
      radius * Math.cos(theta) * ringRadius,
      radius * y,
      radius * Math.sin(theta) * ringRadius,
    ])
  }

  return positions
}

export const createHoneycombSpherePositions = (
  count = DEFAULT_POINT_COUNT,
  radius = DEFAULT_RADIUS,
) => {
  if (count <= 1) return createSeedPositions(Math.max(0, count), radius)

  let positions = createSeedPositions(count, radius)
  const targetSpacing =
    radius * Math.sqrt((8 * Math.PI) / (Math.sqrt(3) * count))
  const interactionDistance = targetSpacing * 1.04

  for (let pass = 0; pass < RELAXATION_PASSES; pass += 1) {
    const forces = Array.from({ length: count }, (): HoneycombVec3 => [0, 0, 0])

    for (let left = 0; left < count; left += 1) {
      for (let right = left + 1; right < count; right += 1) {
        const dx = positions[left][0] - positions[right][0]
        const dy = positions[left][1] - positions[right][1]
        const dz = positions[left][2] - positions[right][2]
        const distance = Math.hypot(dx, dy, dz)
        if (distance >= interactionDistance || distance < 0.000001) continue

        const pressure =
          ((interactionDistance - distance) / interactionDistance) *
          RELAXATION_STRENGTH
        const forceX = (dx / distance) * pressure
        const forceY = (dy / distance) * pressure
        const forceZ = (dz / distance) * pressure
        forces[left][0] += forceX
        forces[left][1] += forceY
        forces[left][2] += forceZ
        forces[right][0] -= forceX
        forces[right][1] -= forceY
        forces[right][2] -= forceZ
      }
    }

    positions = positions.map((position, index) => {
      const force = forces[index]
      const radialForce =
        (force[0] * position[0] +
          force[1] * position[1] +
          force[2] * position[2]) /
        radius ** 2
      const x = position[0] + force[0] - position[0] * radialForce
      const y = position[1] + force[1] - position[1] * radialForce
      const z = position[2] + force[2] - position[2] * radialForce
      const length = Math.hypot(x, y, z) || 1
      return [
        (x / length) * radius,
        (y / length) * radius,
        (z / length) * radius,
      ]
    })
  }

  return positions
}
