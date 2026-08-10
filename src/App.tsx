import { lazy, Suspense, useMemo, useRef, useState, type TouchEvent } from 'react'
import { ArrowLeft, Copy, DownloadSimple, FilePdf, FloppyDisk, FolderSimple, Plus, SidebarSimple, Stack, Warning } from '@phosphor-icons/react'
import { ParameterPanel } from './components/ParameterPanel'
import { AxonometricView, ClientPreview, FrontView, SideView, TopView } from './components/TechnicalSvg'
import { SavedDesigns } from './components/SavedDesigns'
import { StartScreen } from './components/StartScreen'
import { calculateGeometry } from './lib/sinkGeometry'
import { validateGeometry } from './lib/validation'
import { exportCanvasPng, exportPdf, exportPng, exportSvg } from './lib/export'
import { loadDesigns, persistDesign, removeDesign } from './lib/storage'
import { createDefaultDesign, type SinkDesign, type ViewName } from './types/sink'

const tabs: { key: ViewName; label: string }[] = [
  { key: 'threeD', label: '3D preview' }, { key: 'axonometric', label: 'Axonometric' }, { key: 'client', label: 'Client preview' }, { key: 'top', label: 'Top view' },
  { key: 'front', label: 'Front view' }, { key: 'side', label: 'Side section' },
]

const ThreeDPreview = lazy(() => import('./components/ThreeDPreview').then((module) => ({ default: module.ThreeDPreview })))

