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
  if (d.drainType === 'Circular') return <g><circle cx={x} cy={y} r={Math.max(4, d.drainDiameter * sx / 2)} fill="none" stroke={INK} /><line x1={x - 4} x2={x + 4} y1={y} y2={y} stroke={MID} /><line x1={x} x2={x} y1={y - 4} y2={y + 4} stroke={MID} /></g>
  const drainWidth = Math.min(g.basinWidth * sx - 12, d.drainLength * sx)
  const height = Math.max(4, d.drainWidth * sy)
  if (d.drainType === 'Linear') return <rect x={x - drainWidth / 2} y={y - height / 2} width={drainWidth} height={height} fill={INK} rx="1" />
  const coverWidth = d.coverPlateFullWidth
    ? g.basinWidth * sx
    : Math.min(g.basinWidth * sx, d.coverPlateWidth * sx)
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
  return <ViewFrame svgRef={svgRef} compact={compact} title="TOP VIEW" subtitle={`Scale to fit · ${d.overallWidth} × ${d.overallDepth} mm`} viewBox={compact ? '0 0 470 300' : '0 0 820 530'}>
    <g className="drawing-lines">
      <rect x={ox} y={oy} width={w} height={h} fill="#fdfdfb" stroke={INK} strokeWidth="2" />
      <rect x={bx} y={by} width={bw} height={bh} fill="#f7f7f3" stroke={INK} strokeWidth="1.3" />
      {d.upstandEnabled && <rect x={ox} y={oy} width={w} height={Math.max(4, d.porcelainThickness * scale)} fill={CUT} stroke={INK} strokeWidth="1" />}
      <DrainSymbol g={g} sx={scale} sy={scale} x={drainX} y={drainY} />
      {d.tapType === 'Deck Mounted' && Array.from({ length: d.tapHoleCount }).map((_, i) => {
        const spacing = d.tapHoleDiameter * 1.8
        const tx = ox + g.tapX * scale + (i - (d.tapHoleCount - 1) / 2) * spacing * scale
        return <circle key={i} cx={tx} cy={oy + g.tapY * scale} r={Math.max(3, d.tapHoleDiameter * scale / 2)} fill="none" stroke={INK} strokeWidth="1.3" />
      })}
    </g>
    {showDimensions && <>
      <DimensionLine x1={ox} y1={compact ? oy + h : oy} x2={ox + w} y2={compact ? oy + h : oy} label={`${d.overallWidth} mm`} offset={compact ? 35 : -34} compact={compact} />
      <DimensionLine x1={ox} y1={oy} x2={ox} y2={oy + h} label={`${d.overallDepth} mm`} offset={compact ? -24 : -45} vertical compact={compact} />
      <DimensionLine x1={bx} y1={by + bh} x2={bx + bw} y2={by + bh} label={`${Math.round(g.basinWidth)} mm`} offset={compact ? 18 : 34} compact={compact} />
      <DimensionLine x1={bx + bw} y1={by} x2={bx + bw} y2={by + bh} label={`${Math.round(g.basinDepth)} mm`} offset={compact ? 18 : 35} vertical compact={compact} />
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
      >{d.drainType.toUpperCase()} DRAIN{d.drainType === 'Concealed Linear' && d.coverPlateFullWidth ? ' / FULL WIDTH COVER' : ''}</text>
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
      <DimensionLine x1={ox} y1={compact ? oy + h : oy} x2={ox + w} y2={compact ? oy + h : oy} label={`${d.overallWidth} mm`} offset={compact ? 25 : -36} compact={compact} />
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
  const slopeStartX = concealedAtRear ? basinBackX + coverSectionWidth : basinBackX
  const calculatedFall = Math.abs(g.bowlDepthRear - g.bowlDepthFront)
  const fallDirection = g.bowlDepthRear > g.bowlDepthFront ? 'REAR' : g.bowlDepthFront > g.bowlDepthRear ? 'FRONT' : 'LEVEL'
  const slopeSpan = Math.max(1, basinFrontX - slopeStartX)
  const floorYAt = (x: number) => rearBaseY + ((x - slopeStartX) / slopeSpan) * (frontBaseY - rearBaseY)
  const flowStartX = fallDirection === 'REAR' ? slopeStartX + slopeSpan * .82 : slopeStartX + slopeSpan * .18
  const flowEndX = fallDirection === 'REAR' ? slopeStartX + slopeSpan * .22 : slopeStartX + slopeSpan * .78
  const flowStartY = floorYAt(flowStartX) - (compact ? 10 : 15)
  const flowEndY = floorYAt(flowEndX) - (compact ? 10 : 15)
  const cavityPath = `M ${basinBackX} ${oy - 3} L ${basinBackX} ${rearBaseY} L ${slopeStartX} ${rearBaseY} L ${basinFrontX} ${frontBaseY} L ${basinFrontX} ${oy - 3} Z`
  return <ViewFrame svgRef={svgRef} compact={compact} title="SIDE SECTION A-A" subtitle={`${d.overallDepth} × ${d.overallHeight} mm`} viewBox={compact ? '0 0 470 300' : '0 0 820 530'}>
    <rect x={ox} y={oy} width={w} height={h} fill="url(#cutHatch)" stroke={INK} strokeWidth="2" />
    <path d={cavityPath} fill="#fdfdfb" stroke="none" />
    <line x1={basinBackX} y1={oy} x2={basinBackX} y2={rearBaseY} stroke={INK} strokeWidth="1.5" />
    <line x1={basinFrontX} y1={oy} x2={basinFrontX} y2={frontBaseY} stroke={INK} strokeWidth="1.5" />
    <line x1={backX} y1={oy} x2={basinBackX} y2={oy} stroke={INK} strokeWidth="2" />
    <line x1={basinFrontX} y1={oy} x2={frontX} y2={oy} stroke={INK} strokeWidth="2" />
    <line x1={slopeStartX} y1={rearBaseY} x2={basinFrontX} y2={frontBaseY} stroke={INK} strokeWidth="2" />
    {d.upstandEnabled && <rect x={backX} y={oy - d.backUpstandHeight * scale} width={d.porcelainThickness * scale} height={d.backUpstandHeight * scale} fill="url(#cutHatch)" stroke={INK} strokeWidth="1.5" />}
    {concealedAtRear && <g>
      <rect x={basinBackX} y={rearBaseY} width={coverSectionWidth} height={Math.max(4, d.porcelainThickness * scale)} fill={CUT} stroke={INK} strokeWidth="1" />
      {(!compact || showDimensions) && <text x={basinBackX + coverSectionWidth / 2} y={rearBaseY - 8} textAnchor="middle" className="technical-label">CONCEALED COVER</text>}
    </g>}
    {d.drainPosition === 'Rear' && d.drainType !== 'Concealed Linear' && <rect x={basinBackX} y={rearBaseY - 4} width={Math.max(12, d.drainWidth * scale)} height="7" fill={INK} />}
    {showDimensions && <>
      <text x={basinBackX + 5} y={oy - 10} className="orientation-label">REAR</text>
      <text x={basinFrontX - 5} y={oy - 10} textAnchor="end" className="orientation-label">FRONT</text>
      <DimensionLine x1={backX} y1={oy + h} x2={frontX} y2={oy + h} label={`${d.overallDepth} mm`} offset={compact ? 25 : 42} compact={compact} />
      <DimensionLine x1={frontX} y1={oy} x2={frontX} y2={oy + h} label={`${d.overallHeight} mm`} offset={compact ? 27 : 52} vertical compact={compact} />
      <DimensionLine x1={basinBackX} y1={innerTop} x2={basinBackX} y2={rearBaseY} label={`${Math.round(g.bowlDepthRear)} mm`} offset={compact ? 17 : 28} vertical compact={compact} />
      <DimensionLine x1={basinFrontX} y1={innerTop} x2={basinFrontX} y2={frontBaseY} label={`${Math.round(g.bowlDepthFront)} mm`} offset={compact ? -17 : -28} vertical compact={compact} />
      {d.upstandEnabled && <DimensionLine x1={backX} y1={oy - d.backUpstandHeight * scale} x2={backX} y2={oy} label={`${d.backUpstandHeight} mm`} offset={-38} vertical />}
      {d.baseType === 'Flat' || fallDirection === 'LEVEL'
        ? <text x={(basinBackX + basinFrontX) / 2} y={(rearBaseY + frontBaseY) / 2 + 22} textAnchor="middle" className="technical-label">FLAT BASE</text>
        : <g className="fall-callout">
          <line x1={flowStartX} y1={flowStartY} x2={flowEndX} y2={flowEndY} markerEnd="url(#flowArrow)" />
          <text x={(flowStartX + flowEndX) / 2} y={(flowStartY + flowEndY) / 2 - 8} textAnchor="middle">{Math.round(calculatedFall)} mm FALL TO {fallDirection}</text>
          <text x={fallDirection === 'REAR' ? slopeStartX + 5 : basinFrontX - 5} y={(fallDirection === 'REAR' ? rearBaseY : frontBaseY) + 18} textAnchor={fallDirection === 'REAR' ? 'start' : 'end'} className="low-point-label">LOW POINT</text>
        </g>}
      <text x={ox + 8} y={oy + h - 8} className="technical-label">{d.porcelainThickness} mm PORCELAIN</text>
    </>}
  </ViewFrame>
}

