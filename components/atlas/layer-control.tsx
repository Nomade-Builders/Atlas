'use client'

import { useEffect, useRef } from 'react'
import { Layers2, X } from 'lucide-react'
import { heatLayers, type HeatObservation } from '@/lib/atlas-data'
import type { GeographicLabelVisibility } from '@/components/atlas/geographic-label-layer'

export type HeatVisibility = Record<HeatObservation['category'], boolean>

type LayerControlProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  heatVisibility: HeatVisibility
  onToggleHeat: (category: HeatObservation['category']) => void
  incidentsVisible: boolean
  boundariesVisible: boolean
  municipalitiesVisible: boolean
  onToggleIncidents: () => void
  onToggleBoundaries: () => void
  onToggleMunicipalities: () => void
  labelVisibility: GeographicLabelVisibility
  onToggleLabel: (key: keyof GeographicLabelVisibility) => void
  onToggleAllLabels: () => void
  opacity: number
  onOpacityChange: (value: number) => void
  municipalityLoading: boolean
}

export function LayerControl({ open, onOpenChange, heatVisibility, onToggleHeat, incidentsVisible, boundariesVisible, municipalitiesVisible, onToggleIncidents, onToggleBoundaries, onToggleMunicipalities, labelVisibility, onToggleLabel, onToggleAllLabels, opacity, onOpacityChange, municipalityLoading }: LayerControlProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const allLabelsRef = useRef<HTMLInputElement>(null)
  const dialogId = 'atlas-map-layers'
  const allLabelsVisible = Object.values(labelVisibility).every(Boolean)
  const someLabelsVisible = Object.values(labelVisibility).some(Boolean)

  useEffect(() => {
    if (allLabelsRef.current) allLabelsRef.current.indeterminate = someLabelsVisible && !allLabelsVisible
  }, [allLabelsVisible, someLabelsVisible])

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
    <div className="layer-control" ref={rootRef}>
      <button className={`map-action ${open ? 'is-open' : ''}`} type="button" aria-expanded={open} aria-controls={dialogId} onClick={() => onOpenChange(!open)}><Layers2 size={14} /> Camadas</button>
      {open && (
        <div className="layer-popover" id={dialogId} role="dialog" aria-labelledby="layer-popover-title">
          <div className="popover-heading"><div><span className="eyebrow">VISUALIZAÇÃO</span><h2 id="layer-popover-title">Camadas do mapa</h2></div><button className="icon-button" type="button" aria-label="Fechar camadas" onClick={() => onOpenChange(false)}><X size={15} /></button></div>
          <fieldset className="layer-group"><legend>Nomes no mapa</legend>
            <label className="layer-option"><input ref={allLabelsRef} type="checkbox" checked={allLabelsVisible} onChange={onToggleAllLabels} /><span className="layer-swatch names-swatch"/><span><strong>Mostrar/ocultar todos os nomes</strong><small>Estados, capitais e demais cidades</small></span></label>
            <label className="layer-option"><input type="checkbox" checked={labelVisibility.states} onChange={() => onToggleLabel('states')} /><span className="layer-swatch names-swatch state-names-swatch"/><span><strong>Estados e Distrito Federal</strong><small>Identificações das unidades federativas</small></span></label>
            <label className="layer-option"><input type="checkbox" checked={labelVisibility.capitals} onChange={() => onToggleLabel('capitals')} /><span className="layer-swatch names-swatch capital-names-swatch"/><span><strong>Capitais</strong><small>Nome exibido junto ao nome do estado no zoom distante</small></span></label>
            <label className="layer-option"><input type="checkbox" checked={labelVisibility.municipalities} onChange={() => onToggleLabel('municipalities')} /><span className="layer-swatch names-swatch city-names-swatch"/><span><strong>Demais cidades</strong><small>Nomes aparecem progressivamente ao aproximar</small></span></label>
          </fieldset>
          <fieldset className="layer-group"><legend>Dados geográficos</legend>
            <label className="layer-option"><input type="checkbox" checked={boundariesVisible} onChange={onToggleBoundaries} /><span className="layer-swatch boundary-swatch"/><span><strong>Limites dos estados</strong><small>27 unidades federativas · IBGE</small></span></label>
            <label className="layer-option"><input type="checkbox" checked={municipalitiesVisible} onChange={onToggleMunicipalities} /><span className="layer-swatch municipality-swatch"/><span><strong>Limites municipais</strong><small>{municipalityLoading ? 'Carregando GeoJSON local…' : 'Disponível ao selecionar uma UF'}</small></span></label>
            <label className="layer-option"><input type="checkbox" checked={incidentsVisible} onChange={onToggleIncidents} /><span className="layer-swatch event-swatch"/><span><strong>Ocorrências</strong><small>Eventos sintéticos filtrados no período</small></span></label>
          </fieldset>
          <fieldset className="layer-group"><legend>Intensidades simuladas</legend>
            {heatLayers.map((layer) => <label className="layer-option" key={layer.category}><input type="checkbox" checked={heatVisibility[layer.category]} onChange={() => onToggleHeat(layer.category)} /><span className="layer-swatch" style={{ '--layer-color': layer.color } as React.CSSProperties}/><span><strong>{layer.title}</strong><small>{layer.unit} · {layer.range}</small></span></label>)}
          </fieldset>
          <label className="opacity-control"><span><strong>Opacidade</strong><output>{opacity}%</output></span><input type="range" min="10" max="100" step="5" value={opacity} onChange={(event) => onOpacityChange(Number(event.target.value))} aria-label="Opacidade das camadas de intensidade" /></label>
          <p className="layer-demo-note">As intensidades e ocorrências são amostras locais de demonstração.</p>
        </div>
      )}
    </div>
  )
}
