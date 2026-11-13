'use client'

import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { Marker, useMap } from 'react-leaflet'

type Point = [number, number]
type Bounds = [number, number, number, number]
type StateFeatureCollection = {
  features: Array<{ properties: { code: string; name: string; center: Point; bounds?: Bounds } }>
}

export type MunicipalityIndexRecord = {
  code: string
  name: string
  uf: string
  stateName: string
  center: Point
  bounds: Bounds
}

export type GeographicLabelVisibility = {
  states: boolean
  capitals: boolean
  municipalities: boolean
}

type LabelKind = 'state' | 'capital' | 'municipality'
type LabelCandidate = {
  key: string
  text: string
  subtext?: string
  accessibleName: string
  position: Point
  kind: LabelKind
  stateCode: string
  priority: number
  selected: boolean
  width: number
  height: number
}
type VisibleLabel = LabelCandidate & { offsetX: number; offsetY: number; visible: boolean }
type GeographicLabelLayerProps = {
  stateGeoJson?: StateFeatureCollection
  municipalityIndex: MunicipalityIndexRecord[]
  selectedStateCode: string
  selectedMunicipalityCode: string | null
  visibility: GeographicLabelVisibility
}
type Box = { left: number; top: number; right: number; bottom: number }

const CAPITAL_CODES = new Set([
  '1100205', '1200401', '1302603', '1400100', '1501402', '1600303', '1721000',
  '2111300', '2211001', '2304400', '2408102', '2507507', '2611606', '2704302',
  '2800308', '2927408', '3106200', '3205309', '3304557', '3550308', '4106902',
  '4205407', '4314902', '5002704', '5103403', '5208707', '5300108',
])

const POPULATION_PRIORITY_CODES = new Set([
  '3550308', '3304557', '5300108', '2304400', '2927408', '3106200', '1302603',
  '4106902', '2611606', '5208707', '1501402', '4314902', '2111300', '3518800',
  '3509502',
])

const PLACEMENT_DIRECTIONS: Array<[number, number]> = [
  [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1],
]

function createPlacements(step: number, rings: number): Array<[number, number]> {
  const placements: Array<[number, number]> = [[0, 0]]
  for (let ring = 1; ring <= rings; ring += 1) {
    for (const [x, y] of PLACEMENT_DIRECTIONS) placements.push([x * step * ring, y * step * ring])
  }
  return placements
}

const STATE_PLACEMENTS = createPlacements(14, 7)
const CITY_PLACEMENTS = createPlacements(12, 5)

