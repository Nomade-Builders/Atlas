'use client'

import { useEffect, useRef, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const DURATION = 1540
const EDGE_POINTS = 320
const BRANCH_COUNT = 26
const FILAMENT_COUNT = 34
const SPLATTER_COUNT = 58
const TAU = Math.PI * 2

type Point = { x: number; y: number }
type Branch = { path: SVGPathElement; angle: number; reach: number; bend: number; width: number; seed: number }
type Splatter = { path: SVGPathElement; angle: number; offset: number; size: number; seed: number }
type InkMask = { svg: SVGSVGElement; body: SVGPathElement; branches: Branch[]; filaments: Branch[]; splatters: Splatter[] }

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function hash2(x: number, y: number, seed: number) {
  let value = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = x - x0
  const ty = y - y0
  const fadeX = tx * tx * (3 - 2 * tx)
  const fadeY = ty * ty * (3 - 2 * ty)
  const a = hash2(x0, y0, seed)
  const b = hash2(x0 + 1, y0, seed)
  const c = hash2(x0, y0 + 1, seed)
  const d = hash2(x0 + 1, y0 + 1, seed)
  const top = a + (b - a) * fadeX
  const bottom = c + (d - c) * fadeX
  return top + (bottom - top) * fadeY
}

function fbm(x: number, y: number, seed: number) {
  let amplitude = 0.52
  let frequency = 1
  let sum = 0
  let normalization = 0
  for (let octave = 0; octave < 4; octave += 1) {
    sum += valueNoise(x * frequency, y * frequency, seed + octave * 23) * amplitude
    normalization += amplitude
    frequency *= 2.03
    amplitude *= 0.48
  }
  return sum / normalization
}

function fractalEdge(angle: number, time: number, seed: number, amplitude: number) {
  const x = Math.cos(angle)
  const y = Math.sin(angle)
  const warpX = (fbm(x * 2.1 + time * 0.12, y * 2.1 - time * 0.09, seed + 11) - 0.5) * 0.72
  const warpY = (fbm(x * 2.1 - time * 0.08, y * 2.1 + time * 0.13, seed + 37) - 0.5) * 0.72
  const warpedX = x + warpX
  const warpedY = y + warpY
  const macro = fbm(warpedX * 2.7 + time * 0.05, warpedY * 2.7 - time * 0.04, seed + 71)
  const medium = fbm(warpedX * 8.2 - time * 0.11, warpedY * 8.2 + time * 0.09, seed + 113)
  const fine = fbm(warpedX * 20 + time * 0.19, warpedY * 20 - time * 0.17, seed + 163)
  const micro = valueNoise(warpedX * 46 + time * 0.27, warpedY * 46 - time * 0.24, seed + 211)
  const displacement = (macro - 0.5) * 0.82 + (medium - 0.5) * 0.52 + (fine - 0.5) * 0.31 + (micro - 0.5) * 0.16
  return Math.max(0.24, 1 + displacement * amplitude)
}

function pathFromPoints(points: Point[]) {
  if (points.length === 0) return ''
  return `M ${points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' L ')} Z`
}

function makeBlobPath(cx: number, cy: number, radius: number, seed: number, phase: number) {
  const points = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * TAU + phase
    const jitter = 0.64 + hash2(index, seed, seed + 17) * 0.62
    return { x: cx + Math.cos(angle) * radius * jitter, y: cy + Math.sin(angle) * radius * jitter }
  })
  return pathFromPoints(points)
}