export function AxonometricView({ g, svgRef }: { g: SinkGeometry; svgRef?: Ref<SVGSVGElement> }) {
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
  const BBL = project([xL, -H, zB]), BBR = project([xR, -H, zB]), BFR = project([xR, -H, zF]), BFL = project([xL, -H, zF])
  const IBL = project([bxL, 0, bzB]), IBR = project([bxR, 0, bzB]), IFR = project([bxR, 0, bzF]), IFL = project([bxL, 0, bzF])
  const rimPath = `${path(OBL, OBR, OFR, OFL)} ${path(IBL, IFL, IFR, IBR)}`
  const openingCenter = { x: (IBL.x + IBR.x + IFR.x + IFL.x) / 4, y: (IBL.y + IBR.y + IFR.y + IFL.y) / 4 }
  const tapX = g.tapX - W / 2, tapZ = zB + g.tapY
  const tap = project([tapX, 1, tapZ])

  return <svg ref={svgRef} className="technical-svg axonometric-svg" viewBox="0 0 1000 650" role="img" aria-label={`Axonometric technical view, ${W} by ${D} by ${H} millimetres`}>
    <SvgDefs />
    <text x="32" y="34" className="view-title">AXONOMETRIC VIEW</text>
    <text x="32" y="53" className="view-subtitle">External shell projection · Internal geometry omitted · Not to scale</text>

    <polygon className="iso-face-front" points={points(OFL, OFR, BFR, BFL)} fill="#e8e5df" stroke={INK} strokeWidth="1.9" />
    <polygon className="iso-face-right" points={points(OBR, OFR, BFR, BBR)} fill="#cec9c0" stroke={INK} strokeWidth="1.75" />
    <polygon className="iso-opening" points={points(IBL, IBR, IFR, IFL)} fill="#efede7" stroke="none" />
    <path className="iso-rim" d={rimPath} fill="#f8f7f3" fillRule="evenodd" stroke="none" />
    <polygon points={points(OBL, OBR, OFR, OFL)} fill="none" stroke={INK} strokeWidth="1.8" />
    <polygon className="iso-opening-outline" points={points(IBL, IBR, IFR, IFL)} fill="none" stroke="#77766f" strokeWidth=".85" />
    <text x={openingCenter.x} y={openingCenter.y + 3} textAnchor="middle" className="iso-opening-label">BASIN OPENING</text>
    {d.tapType === 'Deck Mounted' && <ellipse className="iso-tap-hole" cx={tap.x} cy={tap.y} rx={Math.max(3, d.tapHoleDiameter * scale * .4)} ry={Math.max(1.3, d.tapHoleDiameter * scale * .1)} fill="#f8f7f3" stroke={INK} strokeWidth=".8" />}

    <ProjectedDimension a={BFL} b={BFR} label={`${W} mm  OVERALL WIDTH`} offset={54} />
    <ProjectedDimension a={OBL} b={OFL} label={`${D} mm  OVERALL DEPTH`} offset={26} />
    <ProjectedDimension a={OBR} b={BBR} label={`${H} mm  OVERALL HEIGHT`} offset={-42} />

    <rect x="100" y="490" width="800" height="72" fill="#fafaf7" stroke={PALE} />
    <text x="120" y="514" className="schedule-title">KEY DIMENSIONS</text>
    <g className="iso-levels" transform="translate(120 538)">
      <text>BASIN OPENING</text><text x="150" className="value">{Math.round(g.basinWidth)} × {Math.round(g.basinDepth)} mm</text>
      <text x="345">RIMS L / R / F / REAR</text><text x="490" className="value">{d.leftRimWidth} / {d.rightRimWidth} / {d.frontRimWidth} / {d.rearRimWidth} mm</text>
      <text x="660">PORCELAIN</text><text x="745" className="value">{d.porcelainThickness} mm</text>
    </g>
    <text x="958" y="616" textAnchor="end" className="view-subtitle">{d.reference} · AXONOMETRIC PROJECTION</text>
  </svg>
}

