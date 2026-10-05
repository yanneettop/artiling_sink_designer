import { createContext, useContext, type ReactNode, type Ref } from 'react'
import type { SinkGeometry } from '../lib/sinkGeometry'

/** Drawing colours. The client sheet swaps in the warm quote palette; every other view keeps the default. */
export type DrawingPalette = {
  ink: string; mid: string; pale: string; cut: string; paper: string; slab: string; basin: string
  faceFront: string; faceRight: string; opening: string; rim: string; soft: string; lw: number
}
export const defaultPalette: DrawingPalette = {
  ink: '#20211f', mid: '#777871', pale: '#d8d8d2', cut: '#eeeeea', paper: '#fdfdfb', slab: '#fdfdfb', basin: '#f7f7f3',
  faceFront: '#e8e5df', faceRight: '#cec9c0', opening: '#efede7', rim: '#f8f7f3', soft: '#77766f', lw: 1,
}
export const PaletteContext = createContext(defaultPalette)
const usePalette = () => useContext(PaletteContext)

type DimProps = { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number; vertical?: boolean; compact?: boolean; bg?: string }
type Point2D = { x: number; y: number }

export function DimensionLine({ x1, y1, x2, y2, label, offset = 0, vertical = false, compact = false, bg }: DimProps) {
  const pal = usePalette()
  const ax1 = vertical ? x1 + offset : x1
  const ax2 = vertical ? x2 + offset : x2
  const ay1 = vertical ? y1 : y1 + offset
  const ay2 = vertical ? y2 : y2 + offset
  const textX = (ax1 + ax2) / 2 + (vertical ? -5 : 0)
  const textY = (ay1 + ay2) / 2 + (vertical ? 0 : -5)
  return <g className="dimension">
    <line x1={x1} y1={y1} x2={ax1} y2={ay1} className="extension" />
    <line x1={x2} y1={y2} x2={ax2} y2={ay2} className="extension" />
    <line x1={ax1} y1={ay1} x2={ax2} y2={ay2} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
    <rect x={textX - (label.length * (compact ? 2.25 : 2.7))} y={textY - 6} width={label.length * (compact ? 4.5 : 5.4)} height="12" fill={bg ?? pal.paper} />
    <text x={textX} y={textY + 3} textAnchor="middle" transform={vertical ? `rotate(-90 ${textX} ${textY})` : undefined}>{label}</text>
  </g>
}

function ProjectedDimension({ a, b, label, offset }: { a: Point2D; b: Point2D; label: string; offset: number }) {
  const dx = b.x - a.x, dy = b.y - a.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const nx = -dy / length, ny = dx / length
  const p1 = { x: a.x + nx * offset, y: a.y + ny * offset }
  const p2 = { x: b.x + nx * offset, y: b.y + ny * offset }
  let angle = Math.atan2(dy, dx) * 180 / Math.PI
  if (angle > 90 || angle < -90) angle += 180
  const tx = (p1.x + p2.x) / 2, ty = (p1.y + p2.y) / 2 - 6
  return <g className="projected-dimension">
    <line x1={a.x} y1={a.y} x2={p1.x} y2={p1.y} className="extension" />
    <line x1={b.x} y1={b.y} x2={p2.x} y2={p2.y} className="extension" />
    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
    <text x={tx} y={ty} textAnchor="middle" transform={`rotate(${angle} ${tx} ${ty})`}>{label}</text>
  </g>
}

export function SvgDefs() {
  const pal = usePalette()
  return <defs>
    <marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M 7 1 L 0 3.5 L 7 6" fill="none" stroke={pal.mid} strokeWidth={0.8 * pal.lw} /></marker>
    <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill={pal.ink} /></marker>
    <pattern id="cutHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke={pal.pale} strokeWidth={2 * pal.lw} /></pattern>
  </defs>
}

function DrainSymbol({ g, sx, sy, x, y }: { g: SinkGeometry; sx: number; sy: number; x: number; y: number }) {
  const pal = usePalette()
  const d = g.design
  const basinW = g.basins[0].width
  if (d.drainType === 'Circular') return <g><circle cx={x} cy={y} r={Math.max(4, d.drainDiameter * sx / 2)} fill="none" stroke={pal.ink} /><line x1={x - 4} x2={x + 4} y1={y} y2={y} stroke={pal.mid} /><line x1={x} x2={x} y1={y - 4} y2={y + 4} stroke={pal.mid} /></g>
  const drainWidth = Math.min(basinW * sx - 12, d.drainLength * sx)
  const height = Math.max(4, d.drainWidth * sy)
  if (d.drainType === 'Linear') return <rect x={x - drainWidth / 2} y={y - height / 2} width={drainWidth} height={height} fill={pal.ink} rx="1" />
  // The concealed-drain lid runs the full internal width of the basin.
  const coverWidth = basinW * sx
  const coverH = Math.max(7, d.coverPlateDepth * sy)
  return <g>
    <rect x={x - coverWidth / 2} y={y - coverH / 2} width={coverWidth} height={coverH} fill={pal.cut} stroke={pal.ink} strokeWidth={0.8 * pal.lw} />
  </g>
}

