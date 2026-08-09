import { Copy, FolderOpen, Trash, X } from '@phosphor-icons/react'
import type { SinkDesign } from '../types/sink'

export function SavedDesigns({ designs, open, onClose, onOpen, onDuplicate, onDelete }: { designs: SinkDesign[]; open: boolean; onClose: () => void; onOpen: (d: SinkDesign) => void; onDuplicate: (d: SinkDesign) => void; onDelete: (id: string) => void }) {
  return <div className={`saved-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
    <div className="drawer-head"><div><span>Saved designs</span><small>{designs.length} locally stored</small></div><button className="icon-button" onClick={onClose} aria-label="Close saved designs"><X size={18} /></button></div>
    <div className="saved-list">
      {!designs.length && <div className="empty-state"><strong>No saved designs</strong><span>Saved sink configurations will appear here.</span></div>}
      {designs.map((d) => <article className="saved-item" key={d.id}>
        <div><strong>{d.clientName || 'Untitled client'}</strong><span>{d.reference || 'No reference'}</span></div>
        <p>{d.overallWidth} × {d.overallDepth} × {d.overallHeight} mm<br />{d.drainType}</p>
        <small>Updated {new Date(d.updatedAt).toLocaleDateString('en-GB')}</small>
        <div className="saved-actions"><button onClick={() => onOpen(d)}><FolderOpen /> Open</button><button onClick={() => onDuplicate(d)}><Copy /> Duplicate</button><button className="danger" onClick={() => onDelete(d.id)} aria-label={`Delete ${d.reference}`}><Trash /></button></div>
      </article>)}
    </div>
  </div>
}