function makeMaskSvg(width: number, height: number, id: string): InkMask {
  const namespace = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(namespace, 'svg')
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('aria-hidden', 'true')
  Object.assign(svg.style, { position: 'fixed', inset: '0', width: `${width}px`, height: `${height}px`, overflow: 'visible', pointerEvents: 'none' })

  const defs = document.createElementNS(namespace, 'defs')
  const mask = document.createElementNS(namespace, 'mask')
  mask.setAttribute('id', id)
  mask.setAttribute('maskUnits', 'userSpaceOnUse')
  mask.setAttribute('maskContentUnits', 'userSpaceOnUse')
  mask.setAttribute('x', '0')
  mask.setAttribute('y', '0')
  mask.setAttribute('width', String(width))
  mask.setAttribute('height', String(height))
  mask.setAttribute('style', 'mask-type:luminance')

  const base = document.createElementNS(namespace, 'rect')
  base.setAttribute('width', String(width))
  base.setAttribute('height', String(height))
  base.setAttribute('fill', 'white')
  const ink = document.createElementNS(namespace, 'g')
  ink.setAttribute('fill', 'black')
  const body = document.createElementNS(namespace, 'path')
  body.setAttribute('fill', 'black')
  ink.append(body)

  const makeBranch = (index: number, count: number, thin: boolean): Branch => {
    const seed = index * 97 + (thin ? 907 : 313)
    const jitter = (hash2(index, 1, seed) - 0.5) * (TAU / count) * 0.72
    const path = document.createElementNS(namespace, 'path')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'black')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    ink.append(path)
    return {
      path,
      angle: (index / count) * TAU + jitter,
      reach: thin ? 0.018 + hash2(index, 3, seed) * 0.085 : 0.035 + hash2(index, 4, seed) * 0.13,
      bend: (hash2(index, 5, seed) - 0.5) * (thin ? 0.34 : 0.52),
      width: thin ? 0.55 + hash2(index, 6, seed) * 1.1 : 1.1 + hash2(index, 7, seed) * 4.1,
      seed,
    }
  }
  const branches = Array.from({ length: BRANCH_COUNT }, (_, index) => makeBranch(index, BRANCH_COUNT, false))
  const filaments = Array.from({ length: FILAMENT_COUNT }, (_, index) => makeBranch(index, FILAMENT_COUNT, true))
  const splatters = Array.from({ length: SPLATTER_COUNT }, (_, index) => {
    const seed = index * 131 + 577
    const path = document.createElementNS(namespace, 'path')
    path.setAttribute('fill', 'black')
    ink.append(path)
    return {
      path,
      angle: hash2(index, 8, seed) * TAU,
      offset: 0.008 + hash2(index, 9, seed) * 0.15,
      size: 1.2 + hash2(index, 10, seed) * 7.5,
      seed,
    }
  })

  mask.append(base, ink)
  defs.append(mask)
  svg.append(defs)
  return { svg, body, branches, filaments, splatters }
}

function copyCanvasLayers(source: HTMLElement, clone: HTMLElement) {
  const sourceCanvases = source.querySelectorAll('canvas')
  const cloneCanvases = clone.querySelectorAll('canvas')
  sourceCanvases.forEach((sourceCanvas, index) => {
    const cloneCanvas = cloneCanvases[index]
    if (!cloneCanvas) return
    try {
      cloneCanvas.width = sourceCanvas.width
      cloneCanvas.height = sourceCanvas.height
      cloneCanvas.getContext('2d')?.drawImage(sourceCanvas, 0, 0)
    } catch {
      // A canvas-backed map layer may be tainted; leave its temporary snapshot blank rather than interrupting the theme change.
    }
  })
}

function updateInk(mask: InkMask, origin: Point, maxRadius: number, progress: number, time: number, seed: number) {
  const settle = smoothstep(0.91, 1, progress)
  const growth = 1 - Math.pow(1 - progress, 2.15)
  const amplitude = 0.96 * (1 - settle * 0.92)
  const animatedRadius = 6 + (maxRadius - 6) * growth
  const finalCoverage = maxRadius * 1.065
  const radius = animatedRadius + (finalCoverage - animatedRadius) * settle
  const radiusAt = (angle: number) => radius * fractalEdge(angle, time, seed, amplitude)
  const bodyPoints = Array.from({ length: EDGE_POINTS }, (_, index) => {
    const angle = (index / EDGE_POINTS) * TAU
    const front = radiusAt(angle)
    return { x: origin.x + Math.cos(angle) * front, y: origin.y + Math.sin(angle) * front }
  })
  mask.body.setAttribute('d', pathFromPoints(bodyPoints))

  const updateBranch = (branch: Branch, filament: boolean) => {
    const angle = branch.angle + (fbm(Math.cos(branch.angle) * 3 + time * 0.12, Math.sin(branch.angle) * 3 - time * 0.1, branch.seed) - 0.5) * 0.12
    const edge = radiusAt(angle)
    const startRadius = edge * (filament ? 0.82 : 0.7)
    const reach = maxRadius * branch.reach * growth
    const endRadius = edge + reach
    const curve = branch.bend * Math.sin(time * (filament ? 1.8 : 1.25) + branch.seed)
    const startAngle = angle - curve * 0.22
    const endAngle = angle + curve
    const point = (pointAngle: number, pointRadius: number): Point => ({ x: origin.x + Math.cos(pointAngle) * pointRadius, y: origin.y + Math.sin(pointAngle) * pointRadius })
    const p0 = point(startAngle, startRadius)
    const p1 = point(angle + curve * 0.75, startRadius + (endRadius - startRadius) * 0.42)
    const p2 = point(endAngle - curve * 0.35, startRadius + (endRadius - startRadius) * 0.78)
    const p3 = point(endAngle, endRadius)
    branch.path.setAttribute('d', `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} C ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`)
    branch.path.setAttribute('stroke-width', String(branch.width * (filament ? 0.25 + growth * 0.75 : 0.22 + growth * 0.78)))
    branch.path.setAttribute('opacity', String(filament ? 0.42 + growth * 0.5 : 0.62 + growth * 0.34))
  }
  mask.branches.forEach((branch) => updateBranch(branch, false))
  mask.filaments.forEach((branch) => updateBranch(branch, true))

  mask.splatters.forEach((splatter, index) => {
    const angle = splatter.angle + (fbm(Math.cos(splatter.angle) * 4 + time * 0.15, Math.sin(splatter.angle) * 4 - time * 0.13, splatter.seed) - 0.5) * 0.1
    const front = radiusAt(angle)
    const distance = front + maxRadius * splatter.offset * growth
    const size = splatter.size * (0.12 + growth * 0.88)
    const x = origin.x + Math.cos(angle) * distance
    const y = origin.y + Math.sin(angle) * distance
    splatter.path.setAttribute('d', makeBlobPath(x, y, size, splatter.seed, time * 0.12 + index))
    splatter.path.setAttribute('opacity', String(0.35 + hash2(index, 11, splatter.seed) * 0.58))
  })
}

function persistTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
  try { localStorage.setItem('atlas-theme', theme) } catch {}
}

export function LiquidThemeToggle() {
  const [transitioning, setTransitioning] = useState(false)
  const [isLight, setIsLight] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const frameRef = useRef<number | null>(null)
  const overlayRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let preferred: 'light' | 'dark' = 'dark'
    try {
      const saved = localStorage.getItem('atlas-theme') || localStorage.getItem('nexo-theme')
      preferred = saved === 'light' || saved === 'dark'
        ? saved
        : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    } catch {
      preferred = 'dark'
    }
    document.documentElement.dataset.theme = preferred
    setIsLight(preferred === 'light')
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      overlayRef.current?.remove()
      overlayRef.current = null
    }
  }, [])

  const toggleTheme = () => {
    if (transitioning || !buttonRef.current) return
    const oldTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
    const nextTheme = oldTheme === 'dark' ? 'light' : 'dark'
    const rect = buttonRef.current.getBoundingClientRect()
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const width = window.innerWidth
    const height = window.innerHeight
    const farthest = Math.max(Math.hypot(origin.x, origin.y), Math.hypot(width - origin.x, origin.y), Math.hypot(origin.x, height - origin.y), Math.hypot(width - origin.x, height - origin.y))
    const maxRadius = farthest * 1.58
    const source = document.querySelector<HTMLElement>('.app-shell')

    if (!source || !('mask' in document.createElement('div').style || 'webkitMask' in document.createElement('div').style)) {
      persistTheme(nextTheme)
      setIsLight(nextTheme === 'light')
      return
    }

    const wrapper = document.createElement('div')
    wrapper.className = 'liquid-transition-layer'
    wrapper.setAttribute('aria-hidden', 'true')
    Object.assign(wrapper.style, { position: 'fixed', inset: '0', zIndex: '9999', pointerEvents: 'none', overflow: 'hidden' })
    const clone = source.cloneNode(true) as HTMLElement
    clone.classList.add('liquid-snapshot')
    clone.dataset.snapshotTheme = oldTheme
    clone.setAttribute('aria-hidden', 'true')
    clone.inert = true
    Object.assign(clone.style, { width: '100%', height: '100%', minHeight: '100%', pointerEvents: 'none' })
    copyCanvasLayers(source, clone)
    clone.querySelectorAll<HTMLElement>('[id]').forEach((element) => element.removeAttribute('id'))

    const maskId = `atlas-ink-mask-${Date.now()}`
    const mask = makeMaskSvg(width, height, maskId)
    clone.style.mask = `url(#${maskId})`
    clone.style.webkitMask = `url(#${maskId})`
    clone.style.maskMode = 'luminance'
    wrapper.append(mask.svg, clone)
    document.body.append(wrapper)
    overlayRef.current = wrapper

    setTransitioning(true)
    persistTheme(nextTheme)
    setIsLight(nextTheme === 'light')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      wrapper.remove()
      overlayRef.current = null
      setTransitioning(false)
      return
    }

    const startedAt = performance.now()
    const seed = (Date.now() % 100000) + Math.floor(Math.random() * 1000)
    let lastProgress = 0
    const animate = (now: number) => {
      const linear = clamp((now - startedAt) / DURATION, 0, 1)
      const elapsed = (now - startedAt) / 1000
      if (linear - lastProgress > 0.001 || linear === 1) {
        updateInk(mask, origin, maxRadius, linear, elapsed, seed)
        lastProgress = linear
      }
      if (linear < 1) frameRef.current = requestAnimationFrame(animate)
      else {
        wrapper.remove()
        overlayRef.current = null
        frameRef.current = null
        setTransitioning(false)
      }
    }
    frameRef.current = requestAnimationFrame(animate)
  }

  return (
    <button
      ref={buttonRef}
      className="icon-button theme-toggle"
      type="button"
      onClick={toggleTheme}
      disabled={transitioning}
      aria-label={isLight ? 'Ativar modo escuro' : 'Ativar modo claro'}
      aria-pressed={isLight}
      title={isLight ? 'Modo escuro' : 'Modo claro'}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