export default function App() {
  const [design, setDesign] = useState<SinkDesign>(createDefaultDesign)
  const [activeView, setActiveView] = useState<ViewName>('top')
  const [saved, setSaved] = useState<SinkDesign[]>(loadDesigns)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settingsCollapsed, setSettingsCollapsed] = useState(false)
  const [fitMobilePreview, setFitMobilePreview] = useState(true)
  const [mobileScreen, setMobileScreen] = useState<'settings' | 'preview'>('settings')
  const [showStart, setShowStart] = useState(true)
  const [notice, setNotice] = useState('')
  const activeSvg = useRef<SVGSVGElement>(null)
  const threeCanvas = useRef<HTMLCanvasElement>(null)
  const clientExportSvg = useRef<SVGSVGElement>(null)
  const swipeStart = useRef<{ x: number; y: number; blocked: boolean } | null>(null)
  const geometry = useMemo(() => calculateGeometry(design), [design])
  const errors = useMemo(() => validateGeometry(geometry), [geometry])
  const errorCount = Object.keys(errors).length

  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }
  const update = (patch: Partial<SinkDesign>) => {
    setDesign((current) => {
      const next = { ...current, ...patch }
      if (patch.drawerCount !== undefined) {
        const count = Math.min(6, Math.max(1, Math.round(patch.drawerCount)))
        next.drawerCount = count
        const sharedHeight = current.drawerHeights[0] ?? 240
        next.drawerHeights = Array.from({ length: count }, (_, index) => current.equalDrawerHeights ? sharedHeight : current.drawerHeights[index] ?? current.drawerHeights.at(-1) ?? 240)
      }
      if (patch.equalDrawerHeights === true) next.drawerHeights = Array.from({ length: next.drawerCount }, () => next.drawerHeights[0] ?? 240)
      return next
    })
  }
  const fresh = () => { setDesign(createDefaultDesign()); setActiveView('top'); setSettingsCollapsed(false); setFitMobilePreview(true); setMobileScreen('settings'); setShowStart(false); notify('New design ready') }
  const save = () => { if (errorCount) return notify('Resolve geometry checks before saving'); const next = { ...design, updatedAt: new Date().toISOString() }; setDesign(next); setSaved(persistDesign(next)); notify('Design saved locally') }
  const duplicate = (source = design) => { const next = { ...source, id: crypto.randomUUID(), reference: `${source.reference}-COPY`, updatedAt: new Date().toISOString() }; setDesign(next); setSaved(persistDesign(next)); setActiveView('top'); setSettingsCollapsed(false); setMobileScreen('settings'); setShowStart(false); setDrawerOpen(false); notify('Design duplicated') }
  const open = (source: SinkDesign) => { setDesign(source); setActiveView('top'); setSettingsCollapsed(false); setMobileScreen('settings'); setShowStart(false); setDrawerOpen(false); notify(`${source.reference} opened`) }
  const remove = (id: string) => { setSaved(removeDesign(id)); notify('Saved design deleted') }
  const fileName = (suffix: string = activeView) => `${design.reference || 'artiling-sink'}-${suffix}`.replace(/[^a-z0-9-_]/gi, '-')
  const runExport = async (kind: 'svg' | 'png' | 'pdf') => {
    if (errorCount) return notify('Resolve geometry checks before export')
    try {
      if (kind === 'pdf' && clientExportSvg.current) await exportPdf(clientExportSvg.current, fileName('client-preview'))
      else if (activeView === 'threeD' && kind === 'png' && threeCanvas.current) exportCanvasPng(threeCanvas.current, fileName('3d-preview'))
      else if (activeView === 'threeD' && kind === 'svg') return notify('3D preview is raster only. Use Export PNG.')
      else if (kind === 'svg' && activeSvg.current) exportSvg(activeSvg.current, fileName())
      else if (kind === 'png' && activeSvg.current) await exportPng(activeSvg.current, fileName())
      notify(`${kind.toUpperCase()} exported`)
    } catch { notify('Export failed. Please try again.') }
  }
  const startSwipe = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) return
    const target = event.target as Element
    const blockedByControls = Boolean(target.closest('.view-tabs, .view-3d-controls'))
    const blockedByCanvas = mobileScreen === 'preview' && (!fitMobilePreview || activeView === 'threeD') && Boolean(target.closest('.drawing-stage'))
    swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY, blocked: blockedByControls || blockedByCanvas }
  }
  const finishSwipe = (event: TouchEvent<HTMLElement>) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || start.blocked || event.changedTouches.length !== 1) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.25) return
    setMobileScreen(dx < 0 ? 'preview' : 'settings')
  }

  return <div className={`app-shell ${showStart ? 'start-mode' : ''} ${!showStart && mobileScreen === 'preview' ? 'mobile-preview-mode' : ''}`}>
    <header className="app-header">
      <div className="brand-lockup"><img className="brand-logo brand-app-icon" src="/icons/artiling-icon-192.png" alt="Artiling Studio" /><div><strong>ARTILING STUDIO</strong><small>Bespoke Sink Designer</small></div></div>
      <div className="header-reference"><span>{design.reference || 'UNSAVED'}</span><b>{design.overallWidth} × {design.overallDepth} × {design.overallHeight}</b><small>millimetres</small></div>
      <button className="saved-trigger" onClick={() => setDrawerOpen(true)}><FolderSimple size={17} /> Saved designs <em>{saved.length}</em></button>
    </header>

    {showStart ? <StartScreen designs={saved} onNew={fresh} onBrowse={() => setDrawerOpen(true)} onOpen={open} /> : <>
    <main className={`workspace ${settingsCollapsed ? 'settings-collapsed' : ''} ${mobileScreen === 'preview' ? 'mobile-preview-active' : 'mobile-settings-active'}`} onTouchStart={startSwipe} onTouchEnd={finishSwipe} onTouchCancel={() => { swipeStart.current = null }}>
      <ParameterPanel key={design.id} design={design} errors={errors} onChange={update} onShowPreview={() => setMobileScreen('preview')} />
      <section className="preview-panel">
        <div className="preview-toolbar">
          <div className="view-navigation">
            <button className="panel-toggle" onClick={() => setSettingsCollapsed((value) => !value)} aria-label={settingsCollapsed ? 'Show sink parameters' : 'Hide sink parameters'} title={settingsCollapsed ? 'Show parameters' : 'Expand preview'}><SidebarSimple size={17} /></button>
            <button className="mobile-settings-return" onClick={() => setMobileScreen('settings')} aria-label="Return to sink parameters"><ArrowLeft size={18} weight="bold" /></button>
            <nav className="view-tabs" aria-label="Drawing views">{tabs.map((tab) => <button key={tab.key} className={activeView === tab.key ? 'active' : ''} onClick={() => setActiveView(tab.key)}><span>{tab.label}</span></button>)}</nav>
          </div>
          {activeView !== 'threeD' && <button className="mobile-scale-toggle" onClick={() => setFitMobilePreview((value) => !value)} aria-pressed={fitMobilePreview}>Fit view</button>}
          <div className={`geometry-status ${errorCount ? 'invalid' : ''}`}>{errorCount ? <Warning size={14} /> : <span />} {errorCount ? `${errorCount} geometry ${errorCount === 1 ? 'check' : 'checks'}` : 'Live geometry'}</div>
        </div>
        <div className={`drawing-stage ${activeView === 'client' ? 'sheet-stage' : ''} ${fitMobilePreview ? 'mobile-fit' : 'mobile-readable'}`}>
          <div className="canvas-rulers"><span>0</span><span>100</span><span>200</span><span>300</span><span>400</span></div>
          {activeView !== 'threeD' && !fitMobilePreview && <div className="mobile-pan-note">Swipe to inspect drawing</div>}
          {activeView === 'client' && <ClientPreview g={geometry} svgRef={activeSvg} />}
          {activeView === 'threeD' && <Suspense fallback={<div className="loading-3d"><span /><strong>Preparing 3D geometry</strong></div>}><ThreeDPreview g={geometry} onCanvas={(canvas) => { threeCanvas.current = canvas }} /></Suspense>}
          {activeView === 'axonometric' && <AxonometricView g={geometry} svgRef={activeSvg} />}
          {activeView === 'top' && <TopView g={geometry} svgRef={activeSvg} />}
          {activeView === 'front' && <FrontView g={geometry} svgRef={activeSvg} />}
          {activeView === 'side' && <SideView g={geometry} svgRef={activeSvg} />}
        </div>
      </section>
    </main>

    <footer className="action-bar">
      <div className="action-group"><button onClick={fresh}><Plus />New design</button><button onClick={save} className="primary"><FloppyDisk />Save design</button><button onClick={() => duplicate()}><Copy />Duplicate</button></div>
      <div className="action-group export-group"><button onClick={() => runExport('png')}><DownloadSimple />Export PNG</button><button onClick={() => runExport('svg')}><Stack />Export SVG</button><button onClick={() => runExport('pdf')}><FilePdf />Export PDF</button></div>
    </footer>
    </>}

    <SavedDesigns designs={saved} open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={open} onDuplicate={duplicate} onDelete={remove} />
    {drawerOpen && <button className="drawer-backdrop" aria-label="Close saved designs" onClick={() => setDrawerOpen(false)} />}
    {notice && <div className="toast" role="status">{notice}</div>}
    <div className="export-only"><ClientPreview g={geometry} svgRef={clientExportSvg} /></div>
  </div>
}
