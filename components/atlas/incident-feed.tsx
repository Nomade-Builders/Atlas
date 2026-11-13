'use client'

import { Activity, CloudRain, Flame, Route, Waves, Wind, Sun, Leaf, MapPin } from 'lucide-react'
import { categoryColors, relativeTime, type IncidentEvent } from '@/lib/atlas-data'

const icons = { Chuva: CloudRain, Calor: Sun, Alagamentos: Waves, Incêndios: Flame, Fumaça: Wind, Seca: Leaf, Acidentes: Activity, Mobilidade: Route } as const

type IncidentFeedProps = {
  events: IncidentEvent[]
  selectedId: string | null
  currentTime: number
  showAll: boolean
  onToggleShowAll: () => void
  onSelect: (event: IncidentEvent) => void
}

export function IncidentFeed({ events, selectedId, currentTime, showAll, onToggleShowAll, onSelect }: IncidentFeedProps) {
  const visible = showAll ? events : events.slice(0, 7)

  return (
    <section className="incident-feed" id="incident-feed" aria-labelledby="incident-feed-title">
      <div className="section-label incident-heading"><span id="incident-feed-title">OCORRÊNCIAS NO RECORTE</span><span className="count-pill" aria-label={`${events.length} ocorrências encontradas`}>{String(events.length).padStart(2, '0')}</span></div>
      {events.length === 0 ? (
        <div className="feed-empty"><MapPin size={18}/><strong>Sem ocorrências neste recorte</strong><span>Amplie o período ou limpe algum filtro para consultar os dados da demonstração.</span></div>
      ) : (
        <div className="incident-list" aria-live="polite">
          {visible.map((item) => {
            const Icon = icons[item.category]
            return (
              <button key={item.id} type="button" className={`incident-card ${selectedId === item.id ? 'selected' : ''}`} aria-pressed={selectedId === item.id} aria-label={`${item.category}, ${item.title}, ${item.city}, ${item.state}, ${item.severity}, ${item.status}`} onClick={() => onSelect(item)}>
                <span className="incident-icon" style={{ '--incident-color': categoryColors[item.category] } as React.CSSProperties}><Icon size={15}/></span>
                <span className="incident-copy"><span className="incident-title">{item.title}</span><span className="incident-location">{item.city}, {item.state}<b>·</b>{relativeTime(item.observedAt, currentTime)}</span></span>
                <span className={`severity severity-${item.severity.toLowerCase()}`}>{item.severity}</span>
              </button>
            )
          })}
        </div>
      )}
      {events.length > 7 && <button className="text-button feed-expand" type="button" aria-expanded={showAll} onClick={onToggleShowAll}>{showAll ? 'Mostrar menos' : `Ver todas (${events.length})`}</button>}
    </section>
  )
}