function overlaps(a: Box, b: Box) {
  return a.left < b.right + 2 && a.right + 2 > b.left && a.top < b.bottom + 2 && a.bottom + 2 > b.top
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function makeIcon(label: VisibleLabel) {
  const bundleClass = label.subtext ? ' geo-map-label--bundle' : ''
  const text = label.subtext ? `<span class="geo-map-label-main">${escapeHtml(label.text)}</span><small class="geo-map-label-subtext">Capital: ${escapeHtml(label.subtext)}</small>` : escapeHtml(label.text)
  const html = `<span class="geo-map-label geo-map-label--${label.kind}${bundleClass}${label.selected ? ' geo-map-label--selected' : ''}" role="img" aria-label="${escapeHtml(label.accessibleName)}">${label.kind === 'capital' ? '<i aria-hidden="true"></i>' : ''}${text}</span>`
  return L.divIcon({
    className: `geo-label-marker${label.visible ? '' : ' geo-label-marker--fading'}`,
    html,
    iconSize: [label.width, label.height],
    iconAnchor: [label.width / 2 - label.offsetX, label.height / 2 - label.offsetY],
  })
}

function GeographicLabelMarker({ label }: { label: VisibleLabel }) {
  const icon = useMemo(() => makeIcon(label), [label])
  return <Marker key={label.key} position={label.position} icon={icon} zIndexOffset={label.selected ? 1200 : label.kind === 'state' ? 650 : label.kind === 'capital' ? 450 : 150} interactive={false} keyboard={false}/>
}

function GeographicLabelLayer({ stateGeoJson, municipalityIndex, selectedStateCode, selectedMunicipalityCode, visibility }: GeographicLabelLayerProps) {
  const map = useMap()
  const [labels, setLabels] = useState<VisibleLabel[]>([])

  useEffect(() => {
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined
    const updateLabels = () => {
      if (!stateGeoJson) {
        setLabels([])
        return
      }

      const zoom = map.getZoom()
      const viewport = map.getBounds().pad(0.06)
      const mapSize = map.getSize()
      const candidates: LabelCandidate[] = []

      const capitalsByState = new Map<string, MunicipalityIndexRecord>()
      for (const municipality of municipalityIndex) {
        if (CAPITAL_CODES.has(municipality.code)) capitalsByState.set(municipality.code.slice(0, 2), municipality)
      }
      const countryView = zoom <= 4.4

      if (visibility.states) {
        for (const feature of stateGeoJson.features) {
          const properties = feature.properties
          if (zoom > 6.7 && properties.code !== selectedStateCode) continue
          const selected = properties.code === selectedStateCode
          const capital = capitalsByState.get(properties.code)
          const bundledCapital = countryView && visibility.capitals ? capital : undefined
          const width = Math.max(properties.name.length, bundledCapital?.name.length ?? 0) * 5.6 + 10
          candidates.push({
            key: `state-${properties.code}`,
            text: properties.name,
            subtext: bundledCapital?.name,
            accessibleName: bundledCapital ? `${properties.name}. Capital: ${bundledCapital.name}` : properties.name,
            position: bundledCapital?.center ?? properties.center,
            kind: 'state',
            stateCode: properties.code,
            priority: selected ? 24000 : 16000,
            selected,
            width: Math.max(34, Math.round(width)),
            height: bundledCapital ? 28 : 18,
          })
        }
      }

      for (const municipality of municipalityIndex) {
        const isCapital = CAPITAL_CODES.has(municipality.code)
        const isPopulationPriority = POPULATION_PRIORITY_CODES.has(municipality.code)
        const selected = municipality.code === selectedMunicipalityCode
        const capitalIsBundled = isCapital && countryView && visibility.states && visibility.capitals
        if (isCapital ? !visibility.capitals : !visibility.municipalities) continue
        if (capitalIsBundled && !selected) continue
        if (!isCapital && !isPopulationPriority && zoom < 5.15 && !selected) continue
        if (!isCapital && isPopulationPriority && zoom < 4.55 && !selected) continue
        if (selectedStateCode && municipality.code.slice(0, 2) !== selectedStateCode) continue
        if (!selected && !viewport.contains(L.latLng(municipality.center))) continue

        const [west, south, east, north] = municipality.bounds
        const areaScore = Math.log2(Math.max((east - west) * (north - south), 0.00001))
        const kind: LabelKind = isCapital ? 'capital' : 'municipality'
        candidates.push({
          key: `municipality-${municipality.code}`,
          text: municipality.name,
          accessibleName: `${municipality.name}, ${municipality.stateName}`,
          position: municipality.center,
          kind,
          stateCode: municipality.code.slice(0, 2),
          priority: selected ? 28000 : isCapital ? 15000 : isPopulationPriority ? 12000 : 1000 + areaScore,
          selected,
          width: Math.max(26, Math.round(municipality.name.length * 5.45 + (isCapital ? 15 : 8))),
          height: 16,
        })
      }

      const occupied: Box[] = []
      const nextLabels: VisibleLabel[] = []
      candidates.sort((a, b) => b.priority - a.priority || a.text.localeCompare(b.text, 'pt-BR'))

      for (const candidate of candidates) {
        const point = map.latLngToContainerPoint(candidate.position)
        if (point.x < -120 || point.x > mapSize.x + 120 || point.y < -40 || point.y > mapSize.y + 40) continue
        const placements = candidate.kind === 'state' ? STATE_PLACEMENTS : CITY_PLACEMENTS
        let placement: [number, number] | undefined

        for (const [offsetX, offsetY] of placements) {
          const box = {
            left: point.x + offsetX - candidate.width / 2,
            top: point.y + offsetY - candidate.height / 2,
            right: point.x + offsetX + candidate.width / 2,
            bottom: point.y + offsetY + candidate.height / 2,
          }
          if (box.left < -120 || box.right > mapSize.x + 120 || box.top < -40 || box.bottom > mapSize.y + 40) continue
          if (occupied.some((placed) => overlaps(box, placed))) continue
          occupied.push(box)
          placement = [offsetX, offsetY]
          break
        }

        if (!placement) continue
        nextLabels.push({ ...candidate, offsetX: placement[0], offsetY: placement[1], visible: true })
      }

      setLabels((current) => {
        const nextKeys = new Set(nextLabels.map((label) => label.key))
        const fadingLabels = current.filter((label) => label.visible && !nextKeys.has(label.key)).map((label) => ({ ...label, visible: false }))
        const continuingFade = current.filter((label) => !label.visible && !nextKeys.has(label.key))
        return [...nextLabels, ...fadingLabels, ...continuingFade]
      })
      if (cleanupTimer) clearTimeout(cleanupTimer)
      cleanupTimer = setTimeout(() => setLabels((current) => current.filter((label) => label.visible)), 190)
    }

    updateLabels()
    map.on('moveend zoomend', updateLabels)
    return () => {
      map.off('moveend zoomend', updateLabels)
      if (cleanupTimer) clearTimeout(cleanupTimer)
    }
  }, [map, municipalityIndex, selectedMunicipalityCode, selectedStateCode, stateGeoJson, visibility])

  return <>{labels.map((label) => <GeographicLabelMarker key={label.key} label={label}/>)}</>
}

export default GeographicLabelLayer
