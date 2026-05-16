import { mediaConfigWithUncompressedSingleVersion } from '../../config/media'
import { DEFAULT_VOROFORCE_MODE, VOROFORCE_MODE } from '../../consts'
import postFrag from './post-contours.frag'

const forceSimulationStepConfigs = {
  [VOROFORCE_MODE.preview]: {
    parameters: {
      alpha: 0.1,
      velocityDecay: 0.3,
      velocityDecayBase: 0.3,
      velocityDecayTransitionEnterMode: 0.9,
    },
    forces: {
      push: {
        strength: 0.15,
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
        cellSizeMod: 10,
      },
      origin: {
        strength: 0.2,
        latticeScale: 3,
      },
    },
  },
  [VOROFORCE_MODE.select]: {
    parameters: {
      alpha: 0.15,
      velocityDecay: 0.7,
      velocityDecayBase: 0.7,
      velocityDecayTransitionEnterMode: 0.9,
    },
    forces: {
      lattice: {
        strength: 0.1,
        yFactor: 1.5,
        xFactor: 1,
        cellSizeMod: 10,
      },
      origin: {
        strength: 0.1,
        latticeScale: 10,
      },
    },
  },
  [VOROFORCE_MODE.intro]: {},
}

export default {
  cells: 50000,
  media: mediaConfigWithUncompressedSingleVersion,
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
          // MEDIA_ROTATE: 1,
          EDGES_VISIBLE: 0,
          WEIGHTED_DIST: 1,
          X_DIST_SCALING: 1,
          // DIST_METRIC: 'customHybridDist2',
          DIST_METRIC: 'customMinkowskiDist3',
          // DIST_METRIC: 'euclideanDist',
        },
        uniforms: {
          fMediaBboxScale: { value: 0.8 },
          fBorderRoundnessMod: {
            transition: true,
            modes: {
              default: {
                value: 0.75,
              },
              [VOROFORCE_MODE.select]: {
                value: 0.25,
              },
            },
          },
          fCenterForceBulgeStrength: {
            transition: false,
            targetFactor: 0,
            initial: {
              value: 0.25,
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
                value: 1.5,
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
          fEdgeScale: { value: 1 },
          fBaseColor: {
            transition: true,
            themes: {
              default: {
                value: [0.02, 0.02, 0.02],
              },
              light: {
                value: [0.995, 0.995, 0.995],
              },
            },
          },
          iChannel0: {
            src: '/assets/rust.jpg',
            width: 512,
            height: 512,
          },
          iChannel1: {
            src: '/assets/noise.png',
            width: 256,
            height: 256,
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
