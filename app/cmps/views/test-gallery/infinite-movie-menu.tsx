import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../../utils/tw'

export type InfiniteMovieMenuItem<T> = {
  id: string
  image: string
  title: string
  description: string
  meta: string
  payload: T
}

type InfiniteMovieMenuProps<T> = {
  activeId: string | null
  items: InfiniteMovieMenuItem<T>[]
  loadState: 'loading' | 'ready' | 'error'
  scale?: number
  onActiveItemChange: (item: InfiniteMovieMenuItem<T>) => void
  onSelectItem: (item: InfiniteMovieMenuItem<T>) => void
}

type Vec2 = [number, number]
type Vec3 = [number, number, number]
type Quat = [number, number, number, number]
type Mat4 = Float32Array

const SPHERE_RADIUS = 2.35
const TARGET_FRAME_DURATION = 1000 / 60
const CARD_ASPECT = 0.68
const TEXTURE_CELL_SIZE = 256
const CONTACT_COLUMNS = 12
const CONTACT_ROWS = 13

const vertexShaderSource = `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

void main() {
  vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.0);

  vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float radius = length(centerPos.xyz);

  if (gl_VertexID > 0) {
    vec3 rotationAxis = uRotationAxisVelocity.xyz;
    float rotationVelocity = min(0.16, uRotationAxisVelocity.w * 16.0);
    vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
    vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
    float strength = dot(stretchDir, relativeVertexPos);
    float invAbsStrength = min(0.0, abs(strength) - 1.0);
    strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.0);
    worldPosition.xyz += stretchDir * strength;
  }

  worldPosition.xyz = radius * normalize(worldPosition.xyz);
  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

  float face = normalize(worldPosition.xyz).z;
  vAlpha = smoothstep(-0.2, 0.95, face) * 0.84 + 0.16;
  vUvs = aModelUvs;
  vInstanceId = gl_InstanceID;
}
`

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

float roundedRectMask(vec2 uv, float radius) {
  vec2 q = abs(uv - 0.5) - vec2(0.5 - radius);
  float dist = length(max(q, 0.0)) - radius;
  return 1.0 - smoothstep(0.0, 0.015, dist);
}

