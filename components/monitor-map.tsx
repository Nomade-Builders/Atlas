'use client'

import L from 'leaflet'
import { useCallback, useEffect, useRef } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Popup, Tooltip, useMap } from 'react-leaflet'
import { HeatLayer as LeafletHeatLayer } from 'leaflet.heat'
import useSWR from 'swr'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import 'leaflet/dist/leaflet.css'
import { categoryColors, heatLayers, type Category, type HeatObservation, type IncidentEvent } from '@/lib/atlas-data'
import GeographicLabelLayer, { type GeographicLabelVisibility, type MunicipalityIndexRecord } from '@/components/atlas/geographic-label-layer'

type Bounds = [number, number, number, number]
type RegionProperties = { code: string; name: string; uf: string; stateName: string; bounds: Bounds; center: [number, number] }
type RegionFeature = Feature<Geometry, RegionProperties>
type RegionCollection = FeatureCollection<Geometry, RegionProperties>
type GeographicSelection = { kind: 'state' | 'municipality'; code: string; uf: string; name: string; stateName: string; center: [number, number]; bounds: Bounds }

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Falha ao carregar dados locais (${response.status}).`)
  return response.json() as Promise<T>
}

type HeatLayerInstance = L.Layer & {
  setLatLngs: (points: [number, number, number][]) => HeatLayerInstance
  _canvas?: HTMLCanvasElement
}

function HeatLayer({ category, points, opacity }: { category: HeatObservation['category']; points: HeatObservation[]; opacity: number }) {
  const map = useMap()
  const layerRef = useRef<HeatLayerInstance | null>(null)
  const definition = heatLayers.find((item) => item.category === category)
  const gradient = definition?.gradient

  useEffect(() => {
    const layer = new LeafletHeatLayer([], { radius: 44, blur: 34, maxZoom: 4, max: 1, minOpacity: 0.15, gradient: gradient ?? {}, pane: 'atlas-heat' }) as unknown as HeatLayerInstance
    layerRef.current = layer
    layer.addTo(map)
    return () => { map.removeLayer(layer); layerRef.current = null }
  }, [map, gradient])

  useEffect(() => {
    layerRef.current?.setLatLngs(points.map((point): [number, number, number] => [point.lat, point.lng, point.weight]))
  }, [points])

  useEffect(() => {
    const canvas = layerRef.current?._canvas
    if (canvas) canvas.style.opacity = String(opacity / 100)
  }, [opacity, points])

  return null
}

function HeatPane() {
  const map = useMap()
  useEffect(() => {
    const pane = map.getPane('atlas-heat') ?? map.createPane('atlas-heat')
    pane.style.zIndex = '350'
  }, [map])
  return null
}

function MapCamera({ target, zoom }: { target: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo(target, zoom, { duration: 0.8 }) }, [map, target, zoom])
  return null
}

function MapLifecycle({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const syncSize = () => map.invalidateSize({ pan: false, debounceMoveend: true })
    const reportZoom = () => onZoomChange(map.getZoom())
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncSize)
    observer?.observe(map.getContainer())
    map.on('zoomend', reportZoom)
    const resizeFrame = requestAnimationFrame(syncSize)
    return () => {
      cancelAnimationFrame(resizeFrame)
      observer?.disconnect()
      map.off('zoomend', reportZoom)
    }
  }, [map, onZoomChange])
  return null
}

function boundsFromLayer(layer: L.Layer): Bounds {
  const bounds = (layer as L.Layer & { getBounds: () => L.LatLngBounds }).getBounds()
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}

function centerOf(bounds: Bounds): [number, number] {
  return [(bounds[1] + bounds[3]) / 2, (bounds[0] + bounds[2]) / 2]
}

export type Incident = IncidentEvent
export type StateGeoJson = RegionCollection
export type MunicipalityGeoJson = RegionCollection
export type StateRecord = RegionProperties
export type { Bounds, GeographicSelection }

type MonitorMapProps = {
  incidents: IncidentEvent[]
  selectedEventId: string | null
  onSelectIncident: (event: IncidentEvent) => void
  target: [number, number]
  zoom: number
  onZoomChange: (zoom: number) => void
  stateGeoJson?: StateGeoJson
  municipalityGeoJson?: MunicipalityGeoJson
  municipalityError?: Error
  municipalityLoading: boolean
  selectedStateCode: string
  selectedMunicipalityCode: string | null
  labelVisibility: GeographicLabelVisibility
  municipalityIndex: MunicipalityIndexRecord[]
  onSelectGeography: (selection: GeographicSelection) => void
  showBoundaries: boolean
  showMunicipalities: boolean
  showIncidents: boolean
  heatVisibility: Record<HeatObservation['category'], boolean>
  heatOpacity: number
  activeCategory: 'Todas' | Category
  heatPoints: Record<HeatObservation['category'], HeatObservation[]>
}

export default function MonitorMap({ incidents, selectedEventId, onSelectIncident, target, zoom, onZoomChange, stateGeoJson, municipalityGeoJson, municipalityError, municipalityLoading, selectedStateCode, selectedMunicipalityCode, labelVisibility, municipalityIndex, onSelectGeography, showBoundaries, showMunicipalities, showIncidents, heatVisibility, heatOpacity, activeCategory, heatPoints }: MonitorMapProps) {
  const handleState = useCallback((feature: RegionFeature, layer: L.Layer) => {
    const properties = feature.properties
    const bounds = properties.bounds ?? boundsFromLayer(layer)
    layer.bindTooltip(`${properties.name} · ${properties.uf}`, { sticky: true, direction: 'center' })
    layer.on('click', () => onSelectGeography({ kind: 'state', code: properties.code, uf: properties.uf, name: properties.name, stateName: properties.stateName, center: properties.center ?? centerOf(bounds), bounds }))
  }, [onSelectGeography])
  const handleMunicipality = useCallback((feature: RegionFeature, layer: L.Layer) => {
    const properties = feature.properties
    const bounds = properties.bounds ?? boundsFromLayer(layer)
    layer.bindTooltip(`${properties.name} · ${properties.uf}`, { sticky: true, direction: 'center' })
    layer.on('click', () => onSelectGeography({ kind: 'municipality', code: properties.code, uf: properties.uf, name: properties.name, stateName: properties.stateName, center: properties.center ?? centerOf(bounds), bounds }))
  }, [onSelectGeography])

  const { data: fallbackMunicipalities, error: fallbackError, isLoading: fallbackLoading } = useSWR<MunicipalityGeoJson>(
    showMunicipalities && selectedStateCode && !municipalityGeoJson ? `/data/geography/municipalities/${selectedStateCode}.geojson` : null,
    fetchJson,
    { revalidateOnFocus: false, dedupingInterval: 60 * 60_000, errorRetryCount: 1 },
  )
  const localMunicipalities = municipalityGeoJson ?? fallbackMunicipalities
  const hasRegions = Boolean(stateGeoJson)
  const stateOptions = useCallback((feature?: RegionFeature) => {
    const properties = feature?.properties
    const selected = properties?.code === selectedStateCode
    return { color: selected ? '#c8efdc' : '#9db2ae', weight: selected ? 1.6 : 0.85, opacity: selected ? 0.95 : 0.65, fillColor: selected ? '#78cda7' : '#64847f', fillOpacity: selected ? 0.14 : 0.035 }
  }, [selectedStateCode])
  const municipalityOptions = useCallback((feature?: RegionFeature) => ({ color: feature?.properties.code === selectedMunicipalityCode ? '#f6ead3' : '#76959a', weight: feature?.properties.code === selectedMunicipalityCode ? 1.6 : 0.65, opacity: 0.8, fillColor: '#5c7f83', fillOpacity: feature?.properties.code === selectedMunicipalityCode ? 0.28 : 0.025 }), [selectedMunicipalityCode])

  return (
    <>
      <MapContainer center={[-14.2, -52.8]} zoom={4} minZoom={3} maxZoom={12} zoomControl={false} scrollWheelZoom keyboard className="monitor-map" aria-label="Mapa interativo do Brasil" preferCanvas>
        <HeatPane/>
        <MapCamera target={target} zoom={zoom}/>
        <MapLifecycle onZoomChange={onZoomChange}/>
        {heatLayers.map((layer) => {
          const categoryMatches = activeCategory === 'Todas' || activeCategory === layer.category
          return heatVisibility[layer.category] && categoryMatches ? <HeatLayer key={layer.category} category={layer.category} points={heatPoints[layer.category]} opacity={heatOpacity}/> : null
        })}
        {showBoundaries && stateGeoJson && <GeoJSON key="br-state-boundaries" data={stateGeoJson} style={stateOptions} onEachFeature={handleState}/>}
        {showBoundaries && showMunicipalities && selectedStateCode && localMunicipalities && <GeoJSON key={`br-municipalities-${selectedStateCode}`} data={localMunicipalities} style={municipalityOptions} onEachFeature={handleMunicipality}/>}
        <GeographicLabelLayer stateGeoJson={stateGeoJson} municipalityIndex={municipalityIndex} selectedStateCode={selectedStateCode} selectedMunicipalityCode={selectedMunicipalityCode} visibility={labelVisibility}/>
        {showIncidents && incidents.map((incident) => {
          const selected = selectedEventId === incident.id
          const color = categoryColors[incident.category]
          return <CircleMarker key={incident.id} center={[incident.lat, incident.lng]} radius={selected ? 10 : 6.5} pathOptions={{ color, fillColor: color, fillOpacity: selected ? 1 : 0.86, weight: selected ? 3 : 1.5 }} eventHandlers={{ click: () => onSelectIncident(incident) }}>
            <Tooltip direction="top" offset={[0, -8]}><strong>{incident.city}, {incident.state}</strong><br/>{incident.title}</Tooltip>
            <Popup><div className="map-popup"><span className="news-tag" style={{ '--incident-color': color } as React.CSSProperties}>{incident.category}</span><strong>{incident.title}</strong><span>{incident.city}, {incident.state} · {incident.severity}</span><button type="button" onClick={() => onSelectIncident(incident)}>Abrir detalhes</button></div></Popup>
          </CircleMarker>
        })}
      </MapContainer>
      {!hasRegions && <div className="map-data-status" role="status">Carregando limites locais do IBGE…</div>}
      {showMunicipalities && selectedStateCode && (municipalityLoading || fallbackLoading) && <div className="map-data-status" role="status">Carregando limites municipais…</div>}
      {(municipalityError || fallbackError) && showMunicipalities && selectedStateCode && <div className="map-data-error" role="alert">Não foi possível abrir a malha municipal local. Os limites estaduais continuam disponíveis.</div>}
    </>
  )
}