function ViewFrame({ children, title, subtitle, viewBox, svgRef, compact = false }: { children: ReactNode; title: string; subtitle: string; viewBox: string; svgRef?: Ref<SVGSVGElement>; compact?: boolean }) {
  return <svg ref={svgRef} className={`technical-svg ${compact ? 'compact-svg' : ''}`} width={compact ? 470 : undefined} height={compact ? 300 : undefined} viewBox={viewBox} role="img" aria-label={`${title}, ${subtitle}`}>
    <SvgDefs />
    <text x="28" y="28" className="view-title">{title}</text>
    <text x="28" y="44" className="view-subtitle">{subtitle}</text>
    {children}
  </svg>
}

export function TopView({ g, compact = false, showDimensions = !compact, svgRef }: { g: SinkGeometry; compact?: boolean; showDimensions?: boolean; svgRef?: Ref<SVGSVGElement> }) {
  const pal = usePalette()
  const d = g.design
  const plot = compact ? { x: 55, y: 58, w: 360, h: 180 } : { x: 100, y: 95, w: 620, h: 350 }
  const scale = Math.min(plot.w / d.overallWidth, plot.h / d.overallDepth)
  const w = d.overallWidth * scale, h = d.overallDepth * scale
  const ox = plot.x + (plot.w - w) / 2, oy = plot.y + (plot.h - h) / 2
  const bx = ox + g.edgeLeft * scale, by = oy + g.edgeBack * scale
  const bw = g.basinWidth * scale, bh = g.basinDepth * scale
  const drainX = ox + g.drainX * scale, drainY = oy + g.drainY * scale
  const subtitle = `${d.shapeType === 'Irregular' ? 'Rectangular outline shown · irregular shape by template · ' : 'Scale to fit · '}${d.overallWidth} × ${d.overallDepth} mm${d.mountingType === 'Wall Mounted' ? ' · wall-mounted' : ''}`
  return <ViewFrame svgRef={svgRef} compact={compact} title="TOP VIEW" subtitle={subtitle} viewBox={compact ? '0 0 470 300' : '0 0 820 530'}>
    <g className="drawing-lines">
      {d.mountingType === 'Wall Mounted' && <g>
        <rect x={ox - 12} y={oy - 9} width={w + 24} height={8} fill="url(#cutHatch)" stroke="none" />
        <line x1={ox - 12} x2={ox + w + 12} y1={oy - 1} y2={oy - 1} stroke={pal.ink} strokeWidth={1.2 * pal.lw} />
        {!compact && <text x={ox + w + 16} y={oy - 2} className="technical-label">WALL</text>}
      </g>}
      <rect x={ox} y={oy} width={w} height={h} fill={pal.slab} stroke={pal.ink} strokeWidth={2 * pal.lw} />
      {g.basins.map((basin, index) => <rect key={index} x={ox + basin.x * scale} y={by} width={basin.width * scale} height={bh} fill={pal.basin} stroke={pal.ink} strokeWidth={1.3 * pal.lw} />)}
      {/* Four-way fall: valley lines from each internal corner to the drain. */}
      {g.fallToDrain && g.basins.map((basin, index) => {
        const drain = g.drains[index]
        const corners = [[basin.x, g.edgeBack], [basin.x + basin.width, g.edgeBack], [basin.x + basin.width, g.edgeBack + g.basinDepth], [basin.x, g.edgeBack + g.basinDepth]]
        return <g key={`fall-${index}`}>{corners.map(([cx, cy], i) => <line key={i} x1={ox + cx * scale} y1={oy + cy * scale} x2={ox + drain.x * scale} y2={oy + drain.y * scale} stroke={pal.mid} strokeWidth={.7 * pal.lw} strokeDasharray="3 2" />)}</g>
      })}
      {d.upstandEnabled && <rect x={ox} y={oy} width={w} height={Math.max(4, d.porcelainThickness * scale)} fill={pal.cut} stroke={pal.ink} strokeWidth={1 * pal.lw} />}
      {g.drains.map((drain, index) => <DrainSymbol key={index} g={g} sx={scale} sy={scale} x={ox + drain.x * scale} y={oy + drain.y * scale} />)}
      {d.tapType === 'Deck Mounted' && g.tapHoles.map((hole, i) => <circle key={i} cx={ox + hole.x * scale} cy={oy + hole.y * scale} r={Math.max(3, d.tapHoleDiameter * scale / 2)} fill="none" stroke={pal.ink} strokeWidth={1.3 * pal.lw} />)}
      {d.tapType === 'Wall Mounted' && g.tapHoles.map((hole, i) => <g key={i}>
        <rect x={ox + hole.x * scale - 5} y={oy - 8} width={10} height={8} fill={pal.ink} />
        <line x1={ox + hole.x * scale} x2={ox + hole.x * scale} y1={oy} y2={by + 6} stroke={pal.mid} strokeDasharray="2 2" />
      </g>)}
    </g>
    {showDimensions && <>
      <DimensionLine x1={ox} y1={compact ? oy + h : oy} x2={ox + w} y2={compact ? oy + h : oy} label={`${d.overallWidth} mm`} offset={compact ? 35 : -34} compact={compact} />
      <DimensionLine x1={ox} y1={oy} x2={ox} y2={oy + h} label={`${d.overallDepth} mm`} offset={compact ? -24 : -45} vertical compact={compact} />
      {/* Compact sheets keep basin dimensions inside the opening so they never sit on the rim lines. */}
      <DimensionLine x1={bx} y1={by + bh} x2={bx + g.basins[0].width * scale} y2={by + bh} label={`${Math.round(g.basins[0].width)} mm`} offset={compact ? -16 : 34} compact={compact} bg={compact ? pal.basin : undefined} />
      <DimensionLine x1={bx + bw} y1={by} x2={bx + bw} y2={by + bh} label={`${Math.round(g.basinDepth)} mm`} offset={compact ? -18 : 35} vertical compact={compact} bg={compact ? pal.basin : undefined} />
      {!compact && <>
        <DimensionLine x1={ox} y1={oy + h} x2={bx} y2={oy + h} label={`${Math.round(g.edgeLeft)} mm`} offset={55} compact />
        <DimensionLine x1={bx + bw} y1={oy + h} x2={ox + w} y2={oy + h} label={`${Math.round(g.edgeRight)} mm`} offset={55} compact />
        <DimensionLine x1={ox + w} y1={oy} x2={ox + w} y2={by} label={`${Math.round(g.edgeBack)} mm`} offset={57} vertical compact />
        <DimensionLine x1={ox + w} y1={by + bh} x2={ox + w} y2={oy + h} label={`${Math.round(g.edgeFront)} mm`} offset={57} vertical compact />
      </>}
      <text
        x={drainX}
        y={d.drainType === 'Concealed Linear' ? drainY : drainY - 15}
        textAnchor="middle"
        dominantBaseline={d.drainType === 'Concealed Linear' ? 'middle' : undefined}
        className="technical-label"
      >{d.drainType === 'Circular' ? 'ROUND' : d.drainType === 'Linear' ? 'LINEAR' : 'CONCEALED'} DRAIN{d.drainType === 'Concealed Linear' && g.basins.length === 1 ? ' / FULL WIDTH COVER' : ''}</text>
      {g.basins.length > 1 && !compact && <text x={bx + bw / 2} y={by + bh - 10} textAnchor="middle" className="technical-label">{g.basins.length} BASINS · {Math.round(g.dividerWidth)} mm DIVIDERS</text>}
    </>}
  </ViewFrame>
}

