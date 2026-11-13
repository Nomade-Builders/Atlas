'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, MapPin, Search } from 'lucide-react'

export type MapSearchResult = {
  key: string
  kind: 'event' | 'state' | 'municipality'
  label: string
  detail: string
  id?: string
  uf?: string
  stateName?: string
  center?: [number, number]
  bounds?: [number, number, number, number]
}

type SearchBoxProps = {
  query: string
  onQueryChange: (value: string) => void
  results: MapSearchResult[]
  isLoading: boolean
  onSelect: (result: MapSearchResult) => void
}

export function SearchBox({ query, onQueryChange, results, isLoading, onSelect }: SearchBoxProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = 'atlas-search-results'
  const visible = open && query.trim().length > 0

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])

  useEffect(() => setActiveIndex(0), [query, results.length])

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index + 1) % results.length)
    }
    if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => (index - 1 + results.length) % results.length)
    }
    if (event.key === 'Enter' && results.length && visible) {
      event.preventDefault()
      onSelect(results[activeIndex] ?? results[0])
      setOpen(false)
    }
  }

  return (
    <div className="search-control" ref={rootRef}>
      <label className="search-box" htmlFor="atlas-search-input">
        <Search size={15} aria-hidden="true" />
        <input
          id="atlas-search-input"
          type="search"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={listId}
          aria-activedescendant={visible && results[activeIndex] ? `${listId}-${results[activeIndex].key}` : undefined}
          value={query}
          onChange={(event) => { onQueryChange(event.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar cidade ou ocorrência"
        />
        <kbd aria-hidden="true">⌘ K</kbd>
      </label>
      {visible && (
        <div className="search-results" id={listId} role="listbox" aria-label="Resultados da busca local">
          {isLoading && results.length === 0 && <div className="search-state" role="status">Buscando na malha local do IBGE…</div>}
          {!isLoading && results.length === 0 && <div className="search-state" role="status">Nenhum estado, município ou evento encontrado.</div>}
          {results.map((result, index) => {
            const Icon = result.kind === 'event' ? Activity : result.kind === 'state' ? MapPin : MapPin
            return (
              <button
                key={result.key}
                id={`${listId}-${result.key}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className="search-result"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { onSelect(result); setOpen(false) }}
              >
                <span className={`search-result-icon search-result-${result.kind}`}><Icon size={14} aria-hidden="true" /></span>
                <span className="search-result-copy"><strong>{result.label}</strong><small>{result.detail}</small></span>
                <span className="search-result-kind">{result.kind === 'event' ? 'EVENTO' : result.kind === 'state' ? 'UF' : 'MUNICÍPIO'}</span>
              </button>
            )
          })}
          {isLoading && results.length > 0 && <div className="search-state" role="status">Carregando mais municípios da malha local…</div>}
        </div>
      )}
    </div>
  )
}
