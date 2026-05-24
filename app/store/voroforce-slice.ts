import { UAParser } from 'ua-parser-js'
import type { StateCreator } from 'zustand'

import {
  getPersistentSettings,
  updatePersistentSetting,
} from '../utils/settings'
import type {
  CELL_LIMIT,
  ConfigUniforms,
  DEVICE_CLASS,
  PerformanceMonitorApi,
  UserConfig,
  VOROFORCE_PRESET,
  VoroforceInstance,
} from '../vf'
import { DEFAULT_VOROFORCE_MODE, VOROFORCE_MODE } from '../vf/consts'

export interface VoroforceSlice {
  ua: UAParser
  container?: HTMLElement
  setContainer: (container: HTMLElement) => void
  voroforce?: VoroforceInstance
  setVoroforce: (instance: VoroforceInstance) => void
  config?: VoroforceInstance['config']
  setConfig: (instance: VoroforceInstance['config']) => void
  voroforceMediaPreloaded: boolean
  setVoroforceMediaPreloaded: (preloaded: boolean) => void
  mode: VOROFORCE_MODE
  setMode: (mode: VOROFORCE_MODE) => void
  exitSelectMode: () => void
  voroforceDevSceneEnabled: boolean
  setVoroforceDevSceneEnabled: (enabled: boolean) => void
  playedIntro: boolean
  setPlayedIntro: (playedIntro: boolean) => void
  preset?: VOROFORCE_PRESET
  setPreset: (preset: VOROFORCE_PRESET) => void
  cellLimit?: CELL_LIMIT
  setCellLimit: (cellLimit: CELL_LIMIT) => void
  deviceClass?: DEVICE_CLASS
  setDeviceClass: (deviceClass: DEVICE_CLASS) => void
  estimatedDeviceClass?: DEVICE_CLASS
  setEstimatedDeviceClass: (deviceClass: DEVICE_CLASS) => void
  userConfig: UserConfig
  setUserConfig: (userConfig: UserConfig) => void
  configUniforms: {
    main: ConfigUniforms
    post: ConfigUniforms
    transitioning: ConfigUniforms
  }
  performanceMonitor?: PerformanceMonitorApi
  setPerformanceMonitor: (performanceMonitor: PerformanceMonitorApi) => void
}

export const createEngineSlice: StateCreator<
  VoroforceSlice,
  [],
  [],
  VoroforceSlice
> = (set, get) => {
  const persistentSettings = getPersistentSettings()
  const initialMode = persistentSettings.playedIntro
    ? DEFAULT_VOROFORCE_MODE
    : VOROFORCE_MODE.intro

  return {
    ua: new UAParser(),
    setContainer: (container: HTMLElement) => set({ container }),
    setVoroforce: (instance: VoroforceInstance) => set({ voroforce: instance }),
    setConfig: (config: VoroforceInstance['config']) => set({ config }),
    voroforceMediaPreloaded: false,
    setVoroforceMediaPreloaded: (voroforceMediaPreloaded: boolean) => {
      set({ voroforceMediaPreloaded })
    },
    mode: initialMode,
    setMode: (mode: VOROFORCE_MODE) => set({ mode }),
    exitSelectMode: () => {
      get().voroforce?.controls?.deselectAndPin()
    },
    voroforceDevSceneEnabled: false,
    setVoroforceDevSceneEnabled: (voroforceDevSceneEnabled: boolean) => {
      const voroforce = get().voroforce
      if (voroforce) {
        voroforce.config.display.scene.dev.enabled = voroforceDevSceneEnabled

        if (voroforceDevSceneEnabled) {
          voroforce.display.scene.initDev()
        } else {
          voroforce.display.scene.stopDev()
        }
      }

      set({ voroforceDevSceneEnabled })
    },
    playedIntro: persistentSettings.playedIntro,
    setPlayedIntro: (playedIntro: boolean) => {
      updatePersistentSetting('playedIntro', playedIntro)
      set({ playedIntro })
    },
    preset: persistentSettings.preset,
    setPreset: (preset: VOROFORCE_PRESET) => {
      updatePersistentSetting('preset', preset)
      set({ preset })
    },
    cellLimit: persistentSettings.cellLimit,
    setCellLimit: (cellLimit: CELL_LIMIT) => {
      updatePersistentSetting('cellLimit', cellLimit)
      set({ cellLimit })
    },
    deviceClass: persistentSettings.deviceClass,
    setDeviceClass: (deviceClass: DEVICE_CLASS) => {
      updatePersistentSetting('deviceClass', deviceClass)
      set({ deviceClass })
    },
    estimatedDeviceClass: undefined,
    setEstimatedDeviceClass: (estimatedDeviceClass: DEVICE_CLASS) => {
      set({ estimatedDeviceClass })
    },
    userConfig: persistentSettings.userConfig,
    setUserConfig: (userConfig: UserConfig) => {
      updatePersistentSetting('userConfig', userConfig)
      set({ userConfig })
    },
    configUniforms: {
      main: {} as ConfigUniforms,
      post: {} as ConfigUniforms,
      transitioning: {} as ConfigUniforms,
    },
    setPerformanceMonitor: (performanceMonitor) => {
      set({ performanceMonitor })
    },
  }
}
