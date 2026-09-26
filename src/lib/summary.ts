import type { SinkDesign } from '../types/sink'
import type { SinkGeometry } from './sinkGeometry'
import { PRICE_GROUPS, formatGbp, formatSignedGbp, type PriceResult } from '../pricing/engine'

export const STANDARD_EXCLUSIONS = [
  'Plumbing connections, taps, wastes and traps',
  'Substrate preparation and unforeseen site work',
]

export function specification(d: SinkDesign, g: SinkGeometry): [string, string][] {
  const fall = Math.abs(g.bowlDepthRear - g.bowlDepthFront)
  const fallTo = g.bowlDepthRear > g.bowlDepthFront ? 'rear' : 'front'
  const vanity = [
    d.drawersEnabled && `${d.drawerCount} push-to-open drawer${d.drawerCount > 1 ? 's' : ''}`,
    d.vanityCladding && 'full porcelain cladding',
    d.shelfCount > 0 && `${d.shelfCount} matching shel${d.shelfCount > 1 ? 'ves' : 'f'}`,
    d.upstandEnabled && `${d.backUpstandHeight} mm matching upstand`,
  ].filter(Boolean).join(', ')
  return [
    ['Overall size', `${d.overallWidth} × ${d.overallDepth} × ${d.overallHeight} mm`],
    ['Basin', `${d.basinCount > 1 ? `${d.basinCount} basins, each ${Math.round(g.basins[0].width)}` : Math.round(g.basinWidth)} × ${Math.round(g.basinDepth)} mm opening`],
    ['Construction', `Mitred porcelain, ${d.porcelainThickness} mm${d.shapeType === 'Irregular' ? ', irregular / polygonal outline' : ''}`],
    ['Base', d.baseType === 'Flat' || fall === 0 ? 'Flat' : `Single ${fall} mm fall to the ${fallTo}`],
    ['Mounting', d.mountingType === 'Wall Mounted' ? 'Wall-mounted' : d.mountingType],
    ['Drain', d.drainType === 'Concealed Linear' ? `Concealed linear drain with porcelain cover${d.concealedDetail === 'Specialist' ? ' (specialist detail)' : ''}` : d.drainType === 'Circular' ? `Round ${d.drainDiameter} mm drain` : `Exposed linear drain, ${d.drainLength} mm`],
    ['Taps', d.tapType === 'Deck Mounted' ? `Deck-mounted, ${d.tapHoleCount * d.basinCount} tap hole${d.tapHoleCount * d.basinCount > 1 ? 's' : ''}` : d.tapType === 'Wall Mounted' ? 'Wall-mounted (not drilled)' : 'No taps'],
    ['Overflow', d.overflow ? 'Yes' : 'No'],
    ['Vanity & extras', vanity || 'None'],
    ['Porcelain', d.materialSupply === 'Client' ? `Client supplied${d.material ? `: ${d.material}` : ''}` : d.materialSupply === 'Artiling' ? `Supplied by Artiling${d.material ? `: ${d.material}` : ''}` : 'To be confirmed'],
    ['Finish', d.finish],
  ]
}

export function exclusions(d: SinkDesign): string[] {
  return [
    ...STANDARD_EXCLUSIONS,
    ...(d.materialSupply !== 'Artiling' ? ['Porcelain material'] : []),
    ...(d.deliveryType === 'None' ? ['Delivery'] : []),
    ...(d.installationType === 'None' ? ['Installation'] : []),
  ]
}

/** Plain-text summary for email. Internal controls (direct cost, margin, pricing mode) are omitted. */
export function clientSummaryText(d: SinkDesign, g: SinkGeometry, price: PriceResult): string {
  const lines: string[] = []
  lines.push(`Bespoke porcelain sink — ${d.reference}`)
  if (d.clientName || d.projectName) lines.push([d.clientName, d.projectName].filter(Boolean).join(' / '))
  lines.push('')
  for (const [label, value] of specification(d, g)) lines.push(`${label}: ${value}`)
  lines.push('')
  // When the margin floor lifts the price, itemised amounts would not add up, so only the total is given.
  if (!price.marginFloorApplied) {
    lines.push(`Fabrication: ${formatGbp(price.groupTotals.fabrication)}`)
    for (const group of PRICE_GROUPS.filter((group) => group.key !== 'fabrication' && group.key !== 'allowance')) {
      for (const item of price.lines.filter((line) => line.group === group.key && line.amount !== 0)) lines.push(`${item.label}: ${formatSignedGbp(item.amount)}`)
    }
    if (price.groupTotals.allowance) lines.push(`Additional detailing: ${formatGbp(price.groupTotals.allowance)}`)
    lines.push('')
  }
  lines.push(`Estimated total: ${formatGbp(price.recommendedPrice)}`)
  lines.push(`50% deposit: ${formatGbp(price.deposit)}`)
  lines.push('')
  lines.push(`Not included: ${exclusions(d).join('; ')}.`)
  lines.push('Artiling Studio is not VAT registered. No VAT is added.')
  lines.push('Preliminary estimate, confirmed once final dimensions and porcelain are approved.')
  return lines.join('\n')
}
