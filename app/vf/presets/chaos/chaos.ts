import { mediaConfigWithUncompressedSingleVersion } from '../../config/media'
import { DEFAULT_VOROFORCE_MODE, VOROFORCE_MODE } from '../../consts'
import postFrag from './post-chaos.frag'

const forceSimulationStepConfigs = {
  [VOROFORCE_MODE.preview]: {
    parameters: {
      alpha: 0.1,
      velocityDecay: 0.4,
      velocityDecayBase: 0.4,
      velocityDecayTransitionEnterMode: 0.7,
    },
    forces: {
      push: {
        strength: 0.1,
        centerXStretchMod: 3.2,
        yFactor: 2.25,
      },
      breathing: {
        enabled: true,
      },
      lattice: {
        strength: 0.8,
        yFactor: 1.5,
        xFactor: 1,
        maxLevelsFromPrimary: 100,
        cellSizeMod: 20,
      },
      origin: {
        strength: 0.2,
        latticeScale: 8,
      },
      requestMediaVersions: {
        enabled: true,
        v3ColLevelAdjacencyThreshold: 1,
        v3RowLevelAdjacencyThreshold: 1,
        v2ColLevelAdjacencyThreshold: 18,
        v2RowLevelAdjacencyThreshold: 18,
      },
    },
  },
  [VOROFORCE_MODE.select]: {
    parameters: {
      alpha: 0.15,
      velocityDecay: 0.7,
      velocityDecayBase: 0.7,
      velocityDecayTransitionEnterMode: 0.7,
    },
    forces: {
      push: {
        strength: 0.175,
        centerXStretchMod: 3.2,
        yFactor: 2.25,
      },
      breathing: {
        enabled: true,
      },
      lattice: {
        strength: 0.8,
        yFactor: 1.5,
        xFactor: 1,
        maxLevelsFromPrimary: 100,
        cellSizeMod: 20,
      },
      origin: {
        strength: 0.2,
        latticeScale: 8,
      },
    },
  },
  [VOROFORCE_MODE.intro]: {},
}

const controlsConfig = {
  default: {
    maxSpeed: 2,
    ease: 0.45,
  },
  modes: {
    [VOROFORCE_MODE.select]: {
      maxSpeed: 1,
      ease: 0.15,
    },
  },
}

export default {
  cells: 50000,
  media: mediaConfigWithUncompressedSingleVersion,
  filmPreview: {
    neighborOriginMod: 0.4,
    scaleMod: 1.5,
  },
  revealScreenDelay: {
    default: 1400,
  },
  controls: {
    ...controlsConfig.default,
    ...controlsConfig,
  },
  display: {
    scene: {
      main: {
        defines: {
          VORO_EDGE_BUFFER_COLOR: `
            float edge = plot.edge.x;
            float scaleMod = plot.cellScale;
            vec2 mediaUv = plot.mediaUv;
            voroEdgeBufferColor = vec4(edge, scaleMod, mediaUv.x, mediaUv.y);
          `,
          BULGE: 0,
          RIPPLE: 0,
          NOISE: 0,
          EDGES_VISIBLE: 0,
          WEIGHTED_DIST: 1,
          X_DIST_SCALING: 1,
          DIST_METRIC: 'chaosMinkowskiDist',
          POST_UNWEIGHTED_MOD_GRAYSCALE: '0.',
          POST_UNWEIGHTED_MOD_OPACITY: '0.5',
        },
        uniforms: {
          fMediaBboxScale: { value: 0.8 },
          fPixelSearchRadiusMod: {
            transition: true,
            modes: {
              default: {
                value: 1,
              },
              [VOROFORCE_MODE.select]: {
                value: 1,
              },
            },
          },
          fBorderRoundnessMod: {
            transition: true,
            modes: {
              default: {
                value: 1.5,
              },
              [VOROFORCE_MODE.select]: {
                value: 1.5,
              },
            },
          },
          fCenterForceBulgeStrength: {
            transition: false,
            targetFactor: 0,
            initial: {
              value: 0,
            },
            modes: {
              default: {
                value: 0,
              },
              [VOROFORCE_MODE.preview]: {
                value: 0.0,
              },
              [VOROFORCE_MODE.select]: {
                value: 0,
              },
            },
          },
          fCenterForceBulgeRadius: {
            transition: false,
            targetFactor: 0,
            initial: {
              value: 0,
            },
            modes: {
              default: {
                value: 0,
              },
              [VOROFORCE_MODE.preview]: {
                value: 0,
              },
              [VOROFORCE_MODE.select]: {
                value: 0,
              },
            },
          },
          fWeightOffsetScaleMod: {
            transition: true,
            modes: {
              default: {
                value: 3.5,
              },
              [VOROFORCE_MODE.select]: {
                value: 3.5,
              },
            },
          },
          fWeightOffsetScaleMediaMod: {
            value: 0.25,
          },
          fBaseXDistScale: {
            transition: false,
            modes: {
              default: {
                value: 1.5, // 0 = undefined, will use fallback
              },
              [VOROFORCE_MODE.select]: {
                value: 1.5,
              },
            },
          },
          fWeightedXDistScale: {
            transition: false,
            modes: {
              default: {
                value: 1.5, // 0 = undefined, will use fallback
              },
              [VOROFORCE_MODE.select]: {
                value: 1.5,
              },
            },
          },
          fRippleMod: {
            transition: false,
            modes: {
              default: {
                value: 0,
              },
              [VOROFORCE_MODE.select]: {
                value: 0,
              },
            },
          },
          fNoiseOctaveMod: {
            transition: false,
            modes: {
              default: {
                value: 0,
              },
              [VOROFORCE_MODE.select]: {
                value: 0,
              },
            },
          },
        },
      },
      post: {
        enabled: true,
        fragmentShader: postFrag,
        uniforms: {
          fEdge0: { value: 0.25 },
          iChannel1: {
            src: '/assets/noise.png',
            width: 256,
            height: 256,
          },
          fGrayscaleMod: {
            transition: true,
            modes: {
              default: {
                value: 1,
              },
              [VOROFORCE_MODE.select]: {
                value: 0,
              },
            },
          },
        },
      },
    },
  },
  simulation: {
    steps: {
      force: forceSimulationStepConfigs[DEFAULT_VOROFORCE_MODE],
    },
    forceStepModeConfigs: forceSimulationStepConfigs,
  },
}