void main() {
  int itemIndex = vInstanceId % max(1, uItemCount);
  int cellX = itemIndex % uAtlasSize;
  int cellY = itemIndex / uAtlasSize;
  vec2 cellSize = vec2(1.0) / vec2(float(uAtlasSize));
  vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

  float xPad = (1.0 - ${CARD_ASPECT.toFixed(2)}) * 0.5;
  vec2 st = vec2(mix(xPad, 1.0 - xPad, vUvs.x), 1.0 - vUvs.y);
  st = st * cellSize + cellOffset;

  vec4 color = texture(uTex, st);
  float mask = roundedRectMask(vUvs, 0.075);
  outColor = color;
  outColor.rgb *= mix(0.64, 1.08, vAlpha);
  outColor.a *= mask * vAlpha;
  if (outColor.a < 0.02) discard;
}
`

const identityMat4 = (): Mat4 => {
  const out = new Float32Array(16)
  out[0] = 1
  out[5] = 1
  out[10] = 1
  out[15] = 1
  return out
}

const copyMat4 = (out: Mat4, matrix: Mat4) => {
  out.set(matrix)
  return out
}

const multiplyMat4 = (out: Mat4, a: Mat4, b: Mat4) => {
  const a00 = a[0]
  const a01 = a[1]
  const a02 = a[2]
  const a03 = a[3]
  const a10 = a[4]
  const a11 = a[5]
  const a12 = a[6]
  const a13 = a[7]
  const a20 = a[8]
  const a21 = a[9]
  const a22 = a[10]
  const a23 = a[11]
  const a30 = a[12]
  const a31 = a[13]
  const a32 = a[14]
  const a33 = a[15]

  let b0 = b[0]
  let b1 = b[1]
  let b2 = b[2]
  let b3 = b[3]
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33

  b0 = b[4]
  b1 = b[5]
  b2 = b[6]
  b3 = b[7]
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33

  b0 = b[8]
  b1 = b[9]
  b2 = b[10]
  b3 = b[11]
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33

  b0 = b[12]
  b1 = b[13]
  b2 = b[14]
  b3 = b[15]
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33
  return out
}

const translationMat4 = ([x, y, z]: Vec3) => {
  const out = identityMat4()
  out[12] = x
  out[13] = y
  out[14] = z
  return out
}

const scalingMat4 = ([x, y, z]: Vec3) => {
  const out = identityMat4()
  out[0] = x
  out[5] = y
  out[10] = z
  return out
}

const perspectiveMat4 = (
  out: Mat4,
  fov: number,
  aspect: number,
  near: number,
  far: number,
) => {
  const f = 1 / Math.tan(fov / 2)
  out.fill(0)
  out[0] = f / aspect
  out[5] = f
  out[11] = -1
  if (far !== Number.POSITIVE_INFINITY) {
    const nf = 1 / (near - far)
    out[10] = (far + near) * nf
    out[14] = 2 * far * near * nf
  } else {
    out[10] = -1
    out[14] = -2 * near
  }
  return out
}

const invertMat4 = (out: Mat4, a: Mat4) => {
  const a00 = a[0]
  const a01 = a[1]
  const a02 = a[2]
  const a03 = a[3]
  const a10 = a[4]
  const a11 = a[5]
  const a12 = a[6]
  const a13 = a[7]
  const a20 = a[8]
  const a21 = a[9]
  const a22 = a[10]
  const a23 = a[11]
  const a30 = a[12]
  const a31 = a[13]
  const a32 = a[14]
  const a33 = a[15]

  const b00 = a00 * a11 - a01 * a10
  const b01 = a00 * a12 - a02 * a10
  const b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11
  const b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30
  const b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31
  const b10 = a21 * a33 - a23 * a31
  const b11 = a22 * a33 - a23 * a32

  let det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
  if (!det) return null
  det = 1 / det

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det
  return out
}

const targetToMat4 = (out: Mat4, eye: Vec3, target: Vec3, up: Vec3) => {
  const z = normalize3(subtract3(eye, target))
  let x = normalize3(cross3(up, z))
  if (length3(x) < 0.0001) x = [1, 0, 0]
  const y = cross3(z, x)

  out[0] = x[0]
  out[1] = x[1]
  out[2] = x[2]
  out[3] = 0
  out[4] = y[0]
  out[5] = y[1]
  out[6] = y[2]
  out[7] = 0
  out[8] = z[0]
  out[9] = z[1]
  out[10] = z[2]
  out[11] = 0
  out[12] = eye[0]
  out[13] = eye[1]
  out[14] = eye[2]
  out[15] = 1
  return out
}

const length3 = ([x, y, z]: Vec3) => Math.hypot(x, y, z)
const normalize3 = ([x, y, z]: Vec3): Vec3 => {
  const len = Math.hypot(x, y, z)
  return len > 0.000001 ? [x / len, y / len, z / len] : [0, 0, 0]
}
const subtract3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const negate3 = ([x, y, z]: Vec3): Vec3 => [-x, -y, -z]
const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const distanceSquared3 = (a: Vec3, b: Vec3) => {
  const x = a[0] - b[0]
  const y = a[1] - b[1]
  const z = a[2] - b[2]
  return x * x + y * y + z * z
}

const identityQuat = (): Quat => [0, 0, 0, 1]
const normalizeQuat = ([x, y, z, w]: Quat): Quat => {
  const len = Math.hypot(x, y, z, w)
  return len > 0.000001 ? [x / len, y / len, z / len, w / len] : identityQuat()
}
const multiplyQuat = (a: Quat, b: Quat): Quat => [
  a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1],
  a[1] * b[3] + a[3] * b[1] + a[2] * b[0] - a[0] * b[2],
  a[2] * b[3] + a[3] * b[2] + a[0] * b[1] - a[1] * b[0],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]
const conjugateQuat = ([x, y, z, w]: Quat): Quat => [-x, -y, -z, w]
const axisAngleQuat = (axis: Vec3, angle: number): Quat => {
  const half = angle * 0.5
  const s = Math.sin(half)
  return normalizeQuat([axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)])
}
const slerpQuat = (a: Quat, b: Quat, t: number): Quat => {
  let bx = b[0]
  let by = b[1]
  let bz = b[2]
  let bw = b[3]
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw

  if (cos < 0) {
    cos = -cos
    bx = -bx
    by = -by
    bz = -bz
    bw = -bw
  }

  if (cos > 0.9995) {
    return normalizeQuat([
      a[0] + t * (bx - a[0]),
      a[1] + t * (by - a[1]),
      a[2] + t * (bz - a[2]),
      a[3] + t * (bw - a[3]),
    ])
  }

  const theta = Math.acos(Math.min(Math.max(cos, -1), 1))
  const sinTheta = Math.sin(theta)
  const scaleA = Math.sin((1 - t) * theta) / sinTheta
  const scaleB = Math.sin(t * theta) / sinTheta
  return [
    a[0] * scaleA + bx * scaleB,
    a[1] * scaleA + by * scaleB,
    a[2] * scaleA + bz * scaleB,
    a[3] * scaleA + bw * scaleB,
  ]
}

const transformQuat3 = ([x, y, z]: Vec3, q: Quat): Vec3 => {
  const qx = q[0]
  const qy = q[1]
  const qz = q[2]
  const qw = q[3]
  const uvx = qy * z - qz * y
  const uvy = qz * x - qx * z
  const uvz = qx * y - qy * x
  const uuvx = qy * uvz - qz * uvy
  const uuvy = qz * uvx - qx * uvz
  const uuvz = qx * uvy - qy * uvx
  return [
    x + 2 * (uvx * qw + uuvx),
    y + 2 * (uvy * qw + uuvy),
    z + 2 * (uvz * qw + uuvz),
  ]
}

const createSphericalContactSheetPositions = (
  columns = CONTACT_COLUMNS,
  rows = CONTACT_ROWS,
) => {
  const positions: Vec3[] = []
  const thetaSpan = Math.PI * 0.66
  const centerTheta = Math.PI
  for (let row = 0; row < rows; row += 1) {
    const rowProgress = rows === 1 ? 0.5 : row / (rows - 1)
    const phi = (0.16 + rowProgress * 0.68) * Math.PI
    const rowOffset = row % 2 === 0 ? -0.008 : 0.008
    for (let column = 0; column < columns; column += 1) {
      const columnProgress = columns === 1 ? 0.5 : column / (columns - 1)
      const theta = centerTheta - thetaSpan / 2 + columnProgress * thetaSpan + rowOffset
      positions.push([
        SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
        SPHERE_RADIUS * Math.cos(phi),
        SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
      ])
    }
  }
  return positions
}

const createCardGeometry = () => {
  const halfHeight = 0.5
  const halfWidth = halfHeight * CARD_ASPECT
  return {
    vertices: new Float32Array([
      -halfWidth, -halfHeight, 0,
      halfWidth, -halfHeight, 0,
      halfWidth, halfHeight, 0,
      -halfWidth, halfHeight, 0,
    ]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
  }
}

const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  console.error(gl.getShaderInfoLog(shader))
  gl.deleteShader(shader)
  return null
}

const createProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
) => {
  const program = gl.createProgram()
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!program || !vertexShader || !fragmentShader) return null
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.bindAttribLocation(program, 0, 'aModelPosition')
  gl.bindAttribLocation(program, 1, 'aModelUvs')
  gl.bindAttribLocation(program, 2, 'aInstanceMatrix')
  gl.linkProgram(program)
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program
  console.error(gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
  return null
}

const createBuffer = (
  gl: WebGL2RenderingContext,
  dataOrSize: BufferSource | number,
  usage: number,
) => {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  if (typeof dataOrSize === 'number') {
    gl.bufferData(gl.ARRAY_BUFFER, dataOrSize, usage)
  } else {
    gl.bufferData(gl.ARRAY_BUFFER, dataOrSize, usage)
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  return buffer
}

const resizeCanvasToDisplaySize = (canvas: HTMLCanvasElement) => {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const displayWidth = Math.max(1, Math.round(canvas.clientWidth * dpr))
  const displayHeight = Math.max(1, Math.round(canvas.clientHeight * dpr))
  const needsResize = canvas.width !== displayWidth || canvas.height !== displayHeight
  if (needsResize) {
    canvas.width = displayWidth
    canvas.height = displayHeight
  }
  return needsResize
}

class ArcballControl {
  isPointerDown = false
  orientation: Quat = identityQuat()
  pointerRotation: Quat = identityQuat()
  rotationVelocity = 0
  rotationAxis: Vec3 = [1, 0, 0]
  snapDirection: Vec3 = [0, 0, -1]
  snapTargetDirection: Vec3 | null = null

  private pointerPos: Vec2 = [0, 0]
  private previousPointerPos: Vec2 = [0, 0]
  private combinedQuat: Quat = identityQuat()
  private smoothedRotationVelocity = 0
  private readonly cleanupHandlers: Array<() => void> = []

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly updateCallback: (deltaTime: number) => void,
  ) {
    const onPointerDown = (event: PointerEvent) => {
      this.pointerPos = [event.clientX, event.clientY]
      this.previousPointerPos = [...this.pointerPos]
      this.isPointerDown = true
      this.canvas.setPointerCapture?.(event.pointerId)
    }
    const onPointerUp = (event: PointerEvent) => {
      this.isPointerDown = false
      this.canvas.releasePointerCapture?.(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (this.isPointerDown) this.pointerPos = [event.clientX, event.clientY]
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerUp)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.style.touchAction = 'none'

    this.cleanupHandlers.push(
      () => canvas.removeEventListener('pointerdown', onPointerDown),
      () => canvas.removeEventListener('pointerup', onPointerUp),
      () => canvas.removeEventListener('pointerleave', onPointerUp),
      () => canvas.removeEventListener('pointermove', onPointerMove),
    )
  }

  dispose() {
    this.cleanupHandlers.forEach((cleanup) => cleanup())
  }

  update(deltaTime: number) {
    const timeScale = deltaTime / TARGET_FRAME_DURATION + 0.00001
    let angleFactor = timeScale
    let snapRotation = identityQuat()

    if (this.isPointerDown) {
      const intensity = 0.3 * timeScale
      const amplification = 5 / timeScale
      const delta: Vec2 = [
        (this.pointerPos[0] - this.previousPointerPos[0]) * intensity,
        (this.pointerPos[1] - this.previousPointerPos[1]) * intensity,
      ]

      if (delta[0] * delta[0] + delta[1] * delta[1] > 0.1) {
        const midpoint: Vec2 = [
          this.previousPointerPos[0] + delta[0],
          this.previousPointerPos[1] + delta[1],
        ]
        const a = normalize3(this.project(midpoint))
        const b = normalize3(this.project(this.previousPointerPos))
        this.previousPointerPos = midpoint
        angleFactor *= amplification
        this.pointerRotation = this.quatFromVectors(a, b, angleFactor)
      } else {
        this.pointerRotation = slerpQuat(this.pointerRotation, identityQuat(), intensity)
      }
    } else {
      const intensity = 0.1 * timeScale
      this.pointerRotation = slerpQuat(this.pointerRotation, identityQuat(), intensity)

      if (this.snapTargetDirection) {
        const sqrDist = distanceSquared3(this.snapTargetDirection, this.snapDirection)
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10)
        angleFactor *= 0.2 * distanceFactor
        snapRotation = this.quatFromVectors(
          this.snapTargetDirection,
          this.snapDirection,
          angleFactor,
        )
      }
    }

    const combined = multiplyQuat(snapRotation, this.pointerRotation)
    this.orientation = normalizeQuat(multiplyQuat(combined, this.orientation))
    this.combinedQuat = normalizeQuat(slerpQuat(this.combinedQuat, combined, 0.8 * timeScale))

    const rad = Math.acos(Math.min(Math.max(this.combinedQuat[3], -1), 1)) * 2
    const s = Math.sin(rad / 2)
    let rotationVelocity = 0
    if (s > 0.000001) {
      rotationVelocity = rad / (2 * Math.PI)
      this.rotationAxis = [
        this.combinedQuat[0] / s,
        this.combinedQuat[1] / s,
        this.combinedQuat[2] / s,
      ]
    }

    this.smoothedRotationVelocity +=
      (rotationVelocity - this.smoothedRotationVelocity) * 0.5 * timeScale
    this.rotationVelocity = this.smoothedRotationVelocity / timeScale
    this.updateCallback(deltaTime)
  }

  private quatFromVectors(a: Vec3, b: Vec3, angleFactor = 1) {
    const axis = normalize3(cross3(a, b))
    if (length3(axis) < 0.000001) return identityQuat()
    const d = Math.max(-1, Math.min(1, dot3(a, b)))
    return axisAngleQuat(axis, Math.acos(d) * angleFactor)
  }

  private project(pos: Vec2): Vec3 {
    const radius = 2
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    const side = Math.max(width, height) - 1
    const x = (2 * pos[0] - width - 1) / side
    const y = (2 * pos[1] - height - 1) / side
    const xySq = x * x + y * y
    const rSq = radius * radius
    const z = xySq <= rSq / 2 ? Math.sqrt(rSq - xySq) : rSq / Math.sqrt(xySq)
    return [-x, y, z]
  }
}

class InfiniteMovieEngine<T> {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private vao: WebGLVertexArrayObject | null = null
  private texture: WebGLTexture | null = null
  private control: ArcballControl
  private frameId = 0
  private time = 0
  private frames = 0
  private disposed = false
  private movementActive = false
  private smoothRotationVelocity = 0
  private nearestVertexIndex = 0
  private readonly cardBuffers = createCardGeometry()
  private readonly worldMatrix = identityMat4()
  private readonly viewMatrix = identityMat4()
  private readonly cameraMatrix = identityMat4()
  private readonly projectionMatrix = identityMat4()
  private readonly cameraPosition: Vec3
  private readonly cameraUp: Vec3 = [0, 1, 0]
  private readonly instancePositions: Vec3[]
  private readonly instanceMatricesArray: Float32Array
  private readonly instanceMatrices: Float32Array[]
  private readonly instanceBuffer: WebGLBuffer | null
  private readonly locations: Record<string, WebGLUniformLocation | null>
  private atlasSize = 1

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly items: InfiniteMovieMenuItem<T>[],
    private readonly scale: number,
    private readonly onActiveItemChange: (item: InfiniteMovieMenuItem<T>) => void,
    private readonly onMovementChange: (moving: boolean) => void,
  ) {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    })
    const program = gl ? createProgram(gl, vertexShaderSource, fragmentShaderSource) : null
    if (!gl || !program) throw new Error('WebGL2 could not initialize')
    this.gl = gl
    this.program = program
    this.cameraPosition = [0, 0, 3.18 * scale]
    this.locations = {
      uWorldMatrix: gl.getUniformLocation(program, 'uWorldMatrix'),
      uViewMatrix: gl.getUniformLocation(program, 'uViewMatrix'),
      uProjectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
      uRotationAxisVelocity: gl.getUniformLocation(program, 'uRotationAxisVelocity'),
      uTex: gl.getUniformLocation(program, 'uTex'),
      uItemCount: gl.getUniformLocation(program, 'uItemCount'),
      uAtlasSize: gl.getUniformLocation(program, 'uAtlasSize'),
    }

    this.instancePositions = createSphericalContactSheetPositions()
    this.instanceMatricesArray = new Float32Array(this.instancePositions.length * 16)
    this.instanceMatrices = this.instancePositions.map((_, index) => {
      const matrix = new Float32Array(this.instanceMatricesArray.buffer, index * 16 * 4, 16)
      matrix.set(identityMat4())
      return matrix
    })

    this.instanceBuffer = gl.createBuffer()
    this.initGeometry()
    this.initTexture()
    this.control = new ArcballControl(canvas, (deltaTime) => this.onControlUpdate(deltaTime))
    this.resize()
  }

  run(time = 0) {
    if (this.disposed) return
    const deltaTime = Math.min(32, time - this.time || TARGET_FRAME_DURATION)
    this.time = time
    this.frames += deltaTime / TARGET_FRAME_DURATION
    this.animate(deltaTime)
    this.render()
    this.frameId = window.requestAnimationFrame((nextTime) => this.run(nextTime))
  }

  resize() {
    if (resizeCanvasToDisplaySize(this.canvas)) {
      this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)
    }
    this.updateProjectionMatrix()
  }

  dispose() {
    this.disposed = true
    window.cancelAnimationFrame(this.frameId)
    this.control.dispose()
  }

  private initGeometry() {
    const gl = this.gl
    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)

    const vertexBuffer = createBuffer(gl, this.cardBuffers.vertices, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)

    const uvBuffer = createBuffer(gl, this.cardBuffers.uvs, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)

    const indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.cardBuffers.indices, gl.STATIC_DRAW)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceMatricesArray.byteLength, gl.DYNAMIC_DRAW)
    for (let index = 0; index < 4; index += 1) {
      const loc = 2 + index
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 16 * 4, index * 4 * 4)
      gl.vertexAttribDivisor(loc, 1)
    }

    gl.bindVertexArray(null)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  private initTexture() {
    const gl = this.gl
    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([10, 10, 10, 255]),
    )

    const itemCount = Math.max(1, this.items.length)
    this.atlasSize = Math.ceil(Math.sqrt(itemCount))
    const atlas = document.createElement('canvas')
    const context = atlas.getContext('2d')
    if (!context) return
    atlas.width = this.atlasSize * TEXTURE_CELL_SIZE
    atlas.height = this.atlasSize * TEXTURE_CELL_SIZE

    void Promise.all(this.items.map((item) => this.loadImage(item.image))).then((images) => {
      if (this.disposed || !this.texture) return
      context.fillStyle = '#050505'
      context.fillRect(0, 0, atlas.width, atlas.height)
      images.forEach((image, index) => {
        const x = (index % this.atlasSize) * TEXTURE_CELL_SIZE
        const y = Math.floor(index / this.atlasSize) * TEXTURE_CELL_SIZE
        this.drawPosterIntoCell(context, image, x, y, TEXTURE_CELL_SIZE, TEXTURE_CELL_SIZE)
      })

      gl.bindTexture(gl.TEXTURE_2D, this.texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
      gl.generateMipmap(gl.TEXTURE_2D)
    })
  }

  private loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => resolve(image)
      image.src = src
    })
  }

  private drawPosterIntoCell(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    if (!image.naturalWidth || !image.naturalHeight) {
      context.fillStyle = '#111'
      context.fillRect(x, y, width, height)
      return
    }
    const posterWidth = width * CARD_ASPECT
    const posterX = x + (width - posterWidth) / 2
    const scale = Math.max(posterWidth / image.naturalWidth, height / image.naturalHeight)
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    context.save()
    context.beginPath()
    context.rect(posterX, y, posterWidth, height)
    context.clip()
    context.drawImage(
      image,
      posterX + (posterWidth - drawWidth) / 2,
      y + (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    )
    context.restore()
  }

  private animate(deltaTime: number) {
    const gl = this.gl
    this.control.update(deltaTime)

    this.instancePositions.forEach((position, index) => {
      const transformed = transformQuat3(position, this.control.orientation)
      const depthScale =
        (Math.abs(transformed[2]) / SPHERE_RADIUS) * 0.52 + (1 - 0.52)
      const finalScale = depthScale * 0.31
      const matrix = identityMat4()
      const translateToSphere = translationMat4(negate3(transformed))
      const faceCenter = targetToMat4(identityMat4(), [0, 0, 0], transformed, [0, 1, 0])
      const scaleMatrix = scalingMat4([finalScale, finalScale, finalScale])
      const backTranslate = translationMat4([0, 0, -SPHERE_RADIUS])

      multiplyMat4(matrix, matrix, translateToSphere)
      multiplyMat4(matrix, matrix, faceCenter)
      multiplyMat4(matrix, matrix, scaleMatrix)
      multiplyMat4(matrix, matrix, backTranslate)
      copyMat4(this.instanceMatrices[index], matrix)
    })

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.instanceMatricesArray)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    this.smoothRotationVelocity = this.control.rotationVelocity
  }

  private render() {
    const gl = this.gl
    gl.useProgram(this.program)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.uniformMatrix4fv(this.locations.uWorldMatrix, false, this.worldMatrix)
    gl.uniformMatrix4fv(this.locations.uViewMatrix, false, this.viewMatrix)
    gl.uniformMatrix4fv(this.locations.uProjectionMatrix, false, this.projectionMatrix)
    gl.uniform4f(
      this.locations.uRotationAxisVelocity,
      this.control.rotationAxis[0],
      this.control.rotationAxis[1],
      this.control.rotationAxis[2],
      this.smoothRotationVelocity * 1.1,
    )
    gl.uniform1i(this.locations.uItemCount, Math.max(1, this.items.length))
    gl.uniform1i(this.locations.uAtlasSize, this.atlasSize)
    gl.uniform1i(this.locations.uTex, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.bindVertexArray(this.vao)
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      this.cardBuffers.indices.length,
      gl.UNSIGNED_SHORT,
      0,
      this.instancePositions.length,
    )
  }

  private onControlUpdate(deltaTime: number) {
    const timeScale = deltaTime / TARGET_FRAME_DURATION + 0.0001
    let damping = 5 / timeScale
    let cameraTargetZ = 3.18 * this.scale
    const isMoving =
      this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01

    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving
      this.onMovementChange(isMoving)
    }

    if (!this.control.isPointerDown) {
      this.nearestVertexIndex = this.findNearestVertexIndex()
      const item = this.items[this.nearestVertexIndex % Math.max(1, this.items.length)]
      if (item) this.onActiveItemChange(item)
      this.control.snapTargetDirection = normalize3(
        transformQuat3(this.instancePositions[this.nearestVertexIndex], this.control.orientation),
      )
    } else {
      cameraTargetZ += this.control.rotationVelocity * 86 + 2.35
      damping = 7 / timeScale
    }

    this.cameraPosition[2] += (cameraTargetZ - this.cameraPosition[2]) / damping
    this.updateCameraMatrix()
  }

  private findNearestVertexIndex() {
    const inversOrientation = conjugateQuat(this.control.orientation)
    const target = transformQuat3(this.control.snapDirection, inversOrientation)
    let maxDot = -Infinity
    let nearestVertexIndex = 0
    this.instancePositions.forEach((position, index) => {
      const d = dot3(target, position)
      if (d > maxDot) {
        maxDot = d
        nearestVertexIndex = index
      }
    })
    return nearestVertexIndex
  }

  private updateCameraMatrix() {
    targetToMat4(this.cameraMatrix, this.cameraPosition, [0, 0, 0], this.cameraUp)
    invertMat4(this.viewMatrix, this.cameraMatrix)
  }

  private updateProjectionMatrix() {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight)
    const height = SPHERE_RADIUS * 0.58
    const distance = this.cameraPosition[2]
    const fov =
      aspect > 1
        ? 2 * Math.atan(height / distance)
        : 2 * Math.atan(height / aspect / distance)
    perspectiveMat4(this.projectionMatrix, fov, aspect, 0.1, 40)
    this.updateCameraMatrix()
  }
}

export const InfiniteMovieMenu = <T,>({
  activeId,
  items,
  loadState,
  scale = 1,
  onActiveItemChange,
  onSelectItem,
}: InfiniteMovieMenuProps<T>) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const activeItemRef = useRef<InfiniteMovieMenuItem<T> | null>(null)
  const [activeItem, setActiveItem] = useState<InfiniteMovieMenuItem<T> | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [webglError, setWebglError] = useState('')

  const itemKey = useMemo(() => items.map((item) => item.id).join('|'), [items])

  useEffect(() => {
    const nextActive =
      items.find((item) => item.id === activeId) ?? activeItemRef.current ?? items[0] ?? null
    activeItemRef.current = nextActive
    setActiveItem(nextActive)
  }, [activeId, items])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !items.length) return

    let engine: InfiniteMovieEngine<T> | null = null
    const onResize = () => engine?.resize()

    try {
      engine = new InfiniteMovieEngine(
        canvas,
        items,
        scale,
        (item) => {
          activeItemRef.current = item
          setActiveItem(item)
          onActiveItemChange(item)
        },
        setIsMoving,
      )
      engine.run()
      window.addEventListener('resize', onResize)
      setWebglError('')
    } catch (error) {
      setWebglError(error instanceof Error ? error.message : 'WebGL could not initialize')
    }

    return () => {
      window.removeEventListener('resize', onResize)
      engine?.dispose()
    }
  }, [itemKey, items, scale, onActiveItemChange])

  return (
    <div className="warp-infinite-menu">
      <canvas
        ref={canvasRef}
        className="warp-infinite-menu-canvas"
        aria-label="Infinite movie poster menu"
        onClick={() => {
          if (activeItemRef.current) onSelectItem(activeItemRef.current)
        }}
      />

      <div className="warp-infinite-sheen" />

      {activeItem ? (
        <button
          type="button"
          className={cn('warp-focus-card', isMoving && 'is-moving')}
          onClick={() => onSelectItem(activeItem)}
        >
          <span>{activeItem.title}</span>
          <span>{activeItem.meta}</span>
          <span>{activeItem.description}</span>
        </button>
      ) : null}

      <div className="warp-wall-loading" data-state={loadState}>
        Loading movies
      </div>

      {webglError ? <div className="warp-webgl-error">{webglError}</div> : null}
    </div>
  )
}
