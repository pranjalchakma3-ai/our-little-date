import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

type Point = { x: number; y: number }
type Candidate = Point & { score: number }

type RunawayOptions = {
  onAttempt?: (count: number) => void
}

type Metrics = {
  dangerRadius: number
  minPointerDistance: number
  minMovementDistance: number
  edgePadding: number
  exclusionPadding: number
}

const DEFAULT_POSITION: Point = { x: 0, y: 0 }
const NO_MESSAGES = [
  'NO 🙈',
  'Nice try 😏',
  'Nope 😂',
  'Catch me first 😝',
  'Still trying? 👀',
  'Just press YES 😭',
  "I'm too fast 💨",
  'Not today 😌',
  'Hehe, missed me 💗',
]

function getMetrics(): Metrics {
  const width = window.innerWidth
  if (width <= 480) {
    return {
      dangerRadius: 105,
      minPointerDistance: 132,
      minMovementDistance: 88,
      edgePadding: 16,
      exclusionPadding: 18,
    }
  }
  if (width <= 900) {
    return {
      dangerRadius: 126,
      minPointerDistance: 152,
      minMovementDistance: 104,
      edgePadding: 20,
      exclusionPadding: 20,
    }
  }
  return {
    dangerRadius: 150,
    minPointerDistance: 178,
    minMovementDistance: 120,
    edgePadding: 24,
    exclusionPadding: 22,
  }
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function overlaps(a: DOMRect, b: DOMRect, padding = 0) {
  return !(
    a.right + padding <= b.left ||
    a.left >= b.right + padding ||
    a.bottom + padding <= b.top ||
    a.top >= b.bottom + padding
  )
}

export function useRunawayButton({ onAttempt }: RunawayOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const yesRef = useRef<HTMLButtonElement>(null)
  const pointerRef = useRef<Point>({ x: -10_000, y: -10_000 })
  const positionRef = useRef<Point>(DEFAULT_POSITION)
  const recentPositionsRef = useRef<Point[]>([])
  const lastEscapeRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const [position, setPositionState] = useState(DEFAULT_POSITION)
  const [attemptCount, setAttemptCount] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [isEscaping, setIsEscaping] = useState(false)

  const setPosition = useCallback((next: Point) => {
    positionRef.current = next
    setPositionState(next)
  }, [])

  const findSafePosition = useCallback((pointer: Point, relaxMovement = false): Point | null => {
    const container = containerRef.current
    const button = buttonRef.current
    if (!container || !button) return null

    const containerRect = container.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    const metrics = getMetrics()
    const width = buttonRect.width
    const height = buttonRect.height
    const current = positionRef.current
    const minX = metrics.edgePadding
    const minY = metrics.edgePadding
    const maxX = Math.max(minX, containerRect.width - width - metrics.edgePadding)
    const maxY = Math.max(minY, containerRect.height - height - metrics.edgePadding)
    const pointerLocal = {
      x: pointer.x - containerRect.left,
      y: pointer.y - containerRect.top,
    }
    const currentCenter = { x: current.x + width / 2, y: current.y + height / 2 }
    const awayRaw = {
      x: currentCenter.x - pointerLocal.x,
      y: currentCenter.y - pointerLocal.y,
    }
    const awayLength = Math.hypot(awayRaw.x, awayRaw.y) || 1
    const away = { x: awayRaw.x / awayLength, y: awayRaw.y / awayLength }

    const protectedRects = Array.from(container.querySelectorAll<HTMLElement>('[data-no-zone]')).map((element) => {
      const rect = element.getBoundingClientRect()
      return new DOMRect(
        rect.left - containerRect.left,
        rect.top - containerRect.top,
        rect.width,
        rect.height,
      )
    })

    const evaluate = (point: Point, relaxed = false): Candidate | null => {
      if (point.x < minX || point.x > maxX || point.y < minY || point.y > maxY) return null

      const candidateRect = new DOMRect(point.x, point.y, width, height)
      if (protectedRects.some((rect) => overlaps(candidateRect, rect, metrics.exclusionPadding))) return null

      const center = { x: point.x + width / 2, y: point.y + height / 2 }
      const pointerDistance = distance(center, pointerLocal)
      const movementDistance = distance(center, currentCenter)
      const requiredPointerDistance = relaxed ? Math.min(78, metrics.minPointerDistance) : metrics.minPointerDistance
      const requiredMovement = relaxMovement || relaxed ? 64 : metrics.minMovementDistance

      if (pointerDistance < requiredPointerDistance || movementDistance < requiredMovement) return null
      if (!relaxed && recentPositionsRef.current.some((recent) => distance(recent, point) < 64)) return null

      const movement = { x: center.x - currentCenter.x, y: center.y - currentCenter.y }
      const movementLength = Math.hypot(movement.x, movement.y) || 1
      const directionScore = (movement.x / movementLength) * away.x + (movement.y / movementLength) * away.y
      const edgeClearance = Math.min(point.x - minX, maxX - point.x, point.y - minY, maxY - point.y)
      const protectedClearance = protectedRects.reduce((best, rect) => {
        const protectedCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        return Math.min(best, distance(center, protectedCenter))
      }, 400)
      const recentPenalty = recentPositionsRef.current.reduce(
        (penalty, recent) => penalty + Math.max(0, 110 - distance(recent, point)) * 6,
        0,
      )

      return {
        ...point,
        score:
          pointerDistance * 1.65 +
          movementDistance * 0.72 +
          directionScore * 130 +
          edgeClearance * 0.25 +
          protectedClearance * 0.2 +
          Math.random() * 18 -
          recentPenalty,
      }
    }

    const candidates: Candidate[] = []
    for (let index = 0; index < 60; index += 1) {
      const directional = index < 28
      let x: number
      let y: number
      if (directional) {
        const travel = metrics.minMovementDistance + Math.random() * Math.max(containerRect.width, containerRect.height) * 0.72
        const sideways = (Math.random() - 0.5) * 180
        x = current.x + away.x * travel - away.y * sideways
        y = current.y + away.y * travel + away.x * sideways
      } else {
        x = minX + Math.random() * Math.max(0, maxX - minX)
        y = minY + Math.random() * Math.max(0, maxY - minY)
      }
      const candidate = evaluate({
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
      })
      if (candidate) candidates.push(candidate)
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score)
      const topPool = candidates.slice(0, Math.min(4, candidates.length))
      const chosen = topPool[Math.floor(Math.random() * topPool.length)]
      return { x: Math.round(chosen.x), y: Math.round(chosen.y) }
    }

    // Deterministic grid fallback for unusually short or narrow viewports.
    const fallback: Candidate[] = []
    for (let y = minY; y <= maxY; y += 18) {
      for (let x = minX; x <= maxX; x += 18) {
        const candidate = evaluate({ x, y }, true)
        if (candidate) fallback.push(candidate)
      }
    }
    fallback.sort((a, b) => b.score - a.score)
    return fallback[0] ? { x: fallback[0].x, y: fallback[0].y } : null
  }, [])

  const escape = useCallback((pointer = pointerRef.current, countAttempt = true, force = false) => {
    const now = performance.now()
    if (!force && now - lastEscapeRef.current < 90) return

    const next = findSafePosition(pointer)
    if (!next) return

    lastEscapeRef.current = now
    recentPositionsRef.current = [positionRef.current, ...recentPositionsRef.current].slice(0, 5)
    setPosition(next)
    setIsEscaping(true)
    window.setTimeout(() => setIsEscaping(false), 150)

    if (countAttempt) {
      setAttemptCount((current) => {
        const updated = current + 1
        onAttempt?.(updated)
        return updated
      })
    }
  }, [findSafePosition, onAttempt, setPosition])

  const placeInitially = useCallback(() => {
    const container = containerRef.current
    const button = buttonRef.current
    const yes = yesRef.current
    if (!container || !button || !yes) return

    const containerRect = container.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    const yesRect = yes.getBoundingClientRect()
    const metrics = getMetrics()
    const initialGap = window.innerWidth <= 370 ? 10 : 18
    let x = yesRect.right - containerRect.left + initialGap
    let y = yesRect.top - containerRect.top + (yesRect.height - buttonRect.height) / 2
    const maxX = containerRect.width - buttonRect.width - metrics.edgePadding
    if (x > maxX) {
      x = Math.max(metrics.edgePadding, yesRect.left - containerRect.left - buttonRect.width - initialGap)
    }
    y = Math.min(containerRect.height - buttonRect.height - metrics.edgePadding, Math.max(metrics.edgePadding, y))
    setPosition({ x: Math.round(x), y: Math.round(y) })
    setIsReady(true)
  }, [setPosition])

  useLayoutEffect(() => {
    placeInitially()
  }, [placeInitially])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
      if (event.pointerType === 'touch') return
      if (frameRef.current !== null) return

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        const button = buttonRef.current
        if (!button) return
        const rect = button.getBoundingClientRect()
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        if (distance(center, pointerRef.current) < getMetrics().dangerRadius) {
          escape(pointerRef.current)
        }
      })
    }

    const onResize = () => {
      requestAnimationFrame(() => {
        const container = containerRef.current
        const button = buttonRef.current
        if (!container || !button) return
        const containerRect = container.getBoundingClientRect()
        const buttonRect = button.getBoundingClientRect()
        const metrics = getMetrics()
        const localRight = buttonRect.right - containerRect.left
        const localBottom = buttonRect.bottom - containerRect.top
        const invalid =
          buttonRect.left - containerRect.left < metrics.edgePadding ||
          buttonRect.top - containerRect.top < metrics.edgePadding ||
          localRight > containerRect.width - metrics.edgePadding ||
          localBottom > containerRect.height - metrics.edgePadding
        if (invalid) {
          const next = findSafePosition(pointerRef.current, true)
          if (next) setPosition(next)
          else placeInitially()
        }
      })
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onResize, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [escape, findSafePosition, placeInitially, setPosition])

  const evadeInteraction = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const native = event.nativeEvent
    const pointerEvent = native instanceof PointerEvent || native instanceof MouseEvent ? native : null
    const point = pointerEvent
      ? { x: pointerEvent.clientX, y: pointerEvent.clientY }
      : pointerRef.current
    pointerRef.current = point
    escape(point)
  }, [escape])

  return {
    containerRef,
    buttonRef,
    yesRef,
    position,
    attemptCount,
    isReady,
    isEscaping,
    label: NO_MESSAGES[Math.min(attemptCount, NO_MESSAGES.length - 1)],
    evadeInteraction,
  }
}
