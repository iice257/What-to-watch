import { useEffect, useMemo, useRef, useState } from 'react'

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function createDebounce<T extends (...args: any[]) => void>(
  callback: T,
  ms: number,
) {
  let timeoutId: number

  return (...args: Parameters<T>): void => {
    window.clearTimeout(timeoutId)
    timeoutId = window.setTimeout(() => callback(...args), ms)
  }
}

declare type ResizeObserverCallback = (
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  entries: any[],
  observer: ResizeObserver,
) => void
declare class ResizeObserver {
  constructor(callback: ResizeObserverCallback)
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  observe(target: Element, options?: any): void
  unobserve(target: Element): void
  disconnect(): void
  static toString(): string
}

export interface RectReadOnly {
  readonly width: number
  readonly height: number
  [key: string]: number
}

type HTMLOrSVGElement = HTMLElement | SVGElement

type Result = [
  (element: HTMLOrSVGElement | null) => void,
  RectReadOnly,
  () => void,
]

type State = {
  element: HTMLOrSVGElement | null
  resizeObserver: ResizeObserver | null
  lastBounds: RectReadOnly
}

export type Options = {
  debounce?: number
  scroll?: boolean
}

function useDimensions(
  { debounce }: Options = {
    debounce: 0,
  },
): Result {
  const ResizeObserver = window.ResizeObserver

  if (!ResizeObserver) {
    throw new Error(
      'This browser does not support ResizeObserver out of the box.',
    )
  }

  const [bounds, set] = useState<RectReadOnly>({
    width: 0,
    height: 0,
  })

  // keep all state in a ref
  const state = useRef<State>({
    element: null,
    resizeObserver: null,
    lastBounds: bounds,
  })

  const resizeDebounce = debounce ?? null

  // make sure to update state only as long as the component is truly mounted
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    return () => void (mounted.current = false)
  })

  // memoize handlers, so event-listeners know when they should update
  const [forceRefresh, resizeChange] = useMemo(() => {
    const callback = () => {
      if (!state.current.element) return
      const { width, height } =
        state.current.element.getBoundingClientRect() as unknown as RectReadOnly

      const size = {
        width,
        height,
      }

      Object.freeze(size)
      if (mounted.current && !areBoundsEqual(state.current.lastBounds, size))
        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
        set((state.current.lastBounds = size))
    }
    return [
      callback,
      resizeDebounce ? createDebounce(callback, resizeDebounce) : callback,
    ]
  }, [resizeDebounce])

  // cleanup current scroll-listeners / observers
  function removeListeners() {
    if (state.current.resizeObserver) {
      state.current.resizeObserver.disconnect()
      state.current.resizeObserver = null
    }
  }

  // add scroll-listeners / observers
  function addListeners() {
    if (!state.current.element) return
    state.current.resizeObserver = new ResizeObserver(resizeChange)
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    state.current.resizeObserver!.observe(state.current.element)
  }

  // the ref we expose to the user
  const ref = (node: HTMLOrSVGElement | null) => {
    if (!node || node === state.current.element) return
    removeListeners()
    state.current.element = node
    addListeners()
  }

  // add general event listeners
  useOnWindowResize(resizeChange)

  // respond to changes that are relevant for the listeners
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    removeListeners()
    addListeners()
  }, [scroll, resizeChange])

  // remove all listeners when the components unmounts
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => removeListeners, [])
  return [ref, bounds, forceRefresh]
}

// Adds native resize listener to window
function useOnWindowResize(onWindowResize: (event: Event) => void) {
  useEffect(() => {
    const cb = onWindowResize
    window.addEventListener('resize', cb)
    return () => void window.removeEventListener('resize', cb)
  }, [onWindowResize])
}

// Checks if element boundaries are equal
const keys: (keyof RectReadOnly)[] = ['width', 'height']
const areBoundsEqual = (a: RectReadOnly, b: RectReadOnly): boolean =>
  keys.every((key) => a[key] === b[key])

export default useDimensions
