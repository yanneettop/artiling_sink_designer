import type { ReactNode, Ref } from 'react'
import { describeFall, type SinkGeometry } from '../lib/sinkGeometry'
import { AxonometricView, FrontView, PaletteContext, sectionShownHeight, SideView, SvgDefs, TopView, type DrawingPalette } from './TechnicalSvg'
import { BRAND_MARK_PATH, BRAND_MARK_VIEWBOX } from './brandMark'

/**
 * Portrait A4 client design sheet, styled to match the Artiling quotation PDFs
 * so it can be dropped straight in as the drawing page of a quote.
 * Units are 2 × PDF points: 1190 × 1684 = 595 × 842 pt = A4.
 */
export const SHEET_WIDTH = 1190
export const SHEET_HEIGHT = 1684

const PAGE = '#f4efe8'
const INK = '#26231e'
const RULE = '#d8cdc1'

const quotePalette: DrawingPalette = {
  ink: INK, mid: '#8a8377', pale: RULE, cut: '#f7f3ed', paper: PAGE, slab: '#fbf9f5', basin: '#e9e1d6',
  faceFront: '#e9e1d6', faceRight: '#d3c6b6', opening: '#e9e1d6', rim: '#fbf9f5', soft: '#8a8377', lw: .7,
}

const LEFT = 114
const RIGHT = SHEET_WIDTH - LEFT

const clip = (text: string, max: number) => text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

function SectionHeading({ x = LEFT, y, index, title }: { x?: number; y: number; index?: number; title: string }) {
  return <text x={x} y={y} className="qs-section">{index ? `${index}  ·  ${title}` : title}</text>
}

/** Stacked label / value list beside the plan, like the numbered key on the quote drawing page. */
function KeyList({ x, y, width, rows }: { x: number; y: number; width: number; rows: [string, string][] }) {
  return <g transform={`translate(${x} ${y})`}>
    {rows.map(([label, value], index) => <g key={label} transform={`translate(0 ${index * 54})`}>
      <text className="qs-key-label">{label}</text>
      <text y="22" className="qs-key-value">{value}</text>
      {index < rows.length - 1 && <line x1="0" x2={width} y1="36" y2="36" className="qs-rule" />}
    </g>)}
  </g>
}

/** Label left, value right, hairline below — the quote's "additional items" rows. */
function SpecRows({ x, y, width, rows }: { x: number; y: number; width: number; rows: [string, string][] }) {
  return <g transform={`translate(${x} ${y})`}>
    {rows.map(([label, value], index) => <g key={label} transform={`translate(0 ${index * 42})`}>
      <text className="qs-row-label">{label}</text>
      <text x={width} textAnchor="end" className="qs-row-value">{value}</text>
      <line x1="0" x2={width} y1="16" y2="16" className="qs-rule" />
    </g>)}
  </g>
}

/** Nests a compact drawing, cropping it to its content box and scaling it into a slot. */
function Placed({ box, slot, maxScale = 1.6, children }: { box: { x: number; y: number; w: number; h: number }; slot: { x: number; y: number; w: number; h: number }; maxScale?: number; children: ReactNode }) {
  const s = Math.min(slot.w / box.w, slot.h / box.h, maxScale)
  const tx = slot.x + (slot.w - box.w * s) / 2 - box.x * s
  const ty = slot.y - box.y * s
  return <g transform={`translate(${tx} ${ty}) scale(${s})`}>{children}</g>
}

