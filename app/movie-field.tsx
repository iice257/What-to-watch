import { useEffect, useRef } from 'react'
import appConfig from './config'
import { store } from './store'
import { VOROFORCE_MODE } from './vf'
import {
  FILM_BATCH_SIZE,
  Film,
  type FilmBatch,
  type FilmData,
  type MovieFilters,
} from './vf/utils'

const BATCH_COUNT = 5
const MAX_MOVIES = 10000
const BASE_CARD_WIDTH = 84
const CARD_ASPECT = 2 / 3
const CELL_GAP = 8
const MIN_ZOOM = 0.42
const MAX_ZOOM = 2.7
const POSTER_LOAD_MARGIN = 220
const FIRST_REVEAL_DELAY_MS = 250

type MovieNode = {
  id: number
  film: Film
  x: number
  y: number
  jitter: number
  pulse: number
}

type SelectionEntry = {
  data: FilmData
  batchIndex: number
  batchItemIndex: number
  film: Film
  rank: number
}

type NavigateDetail = number | { id: number; film?: Film }

type Camera = {
  x: number
  y: number
  zoom: number
  targetX: number
  targetY: number
  targetZoom: number
}

const clamp = (min: number, max: number, value: number) =>
  Math.min(max, Math.max(min, value))

const hash = (value: number) => {
  let x = Math.imul(value ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967295
}

const isEnglishishTitle = (title: string) => /^[\x20-\x7e]+$/.test(title)

const normalizeFilmTitle = (data: FilmData) => {
  const title = String(data.title ?? '').trim()
  return title || 'Untitled'
}

const getRegions = (data: FilmData) =>
  String(data.production_countries ?? '')
    .split(',')
    .map((region) => region.trim())
    .filter(Boolean)

const matchesLength = (film: Film, length?: MovieFilters['length']) => {
  if (!length) return true
  if (!film.runtime) return false
  if (length === 'short') return film.runtime < 90
  if (length === 'long') return film.runtime >= 150
  return film.runtime >= 90 && film.runtime < 150
}

const matchesFilters = (film: Film, data: FilmData, filters?: MovieFilters) => {
  if (!filters) return true
  if (filters.genre && !film.genres?.includes(filters.genre)) return false
  if (filters.yearFrom && film.year < filters.yearFrom) return false
  if (filters.yearTo && film.year > filters.yearTo) return false
  if (!matchesLength(film, filters.length)) return false
  if (filters.region && !getRegions(data).includes(filters.region)) return false
  return true
}

const loadAllFilmBatches = async () => {
  const filmInfoBaseUrl = import.meta.env.VITE_FILM_INFO_BASE_URL ?? '/json'
  const batches = await Promise.all(
    Array.from({ length: BATCH_COUNT }, async (_, batchIndex) => {
      const response = await fetch(`${filmInfoBaseUrl}/${batchIndex}.json`)
      if (!response.ok) throw new Error(`Failed to load ${batchIndex}.json`)
      return (await response.json()) as FilmBatch
    }),
  )
  return batches
}

const makeSelection = (
  batches: FilmBatch[],
  filters: MovieFilters | undefined,
  seed: number,
): SelectionEntry[] => {
  const filtered = batches
    .flatMap((batch, batchIndex) =>
      batch.map((data, batchItemIndex) => ({
        data,
        batchIndex,
        batchItemIndex,
        film: new Film({ ...data, title: normalizeFilmTitle(data) }),
      })),
    )
    .filter(({ data, film }) => matchesFilters(film, data, filters))
    .filter(({ film }) => filters?.region || isEnglishishTitle(film.title))

  const ranked = filtered
    .map((entry) => ({
      ...entry,
      rank: hash(Number(entry.film.tmdbId) + seed * 1000003),
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_MOVIES)

  return ranked
}

const layoutNodes = (selection: SelectionEntry[], width: number) => {
  const cardWidth = BASE_CARD_WIDTH
  const cardHeight = cardWidth / CARD_ASPECT
  const columnWidth = cardWidth + CELL_GAP
  const rowHeight = cardHeight + CELL_GAP
  const columns = Math.max(12, Math.ceil(Math.sqrt(selection.length * 1.72)))
  const rows = Math.ceil(selection.length / columns)
  const worldWidth = columns * columnWidth
  const worldHeight = rows * rowHeight

  const nodes = selection.map(({ film, batchIndex, batchItemIndex }, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const cellId = batchIndex * FILM_BATCH_SIZE + batchItemIndex
    const jx = (hash(cellId + 11) - 0.5) * CELL_GAP * 1.3
    const jy = (hash(cellId + 29) - 0.5) * CELL_GAP * 1.8
    return {
      id: film.tmdbId,
      film,
      x: col * columnWidth - worldWidth / 2 + jx,
      y: row * rowHeight - worldHeight / 2 + jy,
      jitter: hash(cellId + 47),
      pulse: hash(cellId + 83) * Math.PI * 2,
    }
  })

  return {
    nodes,
    bounds: {
      width: worldWidth,
      height: worldHeight,
      cardWidth,
      cardHeight,
      initialZoom: clamp(0.48, 1.1, (width / Math.max(worldWidth, 1)) * 1.8),
    },
  }
}

const getNodeAt = (
  nodes: MovieNode[],
  camera: Camera,
  x: number,
  y: number,
  rect: DOMRect,
  cardWidth: number,
  cardHeight: number,
) => {
  const worldX = (x - rect.width / 2) / camera.zoom + camera.x
  const worldY = (y - rect.height / 2) / camera.zoom + camera.y
  let best: MovieNode | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  for (const node of nodes) {
    const dx = Math.abs(worldX - node.x)
    const dy = Math.abs(worldY - node.y)
    if (dx <= cardWidth * 0.72 && dy <= cardHeight * 0.62) {
      const distance = dx + dy
      if (distance < bestDistance) {
        best = node
        bestDistance = distance
      }
    }
  }
  return best
}

export function MovieField() {
  const requestRef = useRef<number>(0)

  useEffect(() => {
    let disposed = false
    const container = document.getElementById('voroforce')
    if (!container) return

    const canvas =
      container.getElementsByTagName('canvas')[0] ??
      document.createElement('canvas')
    if (!canvas.parentElement) container.appendChild(canvas)
    canvas.style.pointerEvents = 'auto'
    canvas.style.touchAction = 'none'

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    container.classList.add('vf-scene-ready')
    container.style.opacity = '1'
    container.style.pointerEvents = 'auto'
    store.setState({
      container,
      mode: VOROFORCE_MODE.preview,
      voroforceMediaPreloaded: true,
      playedIntro: true,
    })

    let nodes: MovieNode[] = []
    let currentSelection: SelectionEntry[] = []
    let focused: MovieNode | undefined
    let selected: MovieNode | undefined
    let bounds = {
      width: 1,
      height: 1,
      cardWidth: BASE_CARD_WIDTH,
      cardHeight: BASE_CARD_WIDTH / CARD_ASPECT,
      initialZoom: 1,
    }
    const imageCache = new Map<string, HTMLImageElement>()
    const failedImages = new Set<string>()
    const camera: Camera = {
      x: 0,
      y: 0,
      zoom: 0.8,
      targetX: 0,
      targetY: 0,
      targetZoom: 0.8,
    }
    const pointer = {
      down: false,
      dragged: false,
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
    }

    const loadImage = (path: string, baseUrl = appConfig.posterBaseUrl) => {
      if (!path) return
      const url = `${baseUrl}${path}`
      if (failedImages.has(url)) return
      const cached = imageCache.get(url)
      if (cached) return cached
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.decoding = 'async'
      image.src = url
      image.onload = () => {
        if (!disposed) draw(performance.now())
      }
      image.onerror = () => {
        failedImages.add(url)
      }
      imageCache.set(url, image)
      return image
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = container.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const centerOnNode = (node: MovieNode, zoom = 1.55) => {
      camera.targetX = node.x
      camera.targetY = node.y
      camera.targetZoom = clamp(MIN_ZOOM, MAX_ZOOM, zoom)
    }

    const selectNode = (node?: MovieNode) => {
      selected = node
      if (node) {
        focused = node
        store.getState().setFilm(node.film)
        store.setState({ mode: VOROFORCE_MODE.select })
        centerOnNode(node, 1.78)
      } else {
        store.setState({ mode: VOROFORCE_MODE.preview })
      }
    }

    const focusNode = (node?: MovieNode) => {
      if (selected || focused?.id === node?.id) return
      focused = node
      store.getState().setFilm(node?.film)
    }

    const forceFocusNode = (node?: MovieNode) => {
      focused = node
      store.getState().setFilm(node?.film)
    }

    const reshuffle = async () => {
      const batches = await loadAllFilmBatches()
      if (disposed) return
      const filmBatches = store.getState().filmBatches
      batches.forEach((batch, index) => filmBatches.set(index, batch))
      const filters = store.getState().userConfig.movieFilters
      const seed = Date.now() % 100000
      currentSelection = makeSelection(batches, filters, seed)
      const layout = layoutNodes(currentSelection, container.clientWidth)
      nodes = layout.nodes
      bounds = layout.bounds
      camera.x = camera.targetX = 0
      camera.y = camera.targetY = 0
      camera.zoom = camera.targetZoom = bounds.initialZoom
      focused = nodes[0]
      store.getState().setFilm(focused?.film)
      window.setTimeout(() => {
        if (disposed) return
        container.classList.add('vf-scene-ready')
        container.style.opacity = '1'
      }, FIRST_REVEAL_DELAY_MS)
    }

    const drawCard = (
      node: MovieNode,
      screenX: number,
      screenY: number,
      width: number,
      height: number,
      time: number,
    ) => {
      const isFocused = focused?.id === node.id
      const isSelected = selected?.id === node.id
      const pulse = isFocused || isSelected ? 1 : 0
      const lift = pulse * (8 + Math.sin(time / 260 + node.pulse) * 2)
      const scale = 1 + pulse * 0.18
      const w = width * scale
      const h = height * scale
      const x = screenX - w / 2
      const y = screenY - h / 2 - lift
      const radius = isFocused || isSelected ? 8 : 4
      const image =
        loadImage(node.film.poster) ??
        loadImage(node.film.backdrop, appConfig.backdropBaseUrl)

      ctx.save()
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, radius)
      ctx.clip()
      ctx.fillStyle = '#111'
      ctx.fillRect(x, y, w, h)

      if (image?.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, x, y, w, h)
      } else {
        const hue = Math.floor(node.jitter * 360)
        const gradient = ctx.createLinearGradient(x, y, x + w, y + h)
        gradient.addColorStop(0, `hsl(${hue} 45% 18%)`)
        gradient.addColorStop(1, `hsl(${(hue + 55) % 360} 70% 8%)`)
        ctx.fillStyle = gradient
        ctx.fillRect(x, y, w, h)
      }

      ctx.restore()

      ctx.strokeStyle = isSelected
        ? 'rgba(255,255,255,0.88)'
        : isFocused
          ? 'rgba(255,255,255,0.58)'
          : 'rgba(255,255,255,0.12)'
      ctx.lineWidth = isSelected ? 2 : 1
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, radius)
      ctx.stroke()
    }

    const draw = (time: number) => {
      const rect = container.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.fillStyle = '#050507'
      ctx.fillRect(0, 0, rect.width, rect.height)

      camera.x += (camera.targetX - camera.x) * 0.12
      camera.y += (camera.targetY - camera.y) * 0.12
      camera.zoom += (camera.targetZoom - camera.zoom) * 0.1

      const cardW = bounds.cardWidth * camera.zoom
      const cardH = bounds.cardHeight * camera.zoom

      ctx.save()
      ctx.globalAlpha = 0.18
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 1
      for (let i = 0; i < nodes.length; i += 7) {
        const node = nodes[i]
        const x = (node.x - camera.x) * camera.zoom + rect.width / 2
        const y = (node.y - camera.y) * camera.zoom + rect.height / 2
        if (
          x < -100 ||
          y < -100 ||
          x > rect.width + 100 ||
          y > rect.height + 100
        ) {
          continue
        }
        ctx.strokeRect(x - cardW / 2, y - cardH / 2, cardW, cardH)
      }
      ctx.restore()

      for (const node of nodes) {
        const x = (node.x - camera.x) * camera.zoom + rect.width / 2
        const y = (node.y - camera.y) * camera.zoom + rect.height / 2
        if (
          x < -POSTER_LOAD_MARGIN ||
          y < -POSTER_LOAD_MARGIN ||
          x > rect.width + POSTER_LOAD_MARGIN ||
          y > rect.height + POSTER_LOAD_MARGIN
        ) {
          continue
        }
        drawCard(node, x, y, cardW, cardH, time)
      }

      const gradient = ctx.createRadialGradient(
        rect.width / 2,
        rect.height / 2,
        Math.min(rect.width, rect.height) * 0.15,
        rect.width / 2,
        rect.height / 2,
        Math.max(rect.width, rect.height) * 0.72,
      )
      gradient.addColorStop(0, 'rgba(0,0,0,0)')
      gradient.addColorStop(1, 'rgba(0,0,0,0.28)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, rect.width, rect.height)
    }

    const tick = (time: number) => {
      if (disposed) return
      draw(time)
      requestRef.current = window.requestAnimationFrame(tick)
    }

    const onPointerDown = (event: PointerEvent) => {
      pointer.down = true
      pointer.dragged = false
      pointer.x = pointer.lastX = event.clientX
      pointer.y = pointer.lastY = event.clientY
      canvas.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (pointer.down) {
        const dx = event.clientX - pointer.lastX
        const dy = event.clientY - pointer.lastY
        if (
          Math.abs(event.clientX - pointer.x) +
            Math.abs(event.clientY - pointer.y) >
          5
        ) {
          pointer.dragged = true
        }
        camera.targetX -= dx / camera.zoom
        camera.targetY -= dy / camera.zoom
        pointer.lastX = event.clientX
        pointer.lastY = event.clientY
        return
      }
      const node = getNodeAt(
        nodes,
        camera,
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect,
        bounds.cardWidth,
        bounds.cardHeight,
      )
      focusNode(node)
    }

    const onPointerUp = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointer.down = false
      canvas.releasePointerCapture(event.pointerId)
      if (pointer.dragged) return
      const node = getNodeAt(
        nodes,
        camera,
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect,
        bounds.cardWidth,
        bounds.cardHeight,
      )
      if (node) {
        selectNode(selected?.id === node.id ? undefined : node)
      } else {
        selectNode(undefined)
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = Math.exp(-event.deltaY * 0.001)
      camera.targetZoom = clamp(MIN_ZOOM, MAX_ZOOM, camera.targetZoom * factor)
    }

    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<NavigateDetail>).detail
      const id = typeof detail === 'number' ? detail : detail.id
      let target = nodes.find((node) => node.id === id)
      const detailFilm = typeof detail === 'number' ? undefined : detail.film
      if (!target && detailFilm && nodes.length) {
        const origin = selected ?? focused ?? nodes[0]
        const farNodes = origin
          ? [...nodes]
              .sort((a, b) => {
                const aDistance = (a.x - origin.x) ** 2 + (a.y - origin.y) ** 2
                const bDistance = (b.x - origin.x) ** 2 + (b.y - origin.y) ** 2
                return bDistance - aDistance
              })
              .slice(0, Math.max(1, Math.floor(nodes.length * 0.25)))
          : nodes
        target =
          farNodes[Math.floor(Math.random() * farNodes.length)] ?? nodes[0]
        target.id = detailFilm.tmdbId
        target.film = detailFilm
      }
      if (!target) return
      selectNode(undefined)
      forceFocusNode(target)
      centerOnNode(target, 1.6)
    }

    const onResize = () => {
      resize()
      const layout = layoutNodes(currentSelection, container.clientWidth)
      if (layout.nodes.length) {
        nodes = layout.nodes
        bounds = layout.bounds
      }
    }

    resize()
    void reshuffle()
    requestRef.current = window.requestAnimationFrame(tick)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)
    window.addEventListener('movie-field:navigate', onNavigate)

    return () => {
      disposed = true
      window.cancelAnimationFrame(requestRef.current)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('movie-field:navigate', onNavigate)
    }
  }, [])

  return null
}
