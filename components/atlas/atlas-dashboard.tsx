'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { Activity, ChevronRight, Crosshair, Maximize2, Minus, Pause, Play, Plus, RotateCcw, X, PanelLeftOpen, PanelRightOpen, MapPin } from 'lucide-react'
import { ExplorationSidebar } from '@/components/atlas/exploration-sidebar'
import { LayerControl } from '@/components/atlas/layer-control'
import { NotificationCenter } from '@/components/atlas/notification-center'
import { RegionPanel } from '@/components/atlas/region-panel'
import { LiquidThemeToggle } from '@/components/theme/liquid-theme-toggle'
import { DEMO_END_MS, categoryOptions, categoryColors, heatLayers, incidents, periodOptions, severityWeight, formatDemoDate, formatDemoTime, normaliseText, type Category, type EventStatus, type HeatObservation, type IncidentEvent, type PeriodId, type Severity } from '@/lib/atlas-data'
import type { MapSearchResult } from '@/components/atlas/search-box'
import type { Bounds, GeographicSelection, MunicipalityGeoJson, StateGeoJson, StateRecord } from '@/components/monitor-map'
import type { GeographicLabelVisibility, MunicipalityIndexRecord } from '@/components/atlas/geographic-label-layer'

const MonitorMap = dynamic(() => import('@/components/monitor-map'), { ssr: false, loading: () => <div className="map-loading" role="status">Preparando mapa…</div> })

