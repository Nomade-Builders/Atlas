'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowUp, CloudRain, Flame, Leaf, MapPin, Route, Sun, Waves, Wind, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { categoryColors, categoryOptions, type Category, type EventStatus, type IncidentEvent, type PeriodId, type Severity } from '@/lib/atlas-data'
import { FilterControl } from '@/components/atlas/filter-control'
import { IncidentFeed } from '@/components/atlas/incident-feed'
import { SearchBox, type MapSearchResult } from '@/components/atlas/search-box'

const categoryIcons = { Chuva: CloudRain, Calor: Sun, Alagamentos: Waves, Incêndios: Flame, Fumaça: Wind, Seca: Leaf, Acidentes: Activity, Mobilidade: Route } as const

type StateOption = { code: string; uf: string; name: string; center: [number, number]; bounds: [number, number, number, number] }

type ExplorationSidebarProps = {
  query: string
  onQueryChange: (value: string) => void
  searchResults: MapSearchResult[]
  searchLoading: boolean
  onSearchSelect: (result: MapSearchResult) => void
  events: IncidentEvent[]
  selectedEventId: string | null
  currentTime: number
  showAll: boolean
  onToggleShowAll: () => void
  onSelectEvent: (event: IncidentEvent) => void
  category: 'Todas' | Category
  onCategoryChange: (category: 'Todas' | Category) => void
  stateOptions: StateOption[]
  stateCode: string
  severity: 'Todas' | Severity
  onSeverityChange: (value: 'Todas' | Severity) => void
  status: 'Todos' | EventStatus
  onStatusChange: (value: 'Todos' | EventStatus) => void
  period: PeriodId
  onPeriodChange: (value: PeriodId) => void
  onStateChange: (code: string) => void
  onClearFilters: () => void
  collapsed: boolean
  onCollapse: () => void
  onCloseMobile: () => void
  mobileOpen: boolean
  filterOpen: boolean
  onFilterOpenChange: (open: boolean) => void
}

export function ExplorationSidebar(props: ExplorationSidebarProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const sourcesRef = useRef<HTMLDivElement>(null)
  const activeFilterCount = Number(props.stateCode !== '') + Number(props.severity !== 'Todas') + Number(props.status !== 'Todos') + Number(props.category !== 'Todas') + Number(props.period !== '24h')

  useEffect(() => {
    if (!sourcesOpen) return
    const closeOutside = (event: PointerEvent) => { if (!sourcesRef.current?.contains(event.target as Node)) setSourcesOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSourcesOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [sourcesOpen])

  if (props.collapsed) return <aside className="sidebar-collapsed" aria-label="Painel de exploração recolhido"><button type="button" className="icon-button" aria-label="Expandir painel de exploração" onClick={props.onCollapse}><PanelLeftOpen size={16}/></button><span>ATLAS</span></aside>

  return (
    <aside className={`left-panel ${props.mobileOpen ? 'mobile-open' : ''}`} aria-label="Exploração de ocorrências">
      <div className="panel-heading"><div><div className="eyebrow">CENTRAL DE SITUAÇÃO</div><h1>Brasil agora</h1></div><button className="mobile-close icon-button" type="button" onClick={props.onCloseMobile} aria-label="Fechar painel"><X size={17}/></button><button className="sidebar-collapse icon-button" type="button" onClick={props.onCollapse} aria-label="Recolher painel"><PanelLeftClose size={15}/></button><FilterControl open={props.filterOpen} onOpenChange={props.onFilterOpenChange} stateOptions={props.stateOptions} stateCode={props.stateCode} severity={props.severity} status={props.status} period={props.period} activeCount={activeFilterCount} onStateChange={props.onStateChange} onSeverityChange={props.onSeverityChange} onStatusChange={props.onStatusChange} onPeriodChange={props.onPeriodChange} onClear={props.onClearFilters}/></div>
      <SearchBox query={props.query} onQueryChange={props.onQueryChange} results={props.searchResults} isLoading={props.searchLoading} onSelect={props.onSearchSelect}/>
      <div className="section-label"><span>CATEGORIAS</span><span className="filter-summary">{props.events.length} no recorte</span></div>
      <div className="category-grid">{categoryOptions.map((item) => {
        const Icon = item === 'Todas' ? null : categoryIcons[item]
        const color = item === 'Todas' ? 'transparent' : categoryColors[item]
        return <button key={item} type="button" className={`category-chip ${props.category === item ? 'active' : ''}`} aria-pressed={props.category === item} onClick={() => props.onCategoryChange(item)}>{Icon && <i className="category-dot" style={{ '--incident-color': color } as React.CSSProperties}><Icon size={11}/></i>}{item}</button>
      })}</div>
      <div className="map-legend"><span className="legend-item"><i className="legend-event"/>Ocorrências</span><span className="legend-item"><i className="legend-heat"/>Intensidade</span><span className="legend-toggle-text">camadas no mapa</span></div>
      <div className="panel-rule"/>
      <IncidentFeed events={props.events} selectedId={props.selectedEventId} currentTime={props.currentTime} showAll={props.showAll} onToggleShowAll={props.onToggleShowAll} onSelect={props.onSelectEvent}/>
      <div className="left-footer"><button className="source-button" type="button" aria-expanded={sourcesOpen} aria-controls="atlas-data-sources" onClick={() => setSourcesOpen((value) => !value)}><span><span className="source-dot"/> Dados e fontes</span><span>IBGE · 5.570 <ArrowUp size={12}/></span></button>{sourcesOpen && <div className="source-popover" id="atlas-data-sources" role="dialog" aria-label="Origem dos dados"><button className="source-close icon-button" type="button" aria-label="Fechar fontes" onClick={() => setSourcesOpen(false)}><X size={13}/></button><strong>Dados locais da demonstração</strong><p>Limites de 27 UFs e 5.570 municípios baseados em malhas públicas do IBGE, armazenadas neste projeto.</p><p>Ocorrências, intensidades e notificações são amostras fictícias. Nenhuma API de monitoramento é consultada.</p><a href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html" target="_blank" rel="noreferrer">Sobre as malhas do IBGE <ArrowUp size={11}/></a></div>}</div>
    </aside>
  )
}
