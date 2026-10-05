import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { ArrowLeft, CaretDown, Copy, DownloadSimple, FilePdf, FloppyDisk, FolderSimple, Plus, SidebarSimple, Stack, Warning } from '@phosphor-icons/react'
import { ParameterPanel } from './components/ParameterPanel'
import { PriceBar, PricePanel } from './components/PricePanel'
import { QuoteReview } from './components/QuoteReview'
import { AxonometricView, FrontView, SideView, TopView } from './components/TechnicalSvg'
import { ClientPreview } from './components/ClientSheet'
import { SavedDesigns } from './components/SavedDesigns'
import { StartScreen } from './components/StartScreen'
import { applyOpeningRules, calculateGeometry } from './lib/sinkGeometry'
import { validateGeometry } from './lib/validation'
import { designAdvisories } from './lib/review'
import { exportCanvasPng, exportPdf, exportPng, exportSvg } from './lib/export'
import { loadDesigns, loadDraft, nextReference, persistDesign, removeDesign, sameDesign, saveDraft } from './lib/storage'
import { priceDesign } from './pricing/fromDesign'
import { createDefaultDesign, createId, type SinkDesign, type ViewName } from './types/sink'

const tabs: { key: ViewName; label: string }[] = [
  { key: 'quote', label: 'Quote' }, { key: 'top', label: 'Top' }, { key: 'side', label: 'Section' }, { key: 'front', label: 'Front' },
  { key: 'threeD', label: '3D' }, { key: 'axonometric', label: 'Axonometric' }, { key: 'client', label: 'Client sheet' },
]

const ThreeDPreview = lazy(() => import('./components/ThreeDPreview').then((module) => ({ default: module.ThreeDPreview })))

const initialDraft = loadDraft()

