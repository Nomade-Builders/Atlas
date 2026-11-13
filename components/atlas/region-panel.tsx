'use client'

import { Activity, ArrowDownRight, ArrowUpRight, CloudRain, Flame, MapPin, Radio, Wind, X } from 'lucide-react'
import { categoryColors, relativeTime, type IncidentEvent } from '@/lib/atlas-data'

const categoryIcons = { Chuva: CloudRain, Calor: Flame, Alagamentos: CloudRain, Incêndios: Flame, Fumaça: Wind, Seca: Wind, Acidentes: Activity, Mobilidade: Activity } as const

type RegionPanelProps = {
  regionName: string
  regionUf?: string
  regionStateName?: string
  selectedEvent: IncidentEvent | null
  latestEvent: IncidentEvent | null
  regionEvents: IncidentEvent[]
  previousCount: number
  currentTime: number
  periodDurationMs: number
  onFocusEvent: (event: IncidentEvent) => void
  onViewAll: () => void
  onNextEvent: () => void
  onClose: () => void
  mobileOpen: boolean
  selectionOutsideFilters: boolean
}

function trend(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 100)
}

export function RegionPanel({ regionName, regionUf, regionStateName, selectedEvent, latestEvent, regionEvents, previousCount, currentTime, periodDurationMs, onFocusEvent, onViewAll, onNextEvent, onClose, mobileOpen, selectionOutsideFilters }: RegionPanelProps) {
  const currentCount = regionEvents.length
  const change = trend(currentCount, previousCount)
  const activeCount = regionEvents.filter((item) => item.status !== 'Resolvido').length
  const impact = Math.min(100, Math.round(regionEvents.reduce((score, item) => score + ({ Crítico: 24, Alto: 16, Moderado: 9, Baixo: 4 }[item.severity]), 0)))
  const focus = selectedEvent ?? latestEvent
  const Icon = focus ? categoryIcons[focus.category] : MapPin
  const bucketWidth = periodDurationMs / 7
  const sparkValues = Array.from({ length: 7 }, (_, index) => {
    const start = currentTime - (7 - index) * bucketWidth
    const end = start + bucketWidth
    return regionEvents.filter((item) => {
      const timestamp = Date.parse(item.observedAt)
      return timestamp >= start && timestamp < end
    }).length
  })
  const maxSpark = Math.max(1, ...sparkValues)

  return (
    <aside className={`right-panel ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Detalhes da região">
      <div className="region-top"><div><div className="eyebrow">{selectedEvent ? 'EVENTO SELECIONADO' : 'REGIÃO SELECIONADA'}</div><h2>{regionName} <span>{regionUf ? `· ${regionUf}` : '· Brasil'}</span></h2>{regionStateName && <span className="region-state-label">Estado: {regionStateName}</span>}</div><button className="icon-button region-close" type="button" aria-label="Fechar painel de detalhes" onClick={onClose}><X size={16}/></button></div>
      {focus && <button className="region-weather" type="button" onClick={() => onFocusEvent(focus)} aria-label={`Centralizar mapa em ${focus.city}, ${focus.state}`}><span className="weather-mark" style={{ '--incident-color': categoryColors[focus.category] } as React.CSSProperties}><Icon size={19}/></span><span className="weather-copy"><strong>{focus.metric}</strong><small>{focus.category} · indicador demonstrativo</small></span><span className="weather-wind"><MapPin size={12}/>{focus.city}</span></button>}
      <div className="panel-rule"/>
      <div className="section-label"><span>ÍNDICE DE IMPACTO LOCAL</span><span className={`trend-value ${change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : ''}`}>{change > 0 ? <ArrowUpRight size={13}/> : change < 0 ? <ArrowDownRight size={13}/> : null}{Math.abs(change)}%</span></div>
      <div className="impact-score"><strong>{impact}</strong><span>/ 100</span><div className="score-meter"><i style={{ width: `${impact}%` }}/></div><div className="score-label"><span>BAIXO</span><span>MODERADO</span><span>ALTO</span></div><p className="metric-disclaimer">Índice derivado dos eventos demonstrativos visíveis.</p></div>
      <div className="panel-rule"/>
      <div className="section-label"><span>RESUMO DA REGIÃO</span><span className="demo-badge"><i/> SIMULADO</span></div>
      <div className="stat-grid"><div className="stat-card"><span>Ocorrências no período</span><strong>{String(currentCount).padStart(2, '0')} <small className="stat-delta">{change > 0 ? <ArrowUpRight size={12}/> : change < 0 ? <ArrowDownRight size={12}/> : <Activity size={12}/>} {change > 0 ? '+' : ''}{change}%</small></strong><div className="sparkline" role="img" aria-label="Ocorrências simuladas por hora">{sparkValues.map((value, index) => <i key={index} style={{ height: `${Math.max(10, (value / maxSpark) * 100)}%` }}/>)}</div></div><div className="stat-card"><span>Alertas ativos</span><strong>{String(activeCount).padStart(2, '0')} <small className="neutral"><Activity size={12}/> {activeCount ? 'em curso' : 'estável'}</small></strong><div className="sparkline blue" role="img" aria-label="Alertas ativos por hora">{sparkValues.map((value, index) => <i key={index} style={{ height: `${Math.max(10, (value / maxSpark) * 100)}%` }}/>)}</div></div></div>
      <div className="panel-rule"/>
      <div className="section-label"><span>{selectedEvent ? 'HISTÓRICO DO EVENTO' : 'ATUALIZAÇÕES LOCAIS'}</span><button className="text-button" type="button" onClick={onViewAll}>Ver todas <ArrowUpRight size={12}/></button></div>
      {selectionOutsideFilters && selectedEvent && <div className="outside-filter-note" role="status">Este evento está fora dos filtros atuais.</div>}
      {selectedEvent ? <div className="event-detail-card">
        <div className="news-meta"><span className="news-tag" style={{ '--incident-color': categoryColors[selectedEvent.category] } as React.CSSProperties}>{selectedEvent.category.toUpperCase()}</span><span>{relativeTime(selectedEvent.observedAt, currentTime)}</span></div>
        <h3>{selectedEvent.title}</h3><p>{selectedEvent.description}</p>
        <div className="detail-location"><MapPin size={13}/><span>{selectedEvent.city}, {selectedEvent.stateName}</span><span className={`severity severity-${selectedEvent.severity.toLowerCase()}`}>{selectedEvent.severity}</span></div>
        <div className="event-status-line"><span>Status</span><strong className={`status-${selectedEvent.status.toLowerCase().replaceAll(' ', '-')}`}>{selectedEvent.status}</strong></div>
        <div className="history-list">{selectedEvent.history.map((item, index) => <div className="history-item" key={`${selectedEvent.id}-${index}`}><i/><span><strong>{item.title}</strong><small>{relativeTime(item.timestamp, currentTime)} · {item.detail}</small></span></div>)}</div>
        <span className="event-source">{selectedEvent.source} · sem telemetria externa</span>
      </div> : latestEvent ? <button type="button" className="news-card latest-card" onClick={() => onFocusEvent(latestEvent)}><div className="news-meta"><span className="news-tag" style={{ '--incident-color': categoryColors[latestEvent.category] } as React.CSSProperties}>{latestEvent.category.toUpperCase()}</span><span>{relativeTime(latestEvent.observedAt, currentTime)}</span></div><h3>{latestEvent.title}</h3><p>{latestEvent.city}, {latestEvent.state} · {latestEvent.metric}</p><div className="news-source"><span className="source-avatar">A</span><span>Registro de demonstração</span><span className="verified" aria-label="Dados locais">•</span></div></button> : <div className="region-empty"><MapPin size={17}/><strong>Nenhum evento no recorte</strong><span>Esta região está sem ocorrências na sequência simulada.</span></div>}
      <div className="right-bottom"><span><Radio size={13}/> Dados locais · simulação</span><button type="button" aria-label="Próximo evento" onClick={onNextEvent} disabled={regionEvents.length === 0}><ArrowDownRight size={14}/><ArrowUpRight size={14}/></button></div>
    </aside>
  )
}