export function FrontView({ g, compact = false, showDimensions = !compact, svgRef }: { g: SinkGeometry; compact?: boolean; showDimensions?: boolean; svgRef?: Ref<SVGSVGElement> }) {
  const pal = usePalette()
  const d = g.design
  const drawerHeights = d.drawersEnabled ? d.drawerHeights.slice(0, d.drawerCount) : []
  const drawerWidthMm = d.drawerAutoWidth ? d.overallWidth : d.drawerWidth
  const drawerAssemblyHeight = d.drawersEnabled ? d.drawerTopGap + drawerHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, drawerHeights.length - 1) * d.drawerGap : 0
  const totalHeight = d.overallHeight + drawerAssemblyHeight
  const maxWidth = Math.max(d.overallWidth, d.drawersEnabled ? drawerWidthMm : 0)
  const scale = Math.min((compact ? 360 : 610) / maxWidth, (compact ? 185 : 330) / totalHeight)
  const w = d.overallWidth * scale, h = d.overallHeight * scale
  const centreX = compact ? 235 : 410
  const ox = centreX - w / 2, oy = compact ? 68 : 105
  const drawerW = drawerWidthMm * scale
  const drawerX = centreX - drawerW / 2
  let nextDrawerY = oy + h + d.drawerTopGap * scale
  const renderedDrawers = drawerHeights.map((height, index) => {
    const y = nextDrawerY
    const scaledHeight = height * scale
    nextDrawerY += scaledHeight + d.drawerGap * scale
    return { index, height, y, scaledHeight }
  })
  const subtitle = d.drawersEnabled ? `${d.overallWidth} × ${d.overallHeight} mm / ${d.drawerCount} DRAWERS` : `${d.overallWidth} × ${d.overallHeight} mm`
  return <ViewFrame svgRef={svgRef} compact={compact} title="FRONT ELEVATION" subtitle={subtitle} viewBox={compact ? '0 0 470 300' : '0 0 820 530'}>
    <rect x={ox} y={oy} width={w} height={h} fill={pal.slab} stroke={pal.ink} strokeWidth={2 * pal.lw} />
    {!compact && <text x={ox + 10} y={oy + 18} className="technical-label">ONE-PIECE PORCELAIN FASCIA</text>}
    {renderedDrawers.map((drawer) => <g key={drawer.index}>
      <rect x={drawerX} y={drawer.y} width={drawerW} height={drawer.scaledHeight} fill={pal.basin} stroke={pal.ink} strokeWidth={1.4 * pal.lw} />
      {!compact && <>
        <text x={drawerX + 10} y={drawer.y + 18} className="technical-label">DRAWER {drawer.index + 1} / {drawerWidthMm} W × {d.drawerDepth} D × {drawer.height} H mm</text>
        <DimensionLine x1={drawerX + drawerW} y1={drawer.y} x2={drawerX + drawerW} y2={drawer.y + drawer.scaledHeight} label={`${drawer.height} mm`} offset={27} vertical compact />
      </>}
    </g>)}
    {showDimensions && <>
      {/* Compact drawings skip the slab width when the drawer dimension below already states it. */}
      {!(compact && d.drawersEnabled && drawerWidthMm === d.overallWidth) && <DimensionLine x1={ox} y1={compact ? oy + h : oy} x2={ox + w} y2={compact ? oy + h : oy} label={`${d.overallWidth} mm`} offset={compact ? 25 : -36} compact={compact} />}
      <DimensionLine x1={ox} y1={oy} x2={ox} y2={oy + h} label={`${d.overallHeight} mm`} offset={compact ? -25 : -45} vertical compact={compact} />
      {d.drawersEnabled && renderedDrawers.length > 0 && <DimensionLine x1={drawerX} y1={renderedDrawers.at(-1)!.y + renderedDrawers.at(-1)!.scaledHeight} x2={drawerX + drawerW} y2={renderedDrawers.at(-1)!.y + renderedDrawers.at(-1)!.scaledHeight} label={`${drawerWidthMm} mm`} offset={28} />}
    </>}
  </ViewFrame>
}