export default function App() {
  const [saved, setSaved] = useState<SinkDesign[]>(loadDesigns)
  const [design, setDesign] = useState<SinkDesign>(() => initialDraft ?? createDefaultDesign(nextReference(loadDesigns())))
  const [baseline, setBaseline] = useState<SinkDesign | null>(() => initialDraft ? saved.find((item) => item.id === initialDraft.id) ?? null : null)
  const [activeView, setActiveView] = useState<ViewName>('top')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settingsCollapsed, setSettingsCollapsed] = useState(false)
  const [fitMobilePreview, setFitMobilePreview] = useState(true)
  const [mobileScreen, setMobileScreen] = useState<'settings' | 'preview'>('settings')
  const [showStart, setShowStart] = useState(!initialDraft)
  const [notice, setNotice] = useState(initialDraft ? 'Unsaved draft restored' : '')
  const noticeTimer = useRef<number | undefined>(undefined)
  const activeSvg = useRef<SVGSVGElement>(null)
  const threeCanvas = useRef<HTMLCanvasElement>(null)
  const clientExportSvg = useRef<SVGSVGElement>(null)
  const exportMenu = useRef<HTMLDetailsElement>(null)
  const swipeStart = useRef<{ x: number; y: number; blocked: boolean } | null>(null)

  const geometry = useMemo(() => calculateGeometry(design), [design])
  const errors = useMemo(() => validateGeometry(geometry), [geometry])
  const price = useMemo(() => priceDesign(design), [design])
  const warnings = useMemo(() => [...price.warnings, ...designAdvisories(design)], [price, design])
  const errorCount = Object.keys(errors).length
  const dirty = baseline ? !sameDesign(baseline, design) : true

  const notify = useCallback((message: string) => {
    window.clearTimeout(noticeTimer.current)
    setNotice(message)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2800)
  }, [])
  useEffect(() => { if (initialDraft) noticeTimer.current = window.setTimeout(() => setNotice(''), 2800) }, [])

  // Autosave the working design so a refresh never loses an enquiry.
  useEffect(() => {
    if (showStart) return
    const timer = window.setTimeout(() => saveDraft(design), 250)
    return () => window.clearTimeout(timer)
  }, [design, showStart])

  const update = (patch: Partial<SinkDesign>) => {
    setDesign((current) => {
      const next = applyOpeningRules(current, patch)
      // A round drain defaults to the centre of the basin, with the floor falling to it.
      if (patch.drainType === 'Circular' && current.drainType !== 'Circular' && patch.drainPosition === undefined) next.drainPosition = 'Centre'
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

  const confirmDiscard = () => showStart || !dirty || window.confirm(`Discard unsaved changes to ${design.reference || 'this design'}?`)
  const load = (next: SinkDesign, savedVersion: SinkDesign | null, message: string) => {
    setDesign(next); setBaseline(savedVersion); setActiveView('top'); setSettingsCollapsed(false); setMobileScreen('settings'); setShowStart(false); setDrawerOpen(false); notify(message)
  }
  const fresh = () => { if (!confirmDiscard()) return; const next = createDefaultDesign(nextReference(saved)); load(next, next, 'New design ready') }
  const save = () => {
    const next = { ...design, updatedAt: new Date().toISOString() }
    const result = persistDesign(next)
    if (!result.ok) return notify('Save failed. Browser storage is full or blocked.')
    setDesign(next); setBaseline(next); setSaved(result.designs)
    notify(errorCount ? `Saved with ${errorCount} geometry check${errorCount > 1 ? 's' : ''} outstanding` : 'Design saved')
  }
  const duplicate = (source = design) => {
    // Duplicating the current design carries its unsaved changes into the copy.
    if (source.id !== design.id && !confirmDiscard()) return
    const next = { ...source, id: createId(), reference: nextReference([...saved, design]), updatedAt: new Date().toISOString() }
    const result = persistDesign(next)
    if (!result.ok) return notify('Duplicate failed. Browser storage is full or blocked.')
    setSaved(result.designs); load(next, next, `Duplicated as ${next.reference}`)
  }
  const open = (source: SinkDesign) => { if (source.id !== design.id && !confirmDiscard()) return; load(source, source, `${source.reference} opened`) }
  const remove = (target: SinkDesign) => {
    if (!window.confirm(`Delete ${target.reference || 'this design'} permanently?`)) return
    setSaved(removeDesign(target.id))
    if (target.id === design.id) setBaseline(null)
    notify(`${target.reference} deleted`)
  }
  const openReview = () => { setActiveView('quote'); setMobileScreen('preview') }

  const fileName = (suffix: string = activeView) => `${design.reference || 'artiling-sink'}-${suffix}`.replace(/[^a-z0-9-_]/gi, '-')
  const runExport = async (kind: 'svg' | 'png' | 'pdf') => {
    if (exportMenu.current) exportMenu.current.open = false
    if (errorCount) return notify('Resolve geometry checks before exporting drawings')
    try {
      if (kind === 'pdf' && clientExportSvg.current) await exportPdf(clientExportSvg.current, fileName('client-sheet'))
      else if (activeView === 'quote') return notify('Open a drawing view to export PNG or SVG')
      else if (activeView === 'threeD' && kind === 'png' && threeCanvas.current) exportCanvasPng(threeCanvas.current, fileName('3d'))
      else if (activeView === 'threeD' && kind === 'svg') return notify('3D is raster only. Use PNG.')
      else if (kind === 'svg' && activeSvg.current) await exportSvg(activeSvg.current, fileName())
      else if (kind === 'png' && activeSvg.current) await exportPng(activeSvg.current, fileName())
      notify(`${kind.toUpperCase()} exported`)
    } catch { notify('Export failed. Please try again.') }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && !showStart) { event.preventDefault(); save() }
      if (event.key === 'Escape' && drawerOpen) setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const startSwipe = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) return
    const target = event.target as Element
    const blockedByControls = Boolean(target.closest('.view-tabs, .view-3d-controls, .segmented, .quote-review table'))
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

  const isDrawing = activeView !== 'quote' && activeView !== 'threeD'

  return <div className={`app-shell ${showStart ? 'start-mode' : ''} ${!showStart && mobileScreen === 'preview' ? 'mobile-preview-mode' : ''}`}>
    <header className="app-header">
      <div className="brand-lockup"><img className="brand-logo brand-app-icon" src="/icons/artiling-icon-192.png" alt="" /><div><strong>ARTILING STUDIO</strong><small>Sink Designer</small></div></div>
      <div className="header-reference">
        <span>{design.reference || 'UNSAVED'}</span>
        <b>{design.overallWidth} × {design.overallDepth} × {design.overallHeight}</b><small>mm</small>
        <i className={`save-state ${dirty ? 'is-dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'Saved'}</i>
      </div>
      <button className="saved-trigger" onClick={() => setDrawerOpen(true)} aria-label={`Saved designs (${saved.length})`}><FolderSimple size={17} aria-hidden="true" /><span>Saved designs</span> <em>{saved.length}</em></button>
    </header>

    {showStart ? <StartScreen designs={saved} onNew={fresh} onBrowse={() => setDrawerOpen(true)} onOpen={open} /> : <>
    <main className={`workspace ${settingsCollapsed ? 'settings-collapsed' : ''} ${mobileScreen === 'preview' ? 'mobile-preview-active' : 'mobile-settings-active'}`} onTouchStart={startSwipe} onTouchEnd={finishSwipe} onTouchCancel={() => { swipeStart.current = null }}>
      <ParameterPanel key={design.id} design={design} geometry={geometry} errors={errors} price={price} warnings={warnings} onChange={update} onShowPreview={() => setMobileScreen('preview')} />
      <section className="preview-panel" aria-label="Preview">
        <div className="preview-toolbar">
          <div className="view-navigation">
            <button className="panel-toggle" onClick={() => setSettingsCollapsed((value) => !value)} aria-label={settingsCollapsed ? 'Show configuration' : 'Hide configuration'} aria-pressed={settingsCollapsed}><SidebarSimple size={17} /></button>
            <button className="mobile-settings-return" onClick={() => setMobileScreen('settings')} aria-label="Back to configuration"><ArrowLeft size={18} weight="bold" /></button>
            <div className="view-tabs" role="tablist" aria-label="Views">{tabs.map((tab) => <button key={tab.key} role="tab" id={`tab-${tab.key}`} aria-selected={activeView === tab.key} aria-controls="view-panel" className={`${activeView === tab.key ? 'active' : ''} ${tab.key === 'quote' ? 'tab-quote' : ''}`} onClick={() => setActiveView(tab.key)}><span>{tab.label}</span></button>)}</div>
          </div>
          {isDrawing && <button className="mobile-scale-toggle" onClick={() => setFitMobilePreview((value) => !value)} aria-pressed={fitMobilePreview}>Fit view</button>}
          <div className={`geometry-status ${errorCount ? 'invalid' : ''}`} role="status">{errorCount ? <Warning size={14} aria-hidden="true" /> : <span aria-hidden="true" />} {errorCount ? `${errorCount} geometry ${errorCount === 1 ? 'check' : 'checks'}` : 'Geometry valid'}</div>
        </div>
        <div id="view-panel" role="tabpanel" aria-labelledby={`tab-${activeView}`} className={`drawing-stage ${activeView === 'client' ? 'sheet-stage' : ''} ${activeView === 'quote' ? 'quote-stage' : ''} ${fitMobilePreview ? 'mobile-fit' : 'mobile-readable'}`}>
          {isDrawing && !fitMobilePreview && <div className="mobile-pan-note">Swipe to inspect drawing</div>}
          {activeView === 'quote' && <QuoteReview design={design} geometry={geometry} price={price} warnings={warnings} errors={errors} onNotify={notify} />}
          {activeView === 'client' && <ClientPreview g={geometry} svgRef={activeSvg} />}
          {activeView === 'threeD' && <Suspense fallback={<div className="loading-3d"><span /><strong>Preparing 3D geometry</strong></div>}><ThreeDPreview g={geometry} onCanvas={(canvas) => { threeCanvas.current = canvas }} /></Suspense>}
          {activeView === 'axonometric' && <AxonometricView g={geometry} svgRef={activeSvg} />}
          {activeView === 'top' && <TopView g={geometry} svgRef={activeSvg} />}
          {activeView === 'front' && <FrontView g={geometry} svgRef={activeSvg} />}
          {activeView === 'side' && <SideView g={geometry} svgRef={activeSvg} />}
        </div>
      </section>
      <PricePanel design={design} price={price} warnings={warnings} onOpenReview={openReview} />
    </main>

    <footer className="action-bar">
      <PriceBar price={price} onOpenReview={openReview} />
      <div className="action-group">
        <button onClick={fresh}><Plus aria-hidden="true" /><span>New</span></button>
        <button onClick={() => duplicate()}><Copy aria-hidden="true" /><span>Duplicate</span></button>
        <details className="export-menu" ref={exportMenu}>
          <summary><DownloadSimple aria-hidden="true" /><span>Export</span><CaretDown aria-hidden="true" className="caret" /></summary>
          <div className="export-options">
            <button onClick={() => runExport('pdf')}><FilePdf aria-hidden="true" />Client sheet PDF</button>
            <button onClick={() => runExport('png')} disabled={activeView === 'quote'}><DownloadSimple aria-hidden="true" />Current view PNG</button>
            <button onClick={() => runExport('svg')} disabled={!isDrawing}><Stack aria-hidden="true" />Current view SVG</button>
          </div>
        </details>
        <button onClick={save} className="primary" title="Ctrl+S"><FloppyDisk aria-hidden="true" /><span>Save</span></button>
      </div>
    </footer>
    </>}

    <SavedDesigns designs={saved} currentId={design.id} open={drawerOpen} onClose={() => setDrawerOpen(false)} onOpen={open} onDuplicate={duplicate} onDelete={remove} />
    {drawerOpen && <div className="drawer-backdrop" aria-hidden="true" onClick={() => setDrawerOpen(false)} />}
    <div className="toast-region" role="status" aria-live="polite">{notice && <div className="toast">{notice}</div>}</div>
    <div className="export-only" aria-hidden="true"><ClientPreview g={geometry} svgRef={clientExportSvg} /></div>
  </div>
}