export function ClientPreview({ g, svgRef }: { g: SinkGeometry; svgRef?: Ref<SVGSVGElement> }) {
  const d = g.design
  const { fall, to } = describeFall(g)
  const issued = new Date(d.updatedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const material = d.material || (d.materialSupply === 'Client' ? 'Client supplied' : 'To be confirmed')
  const vanity = [d.drawersEnabled && `${d.drawerCount} drawers`, d.vanityCladding && 'porcelain clad', d.shelfCount > 0 && `${d.shelfCount} shelf`].filter(Boolean).join(' / ') || 'Not included'
  const drain = `${d.drainType === 'Circular' ? 'Round' : d.drainType === 'Linear' ? 'Exposed linear' : 'Concealed linear'} / ${d.drainType === 'Concealed Linear' ? 'rear' : d.drainPosition.toLowerCase()}`
  const tap = `${d.tapType}${d.tapType === 'Deck Mounted' ? ` / ${g.tapHoles.length} hole${g.tapHoles.length > 1 ? 's' : ''}` : ''}`

  const keyDimensions: [string, string][] = [
    ['OVERALL SIZE', `${d.overallWidth} × ${d.overallDepth} × ${d.overallHeight} mm`],
    ['BASIN OPENING', `${Math.round(g.basinWidth)} × ${Math.round(g.basinDepth)} mm`],
    ['RIMS  L / R / FRONT / REAR', `${d.leftRimWidth} / ${d.rightRimWidth} / ${d.frontRimWidth} / ${d.rearRimWidth} mm`],
    g.fallToDrain
      ? ['INTERNAL DEPTH  WALLS / DRAIN', `${Math.round(g.bowlDepthRear)} / ${Math.round(g.bowlDepthDrain)} mm`]
      : ['INTERNAL DEPTH  REAR / FRONT', `${Math.round(g.bowlDepthRear)} / ${Math.round(g.bowlDepthFront)} mm`],
    ['BASE', to === 'level' ? 'Flat' : `${fall} mm fall to ${to}`],
    ['BASINS / MOUNTING', `${d.basinCount} / ${d.mountingType === 'Wall Mounted' ? 'Wall-mounted' : d.mountingType}`],
  ]
  const fittingsLeft: [string, string][] = [
    ['Porcelain', clip(material, 30)],
    ['Finish / thickness', `${d.finish} / ${d.porcelainThickness} mm`],
    ['Drain', drain],
    ['Drain cover', d.drainType === 'Concealed Linear' ? `Full width × ${d.coverPlateDepth} mm` : '—'],
  ]
  const fittingsRight: [string, string][] = [
    ['Tap', tap],
    ['Overflow', d.overflow ? 'Included' : 'None'],
    ['Back upstand', d.upstandEnabled ? `${d.backUpstandHeight} mm` : 'None'],
    ['Vanity', clip(vanity, 30)],
  ]
  const meta: [string, string][] = [
    ['PREPARED FOR', clip(d.clientName || 'To be confirmed', 22)],
    ['PROJECT', clip(d.projectName || d.siteLocation || 'Bespoke basin', 22)],
    ['OVERALL SIZE', `${d.overallWidth} × ${d.overallDepth} mm`],
    ['ISSUED', issued],
  ]

  // Section slot: fit the compact section's real content height, so thin slabs grow and tall pedestals shrink.
  const upstand = d.upstandEnabled ? d.backUpstandHeight : 0
  const sectionH = sectionShownHeight(g).shown + upstand
  const sideScale = Math.min(330 / d.overallDepth, 165 / sectionH)
  const sectionTop = 62
  const sectionBottom = 92 + sectionH * sideScale + 46

  return <svg ref={svgRef} className="technical-svg client-sheet quote-sheet" viewBox={`0 0 ${SHEET_WIDTH} ${SHEET_HEIGHT}`} role="img" aria-label="Client design sheet">
    <PaletteContext.Provider value={quotePalette}>
      <SvgDefs />
      <rect width={SHEET_WIDTH} height={SHEET_HEIGHT} fill={PAGE} />

      {/* Running header, as on every quote page */}
      <svg x={LEFT} y="78" width="30" height="42" viewBox={BRAND_MARK_VIEWBOX}><path d={BRAND_MARK_PATH} fill={INK} /></svg>
      <text x={LEFT + 50} y="108" className="qs-brand">ARTILING STUDIO</text>
      <text x={RIGHT} y="108" textAnchor="end" className="qs-running">{d.reference || 'UNSAVED DESIGN'}</text>
      <line x1={LEFT} x2={RIGHT} y1="150" y2="150" className="qs-rule" />

      {/* Title */}
      <text x={LEFT} y="212" className="qs-kicker">DESIGN DRAWING  ·  {d.reference || 'UNSAVED DESIGN'}</text>
      <text x={LEFT} y="272" className="qs-title">Bespoke Porcelain Basin</text>
      {meta.map(([label, value], index) => <g key={label} transform={`translate(${LEFT + index * 240} 322)`}>
        <text className="qs-meta-label">{label}</text>
        <text y="30" className="qs-meta-value">{value}</text>
      </g>)}
      <line x1={LEFT} x2={RIGHT} y1="382" y2="382" className="qs-rule" />

      {/* 1 · Plan with key dimensions */}
      <SectionHeading y={430} index={1} title="TOP VIEW" />
      <Placed box={{ x: 18, y: 44, w: 410, h: 240 }} slot={{ x: LEFT - 10, y: 452, w: 660, h: 330 }}>
        <TopView g={g} compact showDimensions />
      </Placed>
      <KeyList x={800} y={476} width={RIGHT - 800} rows={keyDimensions} />

      {/* 2 · Section and 3 · form / front elevation */}
      <SectionHeading y={836} index={2} title="SECTION  ·  FRONT TO BACK" />
      <Placed box={{ x: 46, y: sectionTop, w: 400, h: sectionBottom - sectionTop }} slot={{ x: LEFT, y: 862, w: 450, h: 270 }} maxScale={1.25}>
        <SideView g={g} compact showDimensions />
      </Placed>
      {d.drawersEnabled
        ? <>
          <SectionHeading x={630} y={836} index={3} title="FRONT ELEVATION" />
          <Placed box={{ x: 24, y: 52, w: 400, h: 245 }} slot={{ x: 630, y: 862, w: RIGHT - 630, h: 270 }} maxScale={1.25}>
            <FrontView g={g} compact showDimensions />
          </Placed>
        </>
        : <>
          <SectionHeading x={630} y={836} index={3} title="AXONOMETRIC  ·  NOT TO SCALE" />
          <AxonometricView g={g} sheet={{ x: 630, y: 856, width: RIGHT - 630, height: 280 }} />
        </>}
      <line x1={LEFT} x2={RIGHT} y1="1168" y2="1168" className="qs-rule" />

      {/* 4 · Material and fittings */}
      <SectionHeading y={1214} index={4} title="MATERIAL & FITTINGS" />
      <SpecRows x={LEFT} y={1262} width={440} rows={fittingsLeft} />
      <SpecRows x={RIGHT - 440} y={1262} width={440} rows={fittingsRight} />

      {/* Notes and approval */}
      <SectionHeading y={1460} title="NOTES" />
      <g className="qs-note" transform={`translate(${LEFT} 1496)`}>
        <text>All dimensions in millimetres. Drawing not to scale; do not measure from it.</text>
        <text y="24">Site dimensions, porcelain selection and fittings to be verified before fabrication.</text>
        <text y="48">Final slab colour and veining may vary from the drawing and any sample.</text>
      </g>
      <SectionHeading x={RIGHT - 330} y={1460} title="CLIENT APPROVAL" />
      <line x1={RIGHT - 330} x2={RIGHT - 150} y1="1530" y2="1530" className="qs-sign" />
      <line x1={RIGHT - 120} x2={RIGHT} y1="1530" y2="1530" className="qs-sign" />
      <text x={RIGHT - 330} y="1552" className="qs-note">Signature</text>
      <text x={RIGHT - 120} y="1552" className="qs-note">Date</text>

      {/* Running footer */}
      <line x1={LEFT} x2={RIGHT} y1="1584" y2="1584" className="qs-rule" />
      <text x={LEFT} y="1614" className="qs-running">Artiling Studio  ·  info@artilingstudio.co.uk  ·  +44 7481 613339  ·  artilingstudio.co.uk</text>
      <text x={RIGHT} y="1614" textAnchor="end" className="qs-running">Design drawing</text>
    </PaletteContext.Provider>
  </svg>
}
