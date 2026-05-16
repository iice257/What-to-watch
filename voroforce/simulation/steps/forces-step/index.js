import { isNumber, minLerp } from '../../../utils'
import BaseSimulationStep from '../common/base-simulation-step'
import * as forceFunctions from './forces'

export default class ForcesSimulationStep extends BaseSimulationStep {
  forces = []

  constructor(store, options) {
    super(store, options)

    this.initMediaProperties()

    this.handleLattice()
    this.initializeCells()
    this.handleForcesConfig()
    this.start()
  }

  updateConfig(config) {
    super.updateConfig(config)
    this.config = config.simulation.steps.force ?? {}

    this.updateParameters(this.config.parameters)
  }

  updateParameters(parameters, config = { forceTransition: false }) {
    if (!parameters) return
    if (this.parameters && (config?.forceTransition || parameters.transition)) {
      this.targetParameters = {
        alpha: parameters.alpha,
        velocityDecay: parameters.velocityDecay,
      }
    } else {
      this.parameters = parameters
    }
  }

  initMediaProperties() {
    this.mediaConfig = this.globalConfig.media
    if (!this.mediaConfig.enabled) return

    this.sharedLoadedMediaVersionLayersData = this.store.get(
      'sharedLoadedMediaVersionLayersData',
    )

    this.mediaVersionLayerLoadRequests = this.mediaConfig.versions.map(
      () => new Set([]),
    )
  }

  handleForcesConfig() {
    const forcesConfig = this.config.forces
    this.isReusableSingleForceConfig = !Array.isArray(forcesConfig)

    if (this.isReusableSingleForceConfig) {
      if ('enabled' in forcesConfig && !forcesConfig.enabled) return
      const props = {
        cells: this.cells,
        links: this.links,
        dimensions: this.dimensions,
        pointer: this.pointer,
        sharedData: this.sharedData,
        config: forcesConfig,
        simulationStepConfig: this.config,
        simulationConfig: this.simulationConfig,
        globalConfig: this.globalConfig,
        handleEnd: this.handleEnd.bind(this),
      }
      if (
        !this.reusableSingleForceBlueprint ||
        !this.reusableSingleForceBlueprint.init
      ) {
        this.reusableSingleForceBlueprint =
          forceFunctions[forcesConfig.type ?? 'omni']?.(props)
      }
      let force = this.reusableSingleForceBlueprint
      if (force.init) force = force.init(props)
      this.forces = [force]
    } else {
      this.reusableSingleForceBlueprint = undefined
      this.forces = []
      forcesConfig.forEach((forceConfig, index) => {
        if ('enabled' in forceConfig && !forceConfig.enabled) return
        const props = {
          cells: this.cells,
          links: this.links,
          dimensions: this.dimensions,
          pointer: this.pointer,
          sharedData: this.sharedData,
          config: forceConfig,
          simulationStepConfig: this.config,
          simulationConfig: this.simulationConfig,
          globalConfig: this.globalConfig,
          handleEnd:
            index === forcesConfig.length - 1
              ? this.handleEnd.bind(this)
              : undefined,
        }

        let force = forceFunctions[forceConfig.type ?? 'omni']?.(props)
        if (!force) return
        if (force.init) force = force.init(props)
        this.forces.push(force)
      })
    }
  }

  refresh() {
    this.handleLattice()
    this.handleForcesConfig()
  }

  setConfig(config) {
    super.setConfig(config)
  }

  tick() {
    if (this.mediaConfig.enabled) {
      this.mediaVersionLayerLoadRequests.forEach((set) => set.clear())
    }

    if (this.targetParameters) {
      this.parameters.alpha = minLerp(
        this.parameters.alpha,
        this.targetParameters.alpha,
        0.025,
      )
      this.parameters.velocityDecay = minLerp(
        this.parameters.velocityDecay,
        this.targetParameters.velocityDecay,
        0.025,
      )

      if (
        this.parameters.alpha === this.targetParameters.alpha &&
        this.parameters.velocityDecay === this.targetParameters.velocityDecay
      )
        this.targetParameters = null
    }

    for (let i = 0; i < this.forces.length; i++) {
      this.forces[i](this.parameters.alpha)
    }

    this.handleMediaVersionLayerLoadRequests()
  }

  handleEnd(cell) {
    cell.localX = cell.x += cell.vx *= 1 - this.parameters.velocityDecay
    cell.localY = cell.y += cell.vy *= 1 - this.parameters.velocityDecay

    cell.initialVx = cell.vx
    cell.initialVy = cell.vy

    this.handleCellTargetMediaVersion(cell)
  }

  handleCellTargetMediaVersion(cell) {
    if (!this.mediaConfig.enabled) return

    if (cell.targetMediaVersion !== cell.mediaVersion) {
      const mediaVersion = this.mediaConfig.versions[cell.targetMediaVersion]

      const layerIndex = Math.floor(
        (cell.id / (mediaVersion.cols * mediaVersion.rows)) %
          mediaVersion.layers,
      )

      switch (
        this.sharedLoadedMediaVersionLayersData[cell.targetMediaVersion].data[
          layerIndex
        ]
      ) {
        case 0:
          this.mediaVersionLayerLoadRequests[cell.targetMediaVersion].add(
            layerIndex,
          )
          break
        case 2:
          cell.mediaVersion = cell.targetMediaVersion
          break
      }
    }
  }

  handleMediaVersionLayerLoadRequests() {
    if (!this.mediaConfig.enabled) return

    this.mediaVersionLayerLoadRequests.forEach((set, versionIndex) => {
      if (set.size > 0) {
        const layers = Array.from(set)
        if (this.isWorker) {
          postMessage({
            type: 'mediaVersionLayerLoadRequests',
            data: {
              versionIndex,
              layers,
            },
          })
        } else {
          this.store.get('loader').requestMediaLayerLoad(versionIndex, layers)
        }
      }
    })
  }

  initializeCells() {
    if (this.globalConfig.lattice.enabled) return
    const INITIAL_RADIUS = 10
    const INITIAL_ANGLE = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0, n = this.numCells, cell; i < n; ++i) {
      cell = this.cells[i]
      cell.index = i
      if (cell.fx != null) cell.x = cell.fx
      if (cell.fy != null) cell.y = cell.fy
      if (!isNumber(cell.x) || !isNumber(cell.y)) {
        const radius = INITIAL_RADIUS * Math.sqrt(0.5 + i)
        const angle = i * INITIAL_ANGLE
        cell.x = radius * Math.cos(angle)
        cell.y = radius * Math.sin(angle)
      }
      if (!isNumber(cell.vx) || !isNumber(cell.vy)) {
        cell.vx = cell.vy = 0
      }
    }
  }

  update() {
    this.running && this.tick()
  }

  handleLattice() {
    this.links = []
    const { rows, cols, enabled } = this.globalConfig.lattice
    if (!enabled) return

    let index = 0
    let cell
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cell = this.cells[index]
        if (!cell) break

        if (row > 0)
          this.links.push({
            source: cell,
            target: this.cells[index - cols],
            type: 'y',
          })
        if (col > 0)
          this.links.push({
            source: cell,
            target: this.cells[index - 1],
            type: 'x',
          })

        index++
      }
    }
  }
}
