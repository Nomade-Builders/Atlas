'use client'

import { useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, CloudRain, Flame, Waves, X } from 'lucide-react'
import { relativeTime, type IncidentEvent } from '@/lib/atlas-data'

const icons = { Chuva: CloudRain, Calor: Flame, Alagamentos: Waves, Incêndios: Flame, Fumaça: Flame, Seca: Flame, Acidentes: Bell, Mobilidade: Bell } as const

type NotificationCenterProps = {
  events: IncidentEvent[]
  open: boolean
  unreadIds: Set<string>
  currentTime: number
  onOpenChange: (open: boolean) => void
  onSelect: (event: IncidentEvent) => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

export function NotificationCenter({ events, open, unreadIds, currentTime, onOpenChange, onSelect, onMarkRead, onMarkAllRead }: NotificationCenterProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const unreadCount = events.filter((event) => unreadIds.has(event.id)).length

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onOpenChange])

  return (
    <div className="notification-control" ref={rootRef}>
      <button className="icon-button notification" type="button" aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`} aria-expanded={open} aria-controls="atlas-notifications" onClick={() => onOpenChange(!open)}>
        <Bell size={17}/>{unreadCount > 0 && <i aria-hidden="true"/>}
      </button>
      {open && (
        <section className="notification-popover" id="atlas-notifications" role="dialog" aria-labelledby="notifications-title">
          <div className="popover-heading"><div><span className="eyebrow">DEMONSTRAÇÃO LOCAL</span><h2 id="notifications-title">Notificações <span>{unreadCount}</span></h2></div><button className="icon-button" type="button" aria-label="Fechar notificações" onClick={() => onOpenChange(false)}><X size={15}/></button></div>
          <button className="mark-all-read" type="button" onClick={onMarkAllRead} disabled={unreadCount === 0}><CheckCheck size={14}/> Marcar todas como lidas</button>
          {events.length === 0 ? <div className="notification-empty"><Check size={16}/> Nenhum alerta demonstrativo neste período.</div> : <div className="notification-list">
            {events.map((event) => {
              const Icon = icons[event.category]
              const unread = unreadIds.has(event.id)
              return (
                <article className={`notification-item ${unread ? 'unread' : ''}`} key={event.id}>
                  <button type="button" className="notification-main" onClick={() => onSelect(event)}>
                    <span className={`notification-icon severity-${event.severity.toLowerCase()}`}><Icon size={14}/></span>
                    <span className="notification-copy"><strong>{event.title}</strong><small>{event.city}, {event.state} · {relativeTime(event.observedAt, currentTime)}</small></span>
                    {unread && <i className="unread-dot" aria-label="Não lida"/>}
                  </button>
                  {unread && <button className="mark-read" type="button" onClick={() => onMarkRead(event.id)} aria-label={`Marcar como lida: ${event.title}`}><Check size={13}/></button>}
                </article>
              )
            })}
          </div>}
          <p className="notification-note">Alertas e horários são fictícios; nenhuma fonte externa é consultada.</p>
        </section>
      )}
    </div>
  )
}