/**
 * Height drawn in section. Tall pedestals are shown broken just below the basin
 * so the basin stays legible; the height dimension still states the true value.
 */
export function sectionShownHeight(g: SinkGeometry): { shown: number; broken: boolean } {
  const deepest = Math.max(g.bowlDepthRear, g.bowlDepthFront, g.bowlDepthDrain) + g.design.porcelainThickness
  const broken = g.design.overallHeight > deepest + 260
  return { shown: broken ? deepest + 120 : g.design.overallHeight, broken }
}

export function SideView({ g, compact = false, showDimensions = !compact, svgRef }: { g: SinkGeometry; compact?: boolean; showDimensions?: boolean; svgRef?: Ref<SVGSVGElement> }) {
  const pal = usePalette()
  const d = g.design
  const { shown, broken } = sectionShownHeight(g)
  const totalH = shown + (d.upstandEnabled ? d.backUpstandHeight : 0)
  const scale = Math.min((compact ? 330 : 540) / d.overallDepth, (compact ? 165 : 315) / totalH)
  const w = d.overallDepth * scale, h = shown * scale
  const ox = compact ? 75 : 150, oy = compact ? 92 + (d.upstandEnabled ? d.backUpstandHeight * scale : 0) : 130 + (d.upstandEnabled ? d.backUpstandHeight * scale : 0)
  const backX = ox, frontX = ox + w
  const innerTop = oy + d.porcelainThickness * scale
  const frontBaseY = oy + g.bowlDepthFront * scale
  const rearBaseY = oy + g.bowlDepthRear * scale
  const basinBackX = ox + g.edgeBack * scale
  const basinFrontX = ox + (g.edgeBack + g.basinDepth) * scale
  const concealedAtRear = d.drainType === 'Concealed Linear' && d.drainPosition === 'Rear'
  const coverSectionWidth = Math.min(g.basinDepth * scale * .45, d.coverPlateDepth * scale)
  // One continuous fall across the whole base; the lid sits over it at the rear.
  const slopeStartX = basinBackX
  const calculatedFall = Math.abs(g.bowlDepthRear - g.bowlDepthFront)
  const fallDirection = g.bowlDepthRear > g.bowlDepthFront ? 'REAR' : g.bowlDepthFront > g.bowlDepthRear ? 'FRONT' : 'LEVEL'
  const slopeSpan = Math.max(1, basinFrontX - slopeStartX)
  const floorYAt = (x: number) => rearBaseY + ((x - slopeStartX) / slopeSpan) * (frontBaseY - rearBaseY)
  const flowStartX = fallDirection === 'REAR' ? slopeStartX + slopeSpan * .82 : slopeStartX + slopeSpan * .18
  const flowEndX = fallDirection === 'REAR' ? slopeStartX + slopeSpan * .22 : slopeStartX + slopeSpan * .78
  const flowStartY = floorYAt(flowStartX) - (compact ? 10 : 15)
  const flowEndY = floorYAt(flowEndX) - (compact ? 10 : 15)
  // Four-way fall: the section cuts through the drain, so the floor dips to it from both walls.
  const funnel = g.fallToDrain
  const drainSX = ox + g.drainY * scale
  const drainBaseY = oy + g.bowlDepthDrain * scale
  const floorPoints = funnel ? `${basinBackX},${rearBaseY} ${drainSX},${drainBaseY} ${basinFrontX},${frontBaseY}` : `${slopeStartX},${rearBaseY} ${basinFrontX},${frontBaseY}`
  const cavityPath = `M ${basinBackX} ${oy - 3} L ${basinBackX} ${rearBaseY} L ${floorPoints.split(' ').map((p) => p.replace(',', ' ')).join(' L ')} L ${basinFrontX} ${oy - 3} Z`
  const funnelArrow = (fromX: number) => {
    const t = .55
    const x1 = fromX, x2 = fromX + (drainSX - fromX) * t
    const yAt = (x: number) => x <= drainSX ? rearBaseY + (x - basinBackX) / Math.max(1, drainSX - basinBackX) * (drainBaseY - rearBaseY) : drainBaseY + (x - drainSX) / Math.max(1, basinFrontX - drainSX) * (frontBaseY - drainBaseY)
    const lift = compact ? 9 : 14
    return { x1, y1: yAt(x1) - lift, x2, y2: yAt(x2) - lift }
  }
  return <ViewFrame svgRef={svgRef} compact={compact} title="SIDE SECTION A-A" subtitle={`${d.overallDepth} × ${d.overallHeight} mm${d.mountingType === 'Wall Mounted' ? ' · wall-mounted' : ''}`} viewBox={compact ? '0 0 470 300' : '0 0 820 530'}>
    {d.mountingType === 'Wall Mounted' && <g>
      <rect x={backX - 16} y={oy - (d.upstandEnabled ? d.backUpstandHeight * scale : 0) - 24} width={14} height={h + (d.upstandEnabled ? d.backUpstandHeight * scale : 0) + 48} fill="url(#cutHatch)" stroke="none" />
      <line x1={backX - 2} x2={backX - 2} y1={oy - (d.upstandEnabled ? d.backUpstandHeight * scale : 0) - 24} y2={oy + h + 24} stroke={pal.ink} strokeWidth={1.2 * pal.lw} />
      {showDimensions && <text x={backX - 9} y={oy + h + 36} textAnchor="middle" className="technical-label">WALL</text>}
    </g>}
    {d.tapType === 'Wall Mounted' && <path d={`M ${backX - 2} ${oy - 26} h ${Math.max(18, g.edgeBack * scale + 10)} v 7`} fill="none" stroke={pal.ink} strokeWidth={3 * pal.lw} strokeLinecap="round" />}
    <rect x={ox} y={oy} width={w} height={h} fill="url(#cutHatch)" stroke={pal.ink} strokeWidth={2 * pal.lw} />
    {broken && <g>
      <rect x={ox - 3} y={oy + h - 3} width={w + 6} height={8} fill={pal.paper} />
      <polyline points={`${ox - 8},${oy + h} ${ox + w / 2 - 9},${oy + h} ${ox + w / 2 - 4},${oy + h - 7} ${ox + w / 2 + 4},${oy + h + 7} ${ox + w / 2 + 9},${oy + h} ${ox + w + 8},${oy + h}`} fill="none" stroke={pal.ink} strokeWidth={1.2 * pal.lw} />
    </g>}
    <path d={cavityPath} fill={pal.paper} stroke="none" />
    <line x1={basinBackX} y1={oy} x2={basinBackX} y2={rearBaseY} stroke={pal.ink} strokeWidth={1.5 * pal.lw} />
    <line x1={basinFrontX} y1={oy} x2={basinFrontX} y2={frontBaseY} stroke={pal.ink} strokeWidth={1.5 * pal.lw} />
    <line x1={backX} y1={oy} x2={basinBackX} y2={oy} stroke={pal.ink} strokeWidth={2 * pal.lw} />
    <line x1={basinFrontX} y1={oy} x2={frontX} y2={oy} stroke={pal.ink} strokeWidth={2 * pal.lw} />
    <polyline points={floorPoints} fill="none" stroke={pal.ink} strokeWidth={2 * pal.lw} strokeLinejoin="round" />
    {d.upstandEnabled && <rect x={backX} y={oy - d.backUpstandHeight * scale} width={d.porcelainThickness * scale} height={d.backUpstandHeight * scale} fill="url(#cutHatch)" stroke={pal.ink} strokeWidth={1.5 * pal.lw} />}
    {concealedAtRear && (() => {
      const coverH = Math.max(4, d.porcelainThickness * scale)
      const coverTop = floorYAt(basinBackX + coverSectionWidth) - coverH
      // Label sits above the rim with a leader so it never crosses the depth dimension or the cavity walls.
      const labelX = basinBackX + coverSectionWidth + (compact ? 22 : 34)
      const labelY = oy - (compact ? 10 : 14)
      return <g>
        <rect x={basinBackX} y={coverTop} width={coverSectionWidth} height={coverH} fill={pal.cut} stroke={pal.ink} strokeWidth={1 * pal.lw} />
        {(!compact || showDimensions) && <>
          <polyline points={`${basinBackX + coverSectionWidth / 2},${coverTop} ${basinBackX + coverSectionWidth / 2},${labelY + 4} ${labelX - 3},${labelY + 4}`} fill="none" stroke={pal.mid} strokeWidth={.7 * pal.lw} />
          <text x={labelX} y={labelY + 6} className="technical-label">CONCEALED COVER</text>
        </>}
      </g>
    })()}
    {d.drainPosition === 'Rear' && d.drainType !== 'Concealed Linear' && <rect x={basinBackX} y={rearBaseY - 4} width={Math.max(12, d.drainWidth * scale)} height="7" fill={pal.ink} />}
    {d.drainPosition === 'Centre' && d.drainType === 'Circular' && <rect x={drainSX - Math.max(6, d.drainDiameter * scale / 2)} y={(funnel ? drainBaseY : floorYAt(drainSX)) - 3} width={Math.max(12, d.drainDiameter * scale)} height="7" fill={pal.ink} />}
    {showDimensions && <>
      <text x={backX} y={oy + h + 14} className="orientation-label">REAR</text>
      <text x={frontX} y={oy + h + 14} textAnchor="end" className="orientation-label">FRONT</text>
      <DimensionLine x1={backX} y1={oy + h} x2={frontX} y2={oy + h} label={`${d.overallDepth} mm`} offset={compact ? 30 : 42} compact={compact} />
      <DimensionLine x1={frontX} y1={oy} x2={frontX} y2={oy + h} label={`${d.overallHeight} mm${broken ? ' (broken)' : ''}`} offset={compact ? 27 : 52} vertical compact={compact} />
      {/* Compact sheets dimension the bowl depths through the rims, leaving the cavity clear. */}
      <DimensionLine x1={basinBackX} y1={innerTop} x2={basinBackX} y2={rearBaseY} label={`${Math.round(g.bowlDepthRear)} mm`} offset={compact ? -16 : 28} vertical compact={compact} />
      <DimensionLine x1={basinFrontX} y1={innerTop} x2={basinFrontX} y2={frontBaseY} label={`${Math.round(g.bowlDepthFront)} mm`} offset={compact ? 16 : -28} vertical compact={compact} />
      {d.upstandEnabled && <DimensionLine x1={backX} y1={oy - d.backUpstandHeight * scale} x2={backX} y2={oy} label={`${d.backUpstandHeight} mm`} offset={-38} vertical />}
      {funnel && <>
        <DimensionLine x1={drainSX} y1={innerTop} x2={drainSX} y2={drainBaseY - 4} label={`${Math.round(g.bowlDepthDrain)} mm`} vertical compact={compact} />
        <g className="fall-callout">
          {[basinBackX + (drainSX - basinBackX) * .15, basinFrontX - (basinFrontX - drainSX) * .15].map((x, i) => { const a = funnelArrow(x); return <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} markerEnd="url(#flowArrow)" /> })}
          <text x={drainSX} y={drainBaseY + (compact ? 14 : 20)} textAnchor="middle">{Math.round(g.bowlDepthDrain - g.bowlDepthRear)} mm FALL TO DRAIN</text>
        </g>
      </>}
      {funnel ? null : d.baseType === 'Flat' || fallDirection === 'LEVEL'
        ? <text x={(basinBackX + basinFrontX) / 2} y={(rearBaseY + frontBaseY) / 2 + (compact ? -8 : 22)} textAnchor="middle" className="technical-label">FLAT BASE</text>
        : <g className="fall-callout">
          <line x1={flowStartX} y1={flowStartY} x2={flowEndX} y2={flowEndY} markerEnd="url(#flowArrow)" />
          <text x={(flowStartX + flowEndX) / 2} y={(flowStartY + flowEndY) / 2 - 8} textAnchor="middle">{Math.round(calculatedFall)} mm FALL TO {fallDirection}</text>
          <text x={fallDirection === 'REAR' ? slopeStartX + 5 : basinFrontX - 5} y={(fallDirection === 'REAR' ? rearBaseY : frontBaseY) + 18} textAnchor={fallDirection === 'REAR' ? 'start' : 'end'} className="low-point-label">LOW POINT</text>
        </g>}
      {!compact && <text x={ox + 8} y={oy + h - 8} className="technical-label">{d.porcelainThickness} mm PORCELAIN</text>}
    </>}
  </ViewFrame>
}

