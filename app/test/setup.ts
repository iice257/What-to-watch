import '@testing-library/jest-dom'

// Mock WebGL context for tests
const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  drawingBufferWidth: 1024,
  drawingBufferHeight: 768,
  clearColor: vi.fn(),
  clear: vi.fn(),
  createShader: vi.fn(),
  createProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  vertexAttribPointer: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  useProgram: vi.fn(),
  drawArrays: vi.fn(),
  viewport: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  getSupportedExtensions: vi.fn(() => ['WEBGL_lose_context']),
}

// Mock canvas getContext
HTMLCanvasElement.prototype.getContext = ((contextId: string) => {
  if (
    contextId === 'webgl' ||
    contextId === 'webgl2' ||
    contextId === 'experimental-webgl'
  ) {
    // biome-ignore lint/suspicious/noExplicitAny: WebGL mock requires any type
    return mockWebGLContext as any
  }
  if (contextId === '2d') {
    return {
      canvas: document.createElement('canvas'),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: 2D context mock requires any type
    } as any
  }
  return null
  // biome-ignore lint/suspicious/noExplicitAny: Canvas context mock requires any type
}) as any

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage with actual storage behavior
const localStorageData: Record<string, string> = {}

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = String(value)
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageData).forEach((key) => delete localStorageData[key])
  }),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock getUserMedia and other WebAPIs that might be used
Object.defineProperty(navigator, 'getUserMedia', {
  value: vi.fn(),
  configurable: true,
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
  },
})

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  // Clear localStorage data
  Object.keys(localStorageData).forEach((key) => delete localStorageData[key])
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})