export function ClientPreview({ g, svgRef }: { g: SinkGeometry; svgRef?: Ref<SVGSVGElement> }) {
  const d = g.design
  const calculatedFall = Math.abs(g.bowlDepthRear - g.bowlDepthFront)
  const fallDirection = g.bowlDepthRear > g.bowlDepthFront ? 'rear' : g.bowlDepthFront > g.bowlDepthRear ? 'front' : 'level'
  return <svg ref={svgRef} className="technical-svg client-sheet" viewBox="0 0 1120 790" role="img" aria-label="Client quotation preview">
    <SvgDefs />
    <image href="/assets/artiling-logo.png" x="42" y="24" width="64" height="64" preserveAspectRatio="xMidYMid meet" />
    <text x="112" y="45" className="client-brand">ARTILING STUDIO</text>
    <text x="112" y="76" className="client-title">Bespoke porcelain basin</text>
    <text x="1072" y="43" textAnchor="end" className="client-sheet-reference">{d.reference || 'UNSAVED DESIGN'}</text>
    <text x="1072" y="68" textAnchor="end" className="client-sheet-project">{d.clientName || 'Client not specified'} / {d.projectName || 'Project not specified'}</text>
    <line x1="48" x2="1072" y1="96" y2="96" stroke={INK} />
    <g className="client-meta">
      <text x="48" y="119">OVERALL SIZE</text><text x="48" y="143" className="value emphasis">{d.overallWidth} × {d.overallDepth} × {d.overallHeight} mm</text>
      <text x="276" y="119">BASIN OPENING</text><text x="276" y="143" className="value">{Math.round(g.basinWidth)} × {Math.round(g.basinDepth)} mm</text>
      <text x="493" y="119">INTERNAL DEPTHS</text><text x="493" y="143" className="value">Rear {Math.round(g.bowlDepthRear)} / Front {Math.round(g.bowlDepthFront)} mm</text>
      <text x="735" y="119">FALL</text><text x="735" y="143" className="value">{fallDirection === 'level' ? 'Flat base' : `${Math.round(calculatedFall)} mm to ${fallDirection}`}</text>
      <text x="910" y="119">MATERIAL / FINISH</text><text x="910" y="143" className="value">{d.material} / {d.finish}</text>
    </g>
    <line x1="48" x2="1072" y1="160" y2="160" stroke={PALE} />

    <g transform="translate(20 168) scale(1.1)"><TopView g={g} compact showDimensions /></g>
    <g transform="translate(570 168) scale(1.08)"><SideView g={g} compact showDimensions /></g>
    <line x1="558" x2="558" y1="182" y2="492" stroke={PALE} />
    <line x1="48" x2="1072" y1="500" y2="500" stroke={PALE} />

    <g transform="translate(24 505) scale(.82)"><FrontView g={g} compact showDimensions /></g>
    <rect x="450" y="516" width="622" height="190" fill="#fafaf7" stroke={PALE} />
    <text x="470" y="540" className="schedule-title">TECHNICAL SCHEDULE</text>
    <line x1="470" x2="1052" y1="550" y2="550" stroke={PALE} />
    <line x1="760" x2="760" y1="550" y2="687" stroke={PALE} />
    <g className="client-spec" transform="translate(470 572)">
      <text className="heading">CONSTRUCTION</text>
      <text y="25">RIMS L / R / F / REAR</text><text x="265" y="25" textAnchor="end" className="value">{d.leftRimWidth} / {d.rightRimWidth} / {d.frontRimWidth} / {d.rearRimWidth} mm</text>
      <text y="48">PORCELAIN</text><text x="265" y="48" textAnchor="end" className="value">{d.porcelainThickness} mm</text>
      <text y="71">BASIN OPENING</text><text x="265" y="71" textAnchor="end" className="value">{Math.round(g.basinWidth)} × {Math.round(g.basinDepth)} mm</text>
      <text y="94">REAR / FRONT DEPTH</text><text x="265" y="94" textAnchor="end" className="value">{Math.round(g.bowlDepthRear)} / {Math.round(g.bowlDepthFront)} mm</text>
      <text y="117">FRONT PANEL HEIGHT</text><text x="265" y="117" textAnchor="end" className="value">{d.overallHeight} mm</text>
    </g>
    <g className="client-spec" transform="translate(780 572)">
      <text className="heading">FITTINGS</text>
      <text y="25">DRAIN</text><text x="272" y="25" textAnchor="end" className="value">{d.drainType} / {d.drainPosition}</text>
      <text y="48">COVER</text><text x="272" y="48" textAnchor="end" className="value">{d.drainType === 'Concealed Linear' ? `${d.coverPlateFullWidth ? 'Full width' : `${d.coverPlateWidth} mm`} / ${d.coverPlateDepth} D` : 'N/A'}</text>
      <text y="71">TAP</text><text x="272" y="71" textAnchor="end" className="value">{d.tapType}{d.tapType === 'Deck Mounted' ? ` / ${d.tapHoleCount} hole` : ''}</text>
      <text y="94">BASE</text><text x="272" y="94" textAnchor="end" className="value">{fallDirection === 'level' ? 'Flat' : `${Math.round(calculatedFall)} mm fall to ${fallDirection}`}</text>
      <text y="117">DRAWERS</text><text x="272" y="117" textAnchor="end" className="value">{d.drawersEnabled ? `${d.drawerCount} / ${d.drawerHeights.slice(0, d.drawerCount).join(' + ')} mm` : 'Not included'}</text>
    </g>

    <line x1="48" x2="1072" y1="748" y2="748" stroke={INK} />
    <text x="48" y="771" className="disclaimer">Indicative design drawing. Verify site dimensions, material selection and fabrication details before production.</text>
    <text x="1072" y="771" textAnchor="end" className="disclaimer">CLIENT PREVIEW / {d.reference}</text>
  </svg>
}