export function AxonometricView({ g, svgRef, sheet }: { g: SinkGeometry; svgRef?: Ref<SVGSVGElement>; sheet?: { x: number; y: number; width: number; height: number } }) {
  const pal = usePalette()
  const d = g.design
  const W = d.overallWidth, D = d.overallDepth, H = d.overallHeight
  // True three-axis projection: width drops to the right while depth rises,
  // exposing both the front and right exterior faces.
  const scale = Math.min(720 / (W * .84 + D * .42), 350 / (H + W * .12 + D * .26))
  const originX = 500
  const originY = 155
  const project = ([x, y, z]: [number, number, number]): Point2D => ({
    x: originX + (x * .84 - z * .42) * scale,
    y: originY + (x * .12 + z * .26 - y) * scale,
  })
  const points = (...items: Point2D[]) => items.map((point) => `${point.x},${point.y}`).join(' ')
  const path = (...items: Point2D[]) => `${items.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')} Z`

  const xL = -W / 2, xR = W / 2, zB = -D / 2, zF = D / 2
  const bxL = xL + g.edgeLeft, bxR = xR - g.edgeRight, bzB = zB + g.edgeBack, bzF = zF - g.edgeFront
  const OBL = project([xL, 0, zB]), OBR = project([xR, 0, zB]), OFR = project([xR, 0, zF]), OFL = project([xL, 0, zF])
  const BBR = project([xR, -H, zB]), BFR = project([xR, -H, zF]), BFL = project([xL, -H, zF])
  const IBL = project([bxL, 0, bzB]), IBR = project([bxR, 0, bzB]), IFR = project([bxR, 0, bzF]), IFL = project([bxL, 0, bzF])
  const rimPath = `${path(OBL, OBR, OFR, OFL)} ${path(IBL, IFL, IFR, IBR)}`
  const openingCenter = { x: (IBL.x + IBR.x + IFR.x + IFL.x) / 4, y: (IBL.y + IBR.y + IFR.y + IFL.y) / 4 }
  const taps = g.tapHoles.map((hole) => project([hole.x - W / 2, 1, zB + hole.y]))
  const dividers = g.basins.slice(1).map((basin) => {
    const x1 = xL + basin.x - g.dividerWidth, x2 = xL + basin.x
    return points(project([x1, 0, bzB]), project([x2, 0, bzB]), project([x2, 0, bzF]), project([x1, 0, bzF]))
  })

  // On the client sheet the view is nested and cropped tight to the projected shell plus its dimension lines.
  const shell = [OBL, OBR, OFR, OFL, BBR, BFR, BFL]
  const pad = 74
  const minX = Math.min(...shell.map((p) => p.x)) - pad, maxX = Math.max(...shell.map((p) => p.x)) + pad
  const minY = Math.min(...shell.map((p) => p.y)) - pad, maxY = Math.max(...shell.map((p) => p.y)) + pad
  const frame = sheet
    ? { ...sheet, viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`, className: 'axonometric-svg sheet-axonometric' }
    : { viewBox: '0 0 1000 650', className: 'technical-svg axonometric-svg' }
  return <svg ref={svgRef} {...frame} role="img" aria-label={`Axonometric technical view, ${W} by ${D} by ${H} millimetres`}>
    <SvgDefs />
    {!sheet && <>
      <text x="32" y="34" className="view-title">AXONOMETRIC VIEW</text>
      <text x="32" y="53" className="view-subtitle">External shell projection · Internal geometry omitted · Not to scale</text>
    </>}

    <polygon className="iso-face-front" points={points(OFL, OFR, BFR, BFL)} fill={pal.faceFront} stroke={pal.ink} strokeWidth={1.9 * pal.lw} />
    <polygon className="iso-face-right" points={points(OBR, OFR, BFR, BBR)} fill={pal.faceRight} stroke={pal.ink} strokeWidth={1.75 * pal.lw} />
    <polygon className="iso-opening" points={points(IBL, IBR, IFR, IFL)} fill={pal.opening} stroke="none" />
    <path className="iso-rim" d={rimPath} fill={pal.rim} fillRule="evenodd" stroke="none" />
    <polygon points={points(OBL, OBR, OFR, OFL)} fill="none" stroke={pal.ink} strokeWidth={1.8 * pal.lw} />
    <polygon className="iso-opening-outline" points={points(IBL, IBR, IFR, IFL)} fill="none" stroke={pal.soft} strokeWidth={.85 * pal.lw} />
    {g.basins.length === 1 && !sheet && <text x={openingCenter.x} y={openingCenter.y + 3} textAnchor="middle" className="iso-opening-label">BASIN OPENING</text>}
    {dividers.map((divider, index) => <polygon key={index} points={divider} fill={pal.rim} stroke={pal.soft} strokeWidth={.85 * pal.lw} />)}
    {d.tapType === 'Deck Mounted' && taps.map((tap, index) => <ellipse key={index} className="iso-tap-hole" cx={tap.x} cy={tap.y} rx={Math.max(3, d.tapHoleDiameter * scale * .4)} ry={Math.max(1.3, d.tapHoleDiameter * scale * .1)} fill={pal.rim} stroke={pal.ink} strokeWidth={.8 * pal.lw} />)}

    <ProjectedDimension a={BFL} b={BFR} label={`${W} mm  OVERALL WIDTH`} offset={54} />
    <ProjectedDimension a={OBL} b={OFL} label={`${D} mm  OVERALL DEPTH`} offset={26} />
    <ProjectedDimension a={OBR} b={BBR} label={`${H} mm  OVERALL HEIGHT`} offset={-42} />

    {!sheet && <>
      <rect x="100" y="490" width="800" height="72" fill="#fafaf7" stroke={pal.pale} />
      <text x="120" y="514" className="schedule-title">KEY DIMENSIONS</text>
      <g className="iso-levels" transform="translate(120 538)">
        <text>BASIN OPENING</text><text x="150" className="value">{Math.round(g.basinWidth)} × {Math.round(g.basinDepth)} mm</text>
        <text x="345">RIMS L / R / F / REAR</text><text x="490" className="value">{d.leftRimWidth} / {d.rightRimWidth} / {d.frontRimWidth} / {d.rearRimWidth} mm</text>
        <text x="660">PORCELAIN</text><text x="745" className="value">{d.porcelainThickness} mm</text>
      </g>
      <text x="958" y="616" textAnchor="end" className="view-subtitle">{d.reference} · AXONOMETRIC PROJECTION</text>
    </>}
  </svg>
}

