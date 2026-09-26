import { useEffect, useRef } from 'react'
import { Copy, FolderOpen, Trash, X } from '@phosphor-icons/react'
import type { SinkDesign } from '../types/sink'
import { priceDesign } from '../pricing/fromDesign'
import { CONFIDENCE_LABEL, formatGbp } from '../pricing/engine'

type Props = { designs: SinkDesign[]; currentId: string; open: boolean; onClose: () => void; onOpen: (d: SinkDesign) => void; onDuplicate: (d: SinkDesign) => void; onDelete: (d: SinkDesign) => void }

export function SavedDesigns({ designs, currentId, open, onClose, onOpen, onDuplicate, onDelete }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<Element | null>(null)
  useEffect(() => {
    if (open) { returnFocus.current = document.activeElement; closeButton.current?.focus() }
    else if (returnFocus.current instanceof HTMLElement) { returnFocus.current.focus(); returnFocus.current = null }
  }, [open])
  return <div className={`saved-drawer ${open ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-label="Saved designs" inert={!open}>
    <div className="drawer-head"><div><span>Saved designs</span><small>{designs.length} stored in this browser</small></div><button ref={closeButton} className="icon-button" onClick={onClose} aria-label="Close saved designs"><X size={18} /></button></div>
    <div className="saved-list">
      {!designs.length && <div className="empty-state"><strong>No saved designs</strong><span>Saved designs appear here.</span></div>}
      {designs.map((d) => {
        const price = priceDesign(d)
        return <article className={`saved-item ${d.id === currentId ? 'is-current' : ''}`} key={d.id}>
          <div><strong>{d.clientName || 'No client'}</strong><span>{d.reference || 'No reference'}</span></div>
          <p>{d.overallWidth} × {d.overallDepth} × {d.overallHeight} mm{d.basinCount > 1 ? ` · ${d.basinCount} basins` : ''}<br /><b>{formatGbp(price.recommendedPrice)}</b> {d.pricingMode} · {CONFIDENCE_LABEL[price.confidence]}</p>
          <small>Updated {new Date(d.updatedAt).toLocaleDateString('en-GB')}{d.id === currentId ? ' · open now' : ''}</small>
          <div className="saved-actions"><button onClick={() => onOpen(d)}><FolderOpen aria-hidden="true" /> Open</button><button onClick={() => onDuplicate(d)}><Copy aria-hidden="true" /> Duplicate</button><button className="danger" onClick={() => onDelete(d)} aria-label={`Delete ${d.reference}`}><Trash aria-hidden="true" /></button></div>
        </article>
      })}
    </div>
  </div>
}
