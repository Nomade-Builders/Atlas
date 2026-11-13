'use client'

import { useEffect, useRef } from 'react'
import { RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { periodOptions, severityOptions, statusOptions, type EventStatus, type PeriodId, type Severity } from '@/lib/atlas-data'

type StateOption = { code: string; uf: string; name: string }

type FilterControlProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  stateOptions: StateOption[]
  stateCode: string
  severity: 'Todas' | Severity
  status: 'Todos' | EventStatus
  period: PeriodId
  activeCount: number
  onStateChange: (code: string) => void
  onSeverityChange: (severity: 'Todas' | Severity) => void
  onStatusChange: (status: 'Todos' | EventStatus) => void
  onPeriodChange: (period: PeriodId) => void
  onClear: () => void
}

export function FilterControl({ open, onOpenChange, stateOptions, stateCode, severity, status, period, activeCount, onStateChange, onSeverityChange, onStatusChange, onPeriodChange, onClear }: FilterControlProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dialogId = 'atlas-advanced-filters'

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
    <div className="filter-control" ref={rootRef}>
      <button className={`icon-button filters-btn ${open ? 'is-open' : ''}`} type="button" aria-label="Abrir filtros avançados" aria-expanded={open} aria-controls={dialogId} onClick={() => onOpenChange(!open)}>
        <SlidersHorizontal size={16} />
        {activeCount > 0 && <span className="filter-active-count" aria-label={`${activeCount} filtros avançados ativos`}>{activeCount}</span>}
      </button>
      {open && (
        <div className="filter-popover" id={dialogId} role="dialog" aria-labelledby="filter-popover-title">
          <div className="popover-heading"><div><span className="eyebrow">EXPLORAÇÃO</span><h2 id="filter-popover-title">Filtros avançados</h2></div><button className="icon-button" type="button" aria-label="Fechar filtros" onClick={() => onOpenChange(false)}><X size={15} /></button></div>
          <label className="filter-field"><span>Região</span><select value={stateCode} onChange={(event) => onStateChange(event.target.value)}><option value="">Brasil inteiro</option>{stateOptions.map((item) => <option value={item.code} key={item.code}>{item.name} · {item.uf}</option>)}</select></label>
          <label className="filter-field"><span>Gravidade</span><select value={severity} onChange={(event) => onSeverityChange(event.target.value as 'Todas' | Severity)}>{severityOptions.map((item) => <option key={item} value={item}>{item === 'Todas' ? 'Todas' : item}</option>)}</select></label>
          <label className="filter-field"><span>Status</span><select value={status} onChange={(event) => onStatusChange(event.target.value as 'Todos' | EventStatus)}>{statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <fieldset className="filter-period"><legend>Período ativo</legend><div className="period-options">{periodOptions.map((item) => <button type="button" key={item.id} className={period === item.id ? 'selected' : ''} aria-pressed={period === item.id} onClick={() => onPeriodChange(item.id)}>{item.label}</button>)}</div></fieldset>
          <button type="button" className="clear-filters" onClick={onClear}><RotateCcw size={13} /> Limpar filtros</button>
        </div>
      )}
    </div>
  )
}
