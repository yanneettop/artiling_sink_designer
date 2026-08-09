import { ArrowRight, ClockCounterClockwise, FolderOpen, Plus, Ruler } from '@phosphor-icons/react'
import type { SinkDesign } from '../types/sink'

type Props = {
  designs: SinkDesign[]
  onNew: () => void
  onBrowse: () => void
  onOpen: (design: SinkDesign) => void
}

export function StartScreen({ designs, onNew, onBrowse, onOpen }: Props) {
  const recent = designs.slice(0, 3)
  return <main className="start-screen">
    <section className="start-intro">
      <span className="start-kicker">ARTILING / INTERNAL DESIGN TOOL</span>
      <h1>Start a sink design.</h1>
      <p>Create a new basin from the standard Artiling template or continue a locally saved project.</p>
      <div className="start-actions">
        <button className="start-primary" onClick={onNew}><Plus size={20} weight="bold" /><span><strong>Start new design</strong><small>Open the standard 800 × 450 × 250 mm template</small></span><ArrowRight className="start-arrow" size={18} /></button>
        <button className="start-secondary" onClick={onBrowse}><FolderOpen size={20} /><span><strong>Open saved project</strong><small>{designs.length ? `${designs.length} ${designs.length === 1 ? 'design' : 'designs'} stored locally` : 'No saved projects yet'}</small></span></button>
      </div>
    </section>

    <aside className="start-overview">
      <div className="template-summary">
        <div className="template-icon"><Ruler size={22} /></div>
        <div><span>STANDARD STARTING TEMPLATE</span><strong>800 × 450 × 250 mm</strong><small>50 / 50 / 50 / 80 mm rims · 20 mm fall to rear</small></div>
      </div>
      <div className="recent-head"><div><ClockCounterClockwise size={17} /><span>Recent projects</span></div>{designs.length > 3 && <button onClick={onBrowse}>View all</button>}</div>
      <div className="recent-list">
        {!recent.length && <div className="recent-empty"><strong>No recent projects</strong><span>Saved designs will appear here for quick access.</span></div>}
        {recent.map((design) => <button className="recent-project" key={design.id} onClick={() => onOpen(design)}>
          <span><strong>{design.reference || 'Untitled design'}</strong><small>{design.clientName || design.projectName || 'Client not specified'}</small></span>
          <em>{design.overallWidth} × {design.overallDepth} × {design.overallHeight}</em>
          <ArrowRight size={15} />
        </button>)}
      </div>
      <p className="local-note">Projects are stored locally in this browser.</p>
    </aside>
  </main>
}
