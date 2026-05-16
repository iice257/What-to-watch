import type { THEME } from '../../consts'
import type { VOROFORCE_MODE } from '../consts'
import { MIN_LERP_EASING_TYPES, easedMinLerp } from './math'

export type BaseConfigUniform =
  | {
      value?: boolean
      transition: never
      targetValue: never
      targetFactor: never
      targetEasing: never
    }
  | {
      value?: number
      transition?: boolean
      targetValue?: number
      targetFactor?: number
      targetEasing?: MIN_LERP_EASING_TYPES
    }

export type ConfigUniform = BaseConfigUniform & {
  modes?: Record<VOROFORCE_MODE | 'default', BaseConfigUniform>
  themes?: Record<THEME | 'default', BaseConfigUniform>
  initial?: BaseConfigUniform
}

export type ConfigUniforms = Map<string, ConfigUniform>

export const handleTransitioningUniforms = (uniforms: ConfigUniforms) => {
  uniforms.forEach((uniform, key) => {
    if (
      typeof uniform.value === 'number' &&
      typeof uniform.targetValue === 'number'
    ) {
      uniform.value = easedMinLerp(
        uniform.value,
        uniform.targetValue,
        uniform.targetFactor ?? 0.025,
        uniform.targetEasing ?? MIN_LERP_EASING_TYPES.linear,
        0.001,
      )
      if (uniform.value === uniform.targetValue) {
        uniform.targetValue = undefined
        // uniform.targetFactor = undefined
        uniforms.delete(key)
      }
    }
  })
}

export const updateUniforms = (
  uniforms: ConfigUniforms,
  updates: Record<string, number | boolean>,
  transitioningUniforms?: ConfigUniforms,
) => {
  Object.entries(updates).forEach(([key, value]) => {
    const uniform = uniforms.get(key)
    if (uniform) {
      if (
        transitioningUniforms &&
        typeof value === 'number' &&
        uniform.transition
      ) {
        if (uniform.value !== value) {
          uniform.targetValue = value
          if (!transitioningUniforms.has(key)) {
            transitioningUniforms.set(key, uniform)
          }
        }
      } else {
        uniform.value = value
      }
    }
  })
}

export const updateUniformsByMode = (
  uniforms: ConfigUniforms,
  mode: VOROFORCE_MODE,
  transitioningUniforms?: ConfigUniforms,
) => {
  uniforms.forEach((uniform, key) => {
    const uniformMode = uniform.modes?.[mode] ?? uniform.modes?.default
    if (uniformMode) {
      const value = uniformMode.value
      if (
        transitioningUniforms &&
        typeof value === 'number' &&
        uniform.transition
      ) {
        if (uniform.value !== value) {
          uniform.targetValue = value
          if (!transitioningUniforms.has(key)) {
            transitioningUniforms.set(key, uniform)
          }
        }
      } else {
        uniform.value = value
      }
    }
  })
}

export const updateUniformsByTheme = (
  uniforms: ConfigUniforms,
  theme: THEME,
  transitioningUniforms?: ConfigUniforms,
) => {
  uniforms.forEach((uniform, key) => {
    const uniformTheme = uniform.themes?.[theme] ?? uniform.themes?.default
    if (uniformTheme) {
      const value = uniformTheme.value
      if (
        transitioningUniforms &&
        typeof value === 'number' &&
        uniform.transition
      ) {
        if (uniform.value !== value) {
          uniform.targetValue = value
          if (!transitioningUniforms.has(key)) {
            transitioningUniforms.set(key, uniform)
          }
        }
      } else {
        uniform.value = value
      }
    }
  })
}
