import type { ReactNode, Ref } from 'react'
import type { SinkGeometry } from '../lib/sinkGeometry'

const INK = '#20211f'
const MID = '#777871'
const PALE = '#d8d8d2'
const CUT = '#eeeeea'

type DimProps = { x1: number; y1: number; x2: number; y2: number; label: string; offset?: number; vertical?: boolean; compact?: boolean }
type Point2D = { x: number; y: number }

export function DimensionLine({ x1, y1, x2, y2, label, offset = 0, vertical = false, compact = false }: DimProps) {
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
    <rect x={textX - (label.length * (compact ? 2.25 : 2.7))} y={textY - 6} width={label.length * (compact ? 4.5 : 5.4)} height="12" fill="#fdfdfb" />
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
  return <defs>
    <marker id="arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M 7 1 L 0 3.5 L 7 6" fill="none" stroke={MID} strokeWidth="0.8" /></marker>
    <marker id="flowArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 Z" fill={INK} /></marker>
    <pattern id="cutHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke={PALE} strokeWidth="2" /></pattern>
  </defs>
}

function DrainSymbol({ g, sx, sy, x, y }: { g: SinkGeometry; sx: number; sy: number; x: number; y: number }) {
  const d = g.design
  const basinW = g.basins[0].width
  if (d.drainType === 'Circular') return <g><circle cx={x} cy={y} r={Math.max(4, d.drainDiameter * sx / 2)} fill="none" stroke={INK} /><line x1={x - 4} x2={x + 4} y1={y} y2={y} stroke={MID} /><line x1={x} x2={x} y1={y - 4} y2={y + 4} stroke={MID} /></g>
  const drainWidth = Math.min(basinW * sx - 12, d.drainLength * sx)
  const height = Math.max(4, d.drainWidth * sy)
  if (d.drainType === 'Linear') return <rect x={x - drainWidth / 2} y={y - height / 2} width={drainWidth} height={height} fill={INK} rx="1" />
  // The concealed-drain lid runs the full internal width of the basin.
  const coverWidth = basinW * sx
  const coverH = Math.max(7, d.coverPlateDepth * sy)
  return <g>
    <rect x={x - coverWidth / 2} y={y - coverH / 2} width={coverWidth} height={coverH} fill={CUT} stroke={INK} strokeWidth="0.8" />
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
        <line x1={ox - 12} x2={ox + w + 12} y1={oy - 1} y2={oy - 1} stroke={INK} strokeWidth="1.2" />
        {!compact && <text x={ox + w + 16} y={oy - 2} className="technical-label">WALL</text>}
      </g>}
      <rect x={ox} y={oy} width={w} height={h} fill="#fdfdfb" stroke={INK} strokeWidth="2" />
      {g.basins.map((basin, index) => <rect key={index} x={ox + basin.x * scale} y={by} width={basin.width * scale} height={bh} fill="#f7f7f3" stroke={INK} strokeWidth="1.3" />)}
      {d.upstandEnabled && <rect x={ox} y={oy} width={w} height={Math.max(4, d.porcelainThickness * scale)} fill={CUT} stroke={INK} strokeWidth="1" />}
      {g.drains.map((drain, index) => <DrainSymbol key={index} g={g} sx={scale} sy={scale} x={ox + drain.x * scale} y={oy + drain.y * scale} />)}
      {d.tapType === 'Deck Mounted' && g.tapHoles.map((hole, i) => <circle key={i} cx={ox + hole.x * scale} cy={oy + hole.y * scale} r={Math.max(3, d.tapHoleDiameter * scale / 2)} fill="none" stroke={INK} strokeWidth="1.3" />)}
      {d.tapType === 'Wall Mounted' && g.tapHoles.map((hole, i) => <g key={i}>
        <rect x={ox + hole.x * scale - 5} y={oy - 8} width={10} height={8} fill={INK} />
        <line x1={ox + hole.x * scale} x2={ox + hole.x * scale} y1={oy} y2={by + 6} stroke={MID} strokeDasharray="2 2" />
      </g>)}
    </g>
    {showDimensions && <>
      <DimensionLine x1={ox} y1={compact ? oy + h : oy} x2={ox + w} y2={compact ? oy + h : oy} label={`${d.overallWidth} mm`} offset={compact ? 35 : -34} compact={compact} />
      <DimensionLine x1={ox} y1={oy} x2={ox} y2={oy + h} label={`${d.overallDepth} mm`} offset={compact ? -24 : -45} vertical compact={compact} />
      {/* Compact sheets keep basin dimensions inside the opening so they never sit on the rim lines. */}
      <DimensionLine x1={bx} y1={by + bh} x2={bx + g.basins[0].width * scale} y2={by + bh} label={`${Math.round(g.basins[0].width)} mm`} offset={compact ? -16 : 34} compact={compact} />
      <DimensionLine x1={bx + bw} y1={by} x2={bx + bw} y2={by + bh} label={`${Math.round(g.basinDepth)} mm`} offset={compact ? -18 : 35} vertical compact={compact} />
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
    <rect x={ox} y={oy} width={w} height={h} fill="#fdfdfb" stroke={INK} strokeWidth="2" />
    {!compact && <text x={ox + 10} y={oy + 18} className="technical-label">ONE-PIECE PORCELAIN FASCIA</text>}
    {renderedDrawers.map((drawer) => <g key={drawer.index}>
      <rect x={drawerX} y={drawer.y} width={drawerW} height={drawer.scaledHeight} fill="#f7f7f3" stroke={INK} strokeWidth="1.4" />
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

export function SideView({ g, compact = false, showDimensions = !compact, svgRef }: { g: SinkGeometry; compact?: boolean; showDimensions?: boolean; svgRef?: Ref<SVGSVGElement> }) {
  const d = g.design
  const totalH = d.overallHeight + (d.upstandEnabled ? d.backUpstandHeight : 0)
  const scale = Math.min((compact ? 330 : 540) / d.overallDepth, (compact ? 165 : 315) / totalH)
  const w = d.overallDepth * scale, h = d.overallHeight * scale
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
  const cavityPath = `M ${basinBackX} ${oy - 3} L ${basinBackX} ${rearBaseY} L ${slopeStartX} ${rearBaseY} L ${basinFrontX} ${frontBaseY} L ${basinFrontX} ${oy - 3} Z`
  return <ViewFrame svgRef={svgRef} compact={compact} title="SIDE SECTION A-A" subtitle={`${d.overallDepth} × ${d.overallHeight} mm${d.mountingType === 'Wall Mounted' ? ' · wall-mounted' : ''}`} viewBox={compact ? '0 0 470 300' : '0 0 820 530'}>
    {d.mountingType === 'Wall Mounted' && <g>
      <rect x={backX - 16} y={oy - (d.upstandEnabled ? d.backUpstandHeight * scale : 0) - 24} width={14} height={h + (d.upstandEnabled ? d.backUpstandHeight * scale : 0) + 48} fill="url(#cutHatch)" stroke="none" />
      <line x1={backX - 2} x2={backX - 2} y1={oy - (d.upstandEnabled ? d.backUpstandHeight * scale : 0) - 24} y2={oy + h + 24} stroke={INK} strokeWidth="1.2" />
      {showDimensions && <text x={backX - 9} y={oy + h + 36} textAnchor="middle" className="technical-label">WALL</text>}
    </g>}
    {d.tapType === 'Wall Mounted' && <path d={`M ${backX - 2} ${oy - 26} h ${Math.max(18, g.edgeBack * scale + 10)} v 7`} fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />}
    <rect x={ox} y={oy} width={w} height={h} fill="url(#cutHatch)" stroke={INK} strokeWidth="2" />
    <path d={cavityPath} fill="#fdfdfb" stroke="none" />
    <line x1={basinBackX} y1={oy} x2={basinBackX} y2={rearBaseY} stroke={INK} strokeWidth="1.5" />
    <line x1={basinFrontX} y1={oy} x2={basinFrontX} y2={frontBaseY} stroke={INK} strokeWidth="1.5" />
    <line x1={backX} y1={oy} x2={basinBackX} y2={oy} stroke={INK} strokeWidth="2" />
    <line x1={basinFrontX} y1={oy} x2={frontX} y2={oy} stroke={INK} strokeWidth="2" />
    <line x1={slopeStartX} y1={rearBaseY} x2={basinFrontX} y2={frontBaseY} stroke={INK} strokeWidth="2" />
    {d.upstandEnabled && <rect x={backX} y={oy - d.backUpstandHeight * scale} width={d.porcelainThickness * scale} height={d.backUpstandHeight * scale} fill="url(#cutHatch)" stroke={INK} strokeWidth="1.5" />}
    {concealedAtRear && (() => {
      const coverH = Math.max(4, d.porcelainThickness * scale)
      const coverTop = floorYAt(basinBackX + coverSectionWidth) - coverH
      // Label sits above the rim with a leader so it never crosses the depth dimension or the cavity walls.
      const labelX = basinBackX + coverSectionWidth + (compact ? 22 : 34)
      const labelY = oy - (compact ? 10 : 14)
      return <g>
        <rect x={basinBackX} y={coverTop} width={coverSectionWidth} height={coverH} fill={CUT} stroke={INK} strokeWidth="1" />
        {(!compact || showDimensions) && <>
          <polyline points={`${basinBackX + coverSectionWidth / 2},${coverTop} ${basinBackX + coverSectionWidth / 2},${labelY + 4} ${labelX - 3},${labelY + 4}`} fill="none" stroke={MID} strokeWidth=".7" />
          <text x={labelX} y={labelY + 6} className="technical-label">CONCEALED COVER</text>
        </>}
      </g>
    })()}
    {d.drainPosition === 'Rear' && d.drainType !== 'Concealed Linear' && <rect x={basinBackX} y={rearBaseY - 4} width={Math.max(12, d.drainWidth * scale)} height="7" fill={INK} />}
    {showDimensions && <>
      <text x={backX} y={oy + h + 14} className="orientation-label">REAR</text>
      <text x={frontX} y={oy + h + 14} textAnchor="end" className="orientation-label">FRONT</text>
      <DimensionLine x1={backX} y1={oy + h} x2={frontX} y2={oy + h} label={`${d.overallDepth} mm`} offset={compact ? 30 : 42} compact={compact} />
      <DimensionLine x1={frontX} y1={oy} x2={frontX} y2={oy + h} label={`${d.overallHeight} mm`} offset={compact ? 27 : 52} vertical compact={compact} />
      {/* Compact sheets dimension the bowl depths through the rims, leaving the cavity clear. */}
      <DimensionLine x1={basinBackX} y1={innerTop} x2={basinBackX} y2={rearBaseY} label={`${Math.round(g.bowlDepthRear)} mm`} offset={compact ? -16 : 28} vertical compact={compact} />
      <DimensionLine x1={basinFrontX} y1={innerTop} x2={basinFrontX} y2={frontBaseY} label={`${Math.round(g.bowlDepthFront)} mm`} offset={compact ? 16 : -28} vertical compact={compact} />
      {d.upstandEnabled && <DimensionLine x1={backX} y1={oy - d.backUpstandHeight * scale} x2={backX} y2={oy} label={`${d.backUpstandHeight} mm`} offset={-38} vertical />}
      {d.baseType === 'Flat' || fallDirection === 'LEVEL'
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

    <polygon className="iso-face-front" points={points(OFL, OFR, BFR, BFL)} fill="#e8e5df" stroke={INK} strokeWidth="1.9" />
    <polygon className="iso-face-right" points={points(OBR, OFR, BFR, BBR)} fill="#cec9c0" stroke={INK} strokeWidth="1.75" />
    <polygon className="iso-opening" points={points(IBL, IBR, IFR, IFL)} fill="#efede7" stroke="none" />
    <path className="iso-rim" d={rimPath} fill="#f8f7f3" fillRule="evenodd" stroke="none" />
    <polygon points={points(OBL, OBR, OFR, OFL)} fill="none" stroke={INK} strokeWidth="1.8" />
    <polygon className="iso-opening-outline" points={points(IBL, IBR, IFR, IFL)} fill="none" stroke="#77766f" strokeWidth=".85" />
    {g.basins.length === 1 && !sheet && <text x={openingCenter.x} y={openingCenter.y + 3} textAnchor="middle" className="iso-opening-label">BASIN OPENING</text>}
    {dividers.map((divider, index) => <polygon key={index} points={divider} fill="#f8f7f3" stroke="#77766f" strokeWidth=".85" />)}
    {d.tapType === 'Deck Mounted' && taps.map((tap, index) => <ellipse key={index} className="iso-tap-hole" cx={tap.x} cy={tap.y} rx={Math.max(3, d.tapHoleDiameter * scale * .4)} ry={Math.max(1.3, d.tapHoleDiameter * scale * .1)} fill="#f8f7f3" stroke={INK} strokeWidth=".8" />)}

    <ProjectedDimension a={BFL} b={BFR} label={`${W} mm  OVERALL WIDTH`} offset={54} />
    <ProjectedDimension a={OBL} b={OFL} label={`${D} mm  OVERALL DEPTH`} offset={26} />
    <ProjectedDimension a={OBR} b={BBR} label={`${H} mm  OVERALL HEIGHT`} offset={-42} />

    {!sheet && <>
      <rect x="100" y="490" width="800" height="72" fill="#fafaf7" stroke={PALE} />
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

const clip = (text: string, max: number) => text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text

function SpecRows({ x, y, width, heading, rows }: { x: number; y: number; width: number; heading: string; rows: [string, string][] }) {
  return <g className="client-spec" transform={`translate(${x} ${y})`}>
    <text className="heading">{heading}</text>
    {rows.map(([label, value], index) => <g key={label} transform={`translate(0 ${24 + index * 21})`}>
      <text>{label}</text>
      <text x={width} textAnchor="end" className="value">{value}</text>
      <line x1="0" x2={width} y1="7" y2="7" />
    </g>)}
  </g>
}

export function ClientPreview({ g, svgRef }: { g: SinkGeometry; svgRef?: Ref<SVGSVGElement> }) {
  const d = g.design
  const calculatedFall = Math.abs(g.bowlDepthRear - g.bowlDepthFront)
  const fallDirection = g.bowlDepthRear > g.bowlDepthFront ? 'rear' : g.bowlDepthFront > g.bowlDepthRear ? 'front' : 'level'
  const issued = new Date(d.updatedAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const material = d.material || (d.materialSupply === 'Client' ? 'Client supplied' : 'Porcelain to be confirmed')
  const vanity = [d.drawersEnabled && `${d.drawerCount} drawers`, d.vanityCladding && 'porcelain clad', d.shelfCount > 0 && `${d.shelfCount} shelf`, d.upstandEnabled && `${d.backUpstandHeight} mm upstand`].filter(Boolean).join(' / ') || 'Not included'
  const project = [d.clientName, d.projectName].filter(Boolean).join(' · ') || 'Client not specified'
  // Grow the compact section to fill its slot: thin slabs get larger, tall basins shrink to fit.
  const upstand = d.upstandEnabled ? d.backUpstandHeight : 0
  const sideScale = Math.min(330 / d.overallDepth, 165 / (d.overallHeight + upstand))
  const sectionBottom = 92 + (d.overallHeight + upstand) * sideScale + 45
  const sectionScale = Math.min(1.02, 200 / (sectionBottom - 16))

  const construction: [string, string][] = [
    ['OVERALL SIZE', `${d.overallWidth} × ${d.overallDepth} × ${d.overallHeight} mm`],
    ['BASIN OPENING', `${Math.round(g.basinWidth)} × ${Math.round(g.basinDepth)} mm`],
    ['RIMS  L / R / FRONT / REAR', `${d.leftRimWidth} / ${d.rightRimWidth} / ${d.frontRimWidth} / ${d.rearRimWidth} mm`],
    ['INTERNAL DEPTH  REAR / FRONT', `${Math.round(g.bowlDepthRear)} / ${Math.round(g.bowlDepthFront)} mm`],
    ['BASE', fallDirection === 'level' ? 'Flat' : `${Math.round(calculatedFall)} mm fall to ${fallDirection}`],
    ['BASINS / MOUNTING', `${d.basinCount} / ${d.mountingType === 'Wall Mounted' ? 'Wall-mounted' : d.mountingType}`],
  ]
  const finish: [string, string][] = [
    ['MATERIAL', clip(material, 28)],
    ['FINISH / THICKNESS', `${d.finish} / ${d.porcelainThickness} mm`],
    ['DRAIN', `${d.drainType === 'Circular' ? 'Round' : d.drainType === 'Linear' ? 'Exposed linear' : 'Concealed linear'} / ${d.drainType === 'Concealed Linear' ? 'Rear' : d.drainPosition}${d.overflow ? ' + overflow' : ''}`],
    ['DRAIN COVER', d.drainType === 'Concealed Linear' ? `Full width × ${d.coverPlateDepth} mm` : '—'],
    ['TAP', `${d.tapType}${d.tapType === 'Deck Mounted' ? ` / ${g.tapHoles.length} hole${g.tapHoles.length > 1 ? 's' : ''}` : ''}`],
    ['VANITY', clip(vanity, 28)],
  ]

  return <svg ref={svgRef} className="technical-svg client-sheet" viewBox="0 0 1120 790" role="img" aria-label="Client design sheet">
    <SvgDefs />
    {/* Header */}
    <image href="/assets/artiling-logo.png" x="42" y="22" width="60" height="60" preserveAspectRatio="xMidYMid meet" />
    <text x="110" y="42" className="client-brand">ARTILING STUDIO</text>
    <text x="110" y="72" className="client-title">Bespoke porcelain basin</text>
    <text x="1072" y="40" textAnchor="end" className="client-sheet-reference">{d.reference || 'UNSAVED DESIGN'}</text>
    <text x="1072" y="60" textAnchor="end" className="client-sheet-project">{clip(project, 60)}</text>
    <text x="1072" y="77" textAnchor="end" className="client-sheet-project">{d.overallWidth} × {d.overallDepth} × {d.overallHeight} mm · Issued {issued}</text>
    <line x1="48" x2="1072" y1="92" y2="92" stroke={INK} strokeWidth="1.2" />

    {/* Row 1: plan and 3D form (front elevation when the design has drawers) */}
    <g transform="translate(40 98) scale(1.08)"><TopView g={g} compact showDimensions /></g>
    <line x1="568" x2="568" y1="108" y2="420" stroke={PALE} />
    {d.drawersEnabled
      ? <g transform="translate(578 98) scale(1.04)"><FrontView g={g} compact showDimensions /></g>
      : <>
        <text x="608" y="128" className="view-title">AXONOMETRIC</text>
        <text x="608" y="145" className="view-subtitle">Indicative form · not to scale</text>
        <AxonometricView g={g} sheet={{ x: 584, y: 156, width: 488, height: 264 }} />
      </>}
    <line x1="48" x2="1072" y1="430" y2="430" stroke={PALE} />

    {/* Row 2: section and specification */}
    <g transform={`translate(40 ${436 - 16 * sectionScale}) scale(${sectionScale})`}><SideView g={g} compact showDimensions /></g>
    <line x1="512" x2="512" y1="444" y2="628" stroke={PALE} />
    <text x="528" y="458" className="view-title">SPECIFICATION</text>
    <SpecRows x={528} y={484} width={258} heading="CONSTRUCTION" rows={construction} />
    <SpecRows x={810} y={484} width={262} heading="MATERIAL &amp; FITTINGS" rows={finish} />

    {/* Title block */}
    <line x1="48" x2="1072" y1="640" y2="640" stroke={INK} strokeWidth="1.2" />
    <g className="client-notes" transform="translate(48 662)">
      <text className="heading">NOTES</text>
      <text y="20">1. All dimensions in millimetres. Drawing not to scale; do not measure from it.</text>
      <text y="36">2. Indicative design. Site dimensions, porcelain selection and fittings to be verified before production.</text>
      <text y="52">3. Final slab colour and veining may vary from the drawing and any sample.</text>
      <text y="68">4. Fabrication begins once this sheet is signed and returned.</text>
    </g>
    <g className="title-block">
      <rect x="640" y="652" width="432" height="104" fill="none" stroke={INK} strokeWidth="1" />
      <line x1="640" x2="1072" y1="686" y2="686" />
      <line x1="856" x2="856" y1="652" y2="686" />
      <line x1="964" x2="964" y1="652" y2="686" />
      <line x1="856" x2="856" y1="686" y2="756" />
      <text x="650" y="665" className="label">DRAWING</text><text x="650" y="680" className="value">{d.reference || '—'}</text>
      <text x="866" y="665" className="label">SCALE</text><text x="866" y="680" className="value">NTS</text>
      <text x="974" y="665" className="label">SHEET</text><text x="974" y="680" className="value">1 / 1</text>
      <text x="650" y="700" className="label">CLIENT APPROVAL</text>
      <line x1="650" x2="844" y1="744" y2="744" className="sign" />
      <text x="650" y="752" className="hint">Signature</text>
      <text x="866" y="700" className="label">DATE</text>
      <line x1="866" x2="1062" y1="744" y2="744" className="sign" />
    </g>
    <text x="48" y="774" className="disclaimer">Artiling Studio · artilingstudio.co.uk</text>
    <text x="1072" y="774" textAnchor="end" className="disclaimer">CLIENT DESIGN SHEET / {d.reference}</text>
  </svg>
}