const initialCenter: [number, number] = [-14.2, -52.8]
const defaultHeatVisibility: Record<HeatObservation['category'], boolean> = { Chuva: true, Calor: false, Alagamentos: false, Incêndios: false, Fumaça: false, Seca: false }
const defaultGeographicLabelVisibility: GeographicLabelVisibility = { states: true, capitals: true, municipalities: true }
const geographicLabelStorageKey = 'atlas-geographic-label-visibility-v1'
const periodDuration = (period: PeriodId) => periodOptions.find((item) => item.id === period)?.durationMs ?? 24 * 60 * 60_000
const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Falha ao carregar dados locais (${response.status}).`)
  return response.json() as Promise<T>
}

function fitZoom(bounds: Bounds, kind: 'state' | 'municipality') {
  const span = Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1])
  const minimum = kind === 'state' ? 5.1 : 8.1
  const maximum = kind === 'state' ? 9.4 : 11.3
  return Math.min(maximum, Math.max(minimum, Math.log2(360 / Math.max(span, 0.025)) + 0.8))
}

function tickLabel(timestamp: number, period: PeriodId) {
  if (period === '7d') return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short' }).format(timestamp).replace('.', '').toUpperCase()
  return formatDemoTime(timestamp)
}

type RegionState = { stateCode: string; uf: string; stateName: string; municipalityCode: string | null; municipalityName: string | null }

export function AtlasDashboard() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'Todas' | Category>('Todas')
  const [severity, setSeverity] = useState<'Todas' | Severity>('Todas')
  const [status, setStatus] = useState<'Todos' | EventStatus>('Todos')
  const [period, setPeriod] = useState<PeriodId>('24h')
  const [timelineProgress, setTimelineProgress] = useState(100)
  const [isPlaying, setIsPlaying] = useState(false)
  const [region, setRegion] = useState<RegionState | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [mapTarget, setMapTarget] = useState<[number, number]>(initialCenter)
  const [mapZoom, setMapZoom] = useState(4)
  const [showIncidents, setShowIncidents] = useState(true)
  const [showBoundaries, setShowBoundaries] = useState(true)
  const [showMunicipalities, setShowMunicipalities] = useState(true)
  const [geographicLabelVisibility, setGeographicLabelVisibility] = useState(defaultGeographicLabelVisibility)
  const [labelPreferencesLoaded, setLabelPreferencesLoaded] = useState(false)
  const [heatVisibility, setHeatVisibility] = useState(defaultHeatVisibility)
  const [heatOpacity, setHeatOpacity] = useState(58)
  const [showAllEvents, setShowAllEvents] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [leftMobileOpen, setLeftMobileOpen] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [rightMobileOpen, setRightMobileOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadNotificationIds, setUnreadNotificationIds] = useState<Set<string>>(() => new Set(incidents.filter((item) => item.severity === 'Crítico' || item.severity === 'Alto').map((item) => item.id)))

  const { data: stateGeoJson, error: stateGeoError, mutate: retryStateGeo } = useSWR<StateGeoJson>('/data/geography/states.geojson', fetchJson, { revalidateOnFocus: false, dedupingInterval: 60 * 60_000, errorRetryCount: 1 })
  const { data: stateRecords = [] } = useSWR<StateRecord[]>('/data/geography/states-index.json', fetchJson, { revalidateOnFocus: false, dedupingInterval: 60 * 60_000, errorRetryCount: 1 })
  const municipalityIndexKey = '/data/geography/municipalities-index.json'
  const { data: municipalityIndex = [], isLoading: municipalityIndexLoading } = useSWR<MunicipalityIndexRecord[]>(municipalityIndexKey, fetchJson, { revalidateOnFocus: false, dedupingInterval: 60 * 60_000, errorRetryCount: 1 })

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(geographicLabelStorageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<GeographicLabelVisibility>
        setGeographicLabelVisibility({
          states: typeof parsed.states === 'boolean' ? parsed.states : true,
          capitals: typeof parsed.capitals === 'boolean' ? parsed.capitals : true,
          municipalities: typeof parsed.municipalities === 'boolean' ? parsed.municipalities : true,
        })
      }
    } catch {
      // Storage may be disabled; keep this visit's preference in memory.
    } finally {
      setLabelPreferencesLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!labelPreferencesLoaded) return
    try {
      window.localStorage.setItem(geographicLabelStorageKey, JSON.stringify(geographicLabelVisibility))
    } catch {
      // Storage may be disabled; keep this visit's preference in memory.
    }
  }, [geographicLabelVisibility, labelPreferencesLoaded])

  const toggleGeographicLabel = useCallback((key: keyof GeographicLabelVisibility) => {
    setGeographicLabelVisibility((current) => ({ ...current, [key]: !current[key] }))
  }, [])
  const toggleAllGeographicLabels = useCallback(() => {
    setGeographicLabelVisibility((current) => {
      const nextVisible = !Object.values(current).every(Boolean)
      return { states: nextVisible, capitals: nextVisible, municipalities: nextVisible }
    })
  }, [])

  const municipalityGeometryKey = region?.stateCode && showMunicipalities ? `/data/geography/municipalities/${region.stateCode}.geojson` : null
  const { data: municipalityGeoJson, error: municipalityError, isLoading: municipalityLoading } = useSWR<MunicipalityGeoJson>(municipalityGeometryKey, fetchJson, { revalidateOnFocus: false, dedupingInterval: 60 * 60_000, errorRetryCount: 1 })

  const duration = periodDuration(period)
  const periodStart = DEMO_END_MS - duration
  const currentTime = Math.round(periodStart + (duration * timelineProgress) / 100)
  const selectedEvent = incidents.find((item) => item.id === selectedEventId) ?? null
  const normalizedQuery = normaliseText(query)

  const periodEvents = useMemo(() => incidents.filter((item) => {
    const timestamp = Date.parse(item.observedAt)
    if (timestamp < periodStart || timestamp > DEMO_END_MS) return false
    if (region && item.state !== region.uf) return false
    if (region?.municipalityCode && item.municipalityCode !== region.municipalityCode) return false
    if (category !== 'Todas' && item.category !== category) return false
    if (severity !== 'Todas' && item.severity !== severity) return false
    if (status !== 'Todos' && item.status !== status) return false
    if (normalizedQuery && !normaliseText(`${item.title} ${item.description} ${item.city} ${item.stateName} ${item.state} ${item.category} ${item.severity} ${item.status}`).includes(normalizedQuery)) return false
    return true
  }).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt)), [periodStart, region, category, severity, status, normalizedQuery])
  const visibleEvents = useMemo(() => periodEvents.filter((item) => Date.parse(item.observedAt) <= currentTime), [periodEvents, currentTime])
  const previousEvents = useMemo(() => incidents.filter((item) => {
    const timestamp = Date.parse(item.observedAt)
    if (timestamp < periodStart - duration || timestamp >= periodStart) return false
    if (region && item.state !== region.uf) return false
    if (region?.municipalityCode && item.municipalityCode !== region.municipalityCode) return false
    if (category !== 'Todas' && item.category !== category) return false
    if (severity !== 'Todas' && item.severity !== severity) return false
    if (status !== 'Todos' && item.status !== status) return false
    return true
  }), [periodStart, duration, region, category, severity, status])

  const timelineBars = useMemo(() => Array.from({ length: 48 }, (_, index) => {
    const start = periodStart + (duration * index) / 48
    const end = periodStart + (duration * (index + 1)) / 48
    return periodEvents.filter((item) => {
      const timestamp = Date.parse(item.observedAt)
      return timestamp >= start && timestamp < end
    }).length
  }), [periodEvents, periodStart, duration])
  const highestTimelineBar = Math.max(1, ...timelineBars)

  const heatPoints = useMemo(() => {
    const groups: Record<HeatObservation['category'], HeatObservation[]> = { Chuva: [], Calor: [], Alagamentos: [], Incêndios: [], Fumaça: [], Seca: [] }
    for (const layer of heatLayers) {
      if (category !== 'Todas' && layer.category !== category) continue
      groups[layer.category] = layer.observations.filter((point) => {
        const timestamp = Date.parse(point.observedAt)
        if (timestamp < periodStart || timestamp > currentTime) return false
        if (region && point.uf !== region.uf) return false
        if (severity !== 'Todas' && point.severity !== severity) return false
        return true
      })
    }
    return groups
  }, [category, currentTime, periodStart, region, severity])

  const searchResults = useMemo<MapSearchResult[]>(() => {
    if (!normalizedQuery) return []
    const eventResults: MapSearchResult[] = visibleEvents.filter((item) => normaliseText(`${item.title} ${item.city} ${item.stateName} ${item.category} ${item.severity}`).includes(normalizedQuery)).slice(0, 3).map((item) => ({ key: `event-${item.id}`, kind: 'event', label: item.title, detail: `${item.city}, ${item.state} · ${item.category} · ${item.severity}`, id: item.id, uf: item.state, stateName: item.stateName, center: [item.lat, item.lng] }))
    const stateResults: MapSearchResult[] = stateRecords.filter((item) => normaliseText(`${item.name} ${item.uf}`).includes(normalizedQuery)).slice(0, 2).map((item) => ({ key: `state-${item.code}`, kind: 'state', label: item.name, detail: `Unidade federativa · ${item.uf}`, id: item.code, uf: item.uf, stateName: item.name, center: item.center, bounds: item.bounds }))
    const municipalityResults: MapSearchResult[] = municipalityIndex.filter((item) => normaliseText(`${item.name} ${item.uf} ${item.stateName}`).includes(normalizedQuery)).slice(0, 5).map((item) => ({ key: `municipality-${item.code}`, kind: 'municipality', label: item.name, detail: `${item.stateName} · ${item.uf}`, id: item.code, uf: item.uf, stateName: item.stateName, center: item.center, bounds: item.bounds }))
    return [...eventResults, ...stateResults, ...municipalityResults].slice(0, 9)
  }, [normalizedQuery, visibleEvents, stateRecords, municipalityIndex])

  const periodTicks = useMemo(() => [0, 25, 50, 75, 100].map((value) => ({ value, label: tickLabel(periodStart + (duration * value) / 100, period) })), [periodStart, duration, period])
  const activeHeatDefinitions = heatLayers.filter((item) => heatVisibility[item.category] && (category === 'Todas' || category === item.category))
  const notificationEvents = visibleEvents.filter((item) => item.severity === 'Crítico' || item.severity === 'Alto').slice(0, 8)

  useEffect(() => {
    if (!isPlaying) return
    const interval = window.setInterval(() => setTimelineProgress((value) => Math.min(100, value + 1)), 115)
    return () => window.clearInterval(interval)
  }, [isPlaying])
  useEffect(() => { if (isPlaying && timelineProgress >= 100) setIsPlaying(false) }, [isPlaying, timelineProgress])
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.getElementById('atlas-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const onZoomChange = useCallback((nextZoom: number) => setMapZoom((current) => Math.abs(current - nextZoom) < 0.05 ? current : nextZoom), [])
  const changePeriod = useCallback((nextPeriod: PeriodId) => { setPeriod(nextPeriod); setTimelineProgress(100); setIsPlaying(false) }, [])

  const focusState = useCallback((item: StateRecord) => {
    setRegion({ stateCode: item.code, uf: item.uf, stateName: item.name, municipalityCode: null, municipalityName: null })
    setSelectedEventId(null)
    setMapTarget(item.center)
    setMapZoom(fitZoom(item.bounds, 'state'))
    setRightCollapsed(false)
    setRightMobileOpen(true)
    setLeftMobileOpen(false)
  }, [])

  const handleGeographySelect = useCallback((selection: GeographicSelection) => {
    const stateCode = selection.kind === 'state' ? selection.code : selection.code.slice(0, 2)
    setRegion({ stateCode, uf: selection.uf, stateName: selection.stateName, municipalityCode: selection.kind === 'municipality' ? selection.code : null, municipalityName: selection.kind === 'municipality' ? selection.name : null })
    setSelectedEventId(null)
    setMapTarget(selection.center)
    setMapZoom(fitZoom(selection.bounds, selection.kind))
    setRightCollapsed(false)
    setRightMobileOpen(true)
  }, [])

  const selectEvent = useCallback((item: IncidentEvent) => {
    setRegion({ stateCode: item.municipalityCode.slice(0, 2), uf: item.state, stateName: item.stateName, municipalityCode: item.municipalityCode, municipalityName: item.city })
    setSelectedEventId(item.id)
    setMapTarget([item.lat, item.lng])
    setMapZoom(Math.max(9.2, mapZoom))
    setRightCollapsed(false)
    setRightMobileOpen(true)
    setLeftMobileOpen(false)
  }, [mapZoom])

  const selectSearchResult = useCallback((result: MapSearchResult) => {
    setQuery('')
    if (result.kind === 'event') {
      const item = incidents.find((event) => event.id === result.id)
      if (item) selectEvent(item)
      return
    }
    if (result.kind === 'state') {
      const item = stateRecords.find((state) => state.code === result.id)
      if (item) focusState(item)
      return
    }
    const stateCode = result.id?.slice(0, 2) ?? ''
    const state = stateRecords.find((item) => item.code === stateCode)
    if (state && result.id && result.center && result.bounds) {
      setRegion({ stateCode, uf: result.uf ?? state.uf, stateName: result.stateName ?? state.name, municipalityCode: result.id, municipalityName: result.label })
      setSelectedEventId(null)
      setMapTarget(result.center)
      setMapZoom(fitZoom(result.bounds, 'municipality'))
      setRightCollapsed(false)
      setRightMobileOpen(true)
      setLeftMobileOpen(false)
    }
  }, [focusState, selectEvent, stateRecords])

  const onRegionFilterChange = useCallback((stateCode: string) => {
    if (!stateCode) {
      setRegion(null)
      setSelectedEventId(null)
      setMapTarget(initialCenter)
      setMapZoom(4)
      setRightMobileOpen(false)
      return
    }
    const item = stateRecords.find((state) => state.code === stateCode)
    if (item) focusState(item)
  }, [focusState, stateRecords])

  const clearFilters = useCallback(() => {
    setQuery('')
    setCategory('Todas')
    setSeverity('Todas')
    setStatus('Todos')
    changePeriod('24h')
    setRegion(null)
    setSelectedEventId(null)
    setMapTarget(initialCenter)
    setMapZoom(4)
    setShowAllEvents(false)
    setIsPlaying(false)
  }, [changePeriod])

  const goToCountry = useCallback(() => {
    setRegion(null)
    setSelectedEventId(null)
    setMapTarget(initialCenter)
    setMapZoom(4)
    setRightMobileOpen(false)
    setLeftMobileOpen(false)
  }, [])
  const goToState = useCallback(() => {
    if (!region) return
    const item = stateRecords.find((state) => state.code === region.stateCode)
    if (!item) return
    setRegion({ stateCode: item.code, uf: item.uf, stateName: item.name, municipalityCode: null, municipalityName: null })
    setSelectedEventId(null)
    setMapTarget(item.center)
    setMapZoom(fitZoom(item.bounds, 'state'))
  }, [region, stateRecords])

  const selectedEventIsVisible = selectedEvent ? visibleEvents.some((item) => item.id === selectedEvent.id) : false
  const currentRegionName = region?.municipalityName ?? region?.stateName ?? 'Brasil'
  const currentRegionUf = region?.uf
  const previousCount = previousEvents.length
  const latestEvent = visibleEvents[0] ?? null
  const nextEvent = useCallback(() => {
    if (visibleEvents.length === 0) return
    const currentIndex = visibleEvents.findIndex((item) => item.id === selectedEventId)
    selectEvent(visibleEvents[(currentIndex + 1 + visibleEvents.length) % visibleEvents.length])
  }, [visibleEvents, selectedEventId, selectEvent])

  const setLayerVisibility = useCallback((layer: HeatObservation['category']) => setHeatVisibility((current) => ({ ...current, [layer]: !current[layer] })), [])
  const onMarkNotificationRead = useCallback((id: string) => setUnreadNotificationIds((current) => { const next = new Set(current); next.delete(id); return next }), [])
  const onMarkAllRead = useCallback(() => setUnreadNotificationIds(new Set()), [])
  const onSelectNotification = useCallback((item: IncidentEvent) => { onMarkNotificationRead(item.id); setNotificationsOpen(false); selectEvent(item) }, [onMarkNotificationRead, selectEvent])
  const onCloseRight = useCallback(() => {
    if (window.matchMedia('(max-width: 1120px)').matches) setRightMobileOpen(false)
    else setRightCollapsed(true)
  }, [])
  const toggleRightPanel = useCallback(() => {
    setFocusMode(false)
    if (window.matchMedia('(max-width: 1120px)').matches) {
      setRightCollapsed(false)
      setRightMobileOpen((value) => !value)
    } else {
      setRightCollapsed((value) => !value)
      setRightMobileOpen(true)
    }
  }, [])
  const openLeftPanel = useCallback(() => { setFocusMode(false); setLeftCollapsed(false); setLeftMobileOpen(true) }, [])
  const closeLeftPanel = useCallback(() => setLeftMobileOpen(false), [])
  const timelineLabel = `${formatDemoDate(currentTime)} · ${formatDemoTime(currentTime)} BRT`

  return (
    <main className="app-shell" id="top" aria-label="Atlas, demonstração local de monitoramento geográfico">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ATLAS — voltar ao início"><span className="brand-mark"><i/><i/><i/></span><span className="brand-name">ATLAS<small>MONITORAMENTO</small></span></a>
        <div className="top-center"><span className="connection-dot"/><span>DADOS LOCAIS <b>·</b> SIMULAÇÃO</span></div>
        <div className="top-actions"><span className="updated">{formatDemoDate(currentTime)} <b>·</b> {formatDemoTime(currentTime)} BRT</span><NotificationCenter events={notificationEvents} open={notificationsOpen} unreadIds={unreadNotificationIds} currentTime={currentTime} onOpenChange={setNotificationsOpen} onMarkRead={onMarkNotificationRead} onMarkAllRead={onMarkAllRead} onSelect={onSelectNotification}/><LiquidThemeToggle/><span className="avatar" aria-label="Perfil de demonstração">AN</span></div>
      </header>

      <div className={`workspace ${focusMode ? 'focus-mode' : ''} ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
        <ExplorationSidebar query={query} onQueryChange={setQuery} searchResults={searchResults} searchLoading={normalizedQuery.length >= 2 && municipalityIndexLoading} onSearchSelect={selectSearchResult} events={visibleEvents} selectedEventId={selectedEventId} currentTime={currentTime} showAll={showAllEvents} onToggleShowAll={() => setShowAllEvents((value) => !value)} onSelectEvent={selectEvent} category={category} onCategoryChange={setCategory} stateOptions={stateRecords} stateCode={region?.stateCode ?? ''} severity={severity} onSeverityChange={setSeverity} status={status} onStatusChange={setStatus} period={period} onPeriodChange={changePeriod} onStateChange={onRegionFilterChange} onClearFilters={() => { clearFilters(); setFilterOpen(false) }} collapsed={leftCollapsed} onCollapse={() => setLeftCollapsed((value) => !value)} mobileOpen={leftMobileOpen} onCloseMobile={closeLeftPanel} filterOpen={filterOpen} onFilterOpenChange={setFilterOpen}/>

        <section className="map-stage" aria-label="Mapa interativo e linha do tempo">
          <div className="map-top-controls">
            <div className="map-location"><span className="eyebrow">COBERTURA GEOGRÁFICA</span><div className="breadcrumbs"><button type="button" onClick={goToCountry} aria-current={!region ? 'location' : undefined}>Brasil</button>{region && <><ChevronRight size={13}/><button type="button" onClick={goToState} aria-current={!region.municipalityCode ? 'location' : undefined}>{region.stateName}</button></>}{region?.municipalityName && <><ChevronRight size={13}/><span aria-current="location">{region.municipalityName}</span></>}</div></div>
            <div className="map-actions">
              {(leftCollapsed || leftMobileOpen === false) && <button type="button" className="map-action open-left-action" aria-label="Abrir painel de exploração" title="Exploração" onClick={openLeftPanel}><PanelLeftOpen size={15}/></button>}
              <LayerControl open={layersOpen} onOpenChange={setLayersOpen} heatVisibility={heatVisibility} onToggleHeat={setLayerVisibility} incidentsVisible={showIncidents} boundariesVisible={showBoundaries} municipalitiesVisible={showMunicipalities} onToggleIncidents={() => setShowIncidents((value) => !value)} onToggleBoundaries={() => setShowBoundaries((value) => !value)} onToggleMunicipalities={() => setShowMunicipalities((value) => !value)} opacity={heatOpacity} onOpacityChange={setHeatOpacity} municipalityLoading={municipalityLoading} labelVisibility={geographicLabelVisibility} onToggleLabel={toggleGeographicLabel} onToggleAllLabels={toggleAllGeographicLabels}/>
              <button type="button" className="map-action reset-map-action" aria-label="Centralizar mapa no Brasil" title="Voltar à visão do Brasil" onClick={goToCountry}><Crosshair size={15}/></button>
              <button type="button" className={`map-action ${focusMode ? 'active' : ''}`} aria-label={focusMode ? 'Sair do modo mapa' : 'Expandir mapa'} title={focusMode ? 'Sair do modo mapa' : 'Expandir mapa'} aria-pressed={focusMode} onClick={() => { setFocusMode((value) => !value); setLeftMobileOpen(false); setRightMobileOpen(false) }}><Maximize2 size={15}/></button>
              <button type="button" className="map-action detail-action" aria-label={rightMobileOpen || !rightCollapsed ? 'Ocultar detalhes da região' : 'Mostrar detalhes da região'} aria-expanded={rightMobileOpen || !rightCollapsed} onClick={toggleRightPanel}><PanelRightOpen size={15}/></button>
            </div>
          </div>

          <div className="map-canvas" id="atlas-map">
            <MonitorMap incidents={visibleEvents} selectedEventId={selectedEventId} onSelectIncident={selectEvent} target={mapTarget} zoom={mapZoom} onZoomChange={onZoomChange} stateGeoJson={stateGeoJson} municipalityGeoJson={municipalityGeoJson} municipalityError={municipalityError} municipalityLoading={municipalityLoading} selectedStateCode={region?.stateCode ?? ''} selectedMunicipalityCode={region?.municipalityCode ?? null} labelVisibility={geographicLabelVisibility} municipalityIndex={municipalityIndex} onSelectGeography={handleGeographySelect} showBoundaries={showBoundaries} showMunicipalities={showMunicipalities} showIncidents={showIncidents} heatVisibility={heatVisibility} heatOpacity={heatOpacity} activeCategory={category} heatPoints={heatPoints}/>
            {stateGeoError && <div className="map-data-error map-error-action" role="alert">A malha estadual local não carregou. <button type="button" onClick={() => retryStateGeo()}>Tentar novamente</button></div>}
            {activeHeatDefinitions.length > 0 && <section className="map-intensity-legend" aria-label="Escalas das camadas de intensidade"><div className="legend-title"><Activity size={12}/> INTENSIDADE <span>SIMULADA</span></div>{activeHeatDefinitions.slice(0, 3).map((layer) => <div className="intensity-row" key={layer.category}><span className="intensity-name"><i style={{ background: layer.color }}/>{layer.title}</span><span className="intensity-range">{layer.range}</span><span className="intensity-gradient" style={{ background: `linear-gradient(90deg, ${Object.values(layer.gradient).join(', ')})` }}/><span className="intensity-unit">{layer.unit}</span></div>)}{activeHeatDefinitions.length > 3 && <small>+{activeHeatDefinitions.length - 3} camadas ativas</small>}</section>}
            <div className="map-zoom-controls" aria-label="Controles de zoom"><button type="button" aria-label="Aproximar mapa" onClick={() => setMapZoom((value) => Math.min(12, value + 1))}><Plus size={15}/></button><span aria-live="polite">{mapZoom.toFixed(1)}×</span><button type="button" aria-label="Afastar mapa" onClick={() => setMapZoom((value) => Math.max(3, value - 1))}><Minus size={15}/></button></div>
            <div className="map-context-tag"><MapPin size={12}/>{region ? `${region.municipalityName ?? region.stateName} · ${region.uf}` : 'Brasil · 27 UFs'}</div>
          </div>

          <section className="timeline" aria-label="Linha do tempo da demonstração">
            <div className="timeline-top"><div className="timeline-title"><span className="timeline-live-dot"/><strong>SEQUÊNCIA TEMPORAL</strong><span className="timeline-date">{timelineLabel}</span></div><div className="timeline-controls"><div className="timeline-period" role="group" aria-label="Período do recorte">{periodOptions.map((item) => <button type="button" key={item.id} className={period === item.id ? 'selected' : ''} aria-pressed={period === item.id} onClick={() => changePeriod(item.id)}>{item.label}</button>)}</div><button type="button" className="timeline-play" aria-label={isPlaying ? 'Pausar sequência' : 'Reproduzir sequência'} aria-pressed={isPlaying} onClick={() => { if (isPlaying) setIsPlaying(false); else { if (timelineProgress >= 100) setTimelineProgress(0); setIsPlaying(true) } }}>{isPlaying ? <Pause size={14}/> : <Play size={14}/>}</button><button type="button" className="timeline-reset" aria-label="Ir ao fim da sequência" onClick={() => { setIsPlaying(false); setTimelineProgress(100) }}><RotateCcw size={13}/></button></div></div>
            <div className="timeline-chart" role="group" aria-label={`${periodEvents.length} eventos simulados distribuídos no período selecionado`}><div className="timeline-bars">{timelineBars.map((value, index) => <i key={index} title={`${value} ocorrências`} className={periodStart + (duration * (index + 0.5)) / 48 <= currentTime ? 'past' : ''} style={{ height: `${Math.max(8, (value / highestTimelineBar) * 100)}%` }}/>)}</div><input type="range" aria-label="Posição temporal" aria-valuetext={`${formatDemoDate(currentTime)}, ${formatDemoTime(currentTime)} BRT`} min="0" max="100" step="1" value={timelineProgress} style={{ '--timeline-progress': `${timelineProgress}%` } as React.CSSProperties} onChange={(event) => { setIsPlaying(false); setTimelineProgress(Number(event.target.value)) }}/><span className="timeline-now" style={{ left: `${timelineProgress}%` }}/></div>
            <div className="timeline-ticks">{periodTicks.map((tick) => <span key={tick.value}>{tick.label}</span>)}</div>
            <div className="timeline-footer"><span>{visibleEvents.length} ocorrências visíveis</span><span>{periodEvents.length} no período <b>·</b> amostra local</span></div>
          </section>
        </section>

        {(!rightCollapsed || rightMobileOpen) && <RegionPanel regionName={currentRegionName} regionUf={currentRegionUf} regionStateName={region?.municipalityCode ? region.stateName : undefined} selectedEvent={selectedEvent} latestEvent={latestEvent} regionEvents={visibleEvents} previousCount={previousCount} currentTime={currentTime} periodDurationMs={duration} onFocusEvent={selectEvent} onViewAll={() => { setShowAllEvents(true); setLeftCollapsed(false); setLeftMobileOpen(true) }} onNextEvent={nextEvent} onClose={onCloseRight} mobileOpen={rightMobileOpen} selectionOutsideFilters={Boolean(selectedEvent && !selectedEventIsVisible)}/>}
      </div>
    </main>
  )
}
