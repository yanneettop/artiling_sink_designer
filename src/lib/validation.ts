import { MIN_INTERNAL_DEPTH, type SinkGeometry } from './sinkGeometry'

/** Technical geometry checks, keyed by the field that should show the message. */
export type ValidationErrors = Record<string, string>

/** Smallest practical width of a single basin, mm. */
const MIN_BASIN_WIDTH = 150

export function validateGeometry(g: SinkGeometry): ValidationErrors {
  const d = g.design
  const errors: ValidationErrors = {}
  const set = (key: string, message: string) => { if (!errors[key]) errors[key] = message }

  if (d.porcelainThickness <= 0) set('porcelainThickness', 'Thickness must be greater than 0.')
  if (d.overallWidth <= d.porcelainThickness * 2) set('overallWidth', 'Width is too small for the porcelain side panels.')
  if (d.overallDepth <= g.edgeFront + g.edgeBack) set('overallDepth', 'Depth is too small for the front and rear decks.')
  const minimumHeight = d.porcelainThickness * 2 + MIN_INTERNAL_DEPTH
  if (d.overallHeight < minimumHeight) set('overallHeight', `Height must be at least ${minimumHeight} mm for a ${MIN_INTERNAL_DEPTH} mm basin.`)

  for (const [key, label] of [['leftRimWidth', 'Left'], ['rightRimWidth', 'Right'], ['frontRimWidth', 'Front'], ['rearRimWidth', 'Rear']] as const) {
    if (d[key] < d.porcelainThickness) set(key, `${label} rim cannot be thinner than the porcelain.`)
  }
  if (d.leftRimWidth + d.rightRimWidth >= d.overallWidth) set('rimWidthTotal', 'Left and right rims leave no basin width.')
  if (d.frontRimWidth + d.rearRimWidth >= d.overallDepth) set('rimDepthTotal', 'Front and rear rims leave no basin depth.')
  if (g.basins.length > 1 && g.basins[0].width < MIN_BASIN_WIDTH) set('basinCount', `Each basin would be ${Math.round(g.basins[0].width)} mm wide. Widen the sink or use fewer basins.`)

  if (d.overallHeight >= minimumHeight) {
    const max = g.maximumInternalDepth
    if (d.baseType === 'Flat' || d.fallControl === 'Fall and Low Point') {
      if (d.shallowBowlDepth < MIN_INTERNAL_DEPTH || d.shallowBowlDepth > max) set('shallowBowlDepth', `Internal depth must be between ${MIN_INTERNAL_DEPTH} and ${max} mm.`)
    }
    if (d.baseType === 'Sloped Front to Back' && d.fallControl === 'Fall and Low Point') {
      if (d.baseFall < 0) set('baseFall', 'Base fall cannot be negative.')
      else if (d.shallowBowlDepth + d.baseFall > max) set('baseFall', `Deepest point must not exceed ${max} mm.`)
    }
    if (d.baseType === 'Sloped Front to Back' && d.fallControl === 'Corner Depths') {
      if (d.rearBowlDepth < MIN_INTERNAL_DEPTH || d.rearBowlDepth > max) set('rearBowlDepth', `Rear depth must be between ${MIN_INTERNAL_DEPTH} and ${max} mm.`)
      if (d.frontBowlDepth < MIN_INTERNAL_DEPTH || d.frontBowlDepth > max) set('frontBowlDepth', `Front depth must be between ${MIN_INTERNAL_DEPTH} and ${max} mm.`)
      if (d.rearBowlDepth === d.frontBowlDepth) set('frontBowlDepth', 'Both depths are equal. Use a flat base.')
    }
  }

  const eachBasin = g.basins[0].width
  if (d.drainType === 'Circular') {
    if (d.drainDiameter <= 0) set('drainDiameter', 'Drain diameter must be greater than 0.')
    else if (d.drainDiameter > eachBasin) set('drainDiameter', 'Drain must fit within the basin.')
    const r = d.drainDiameter / 2
    const inside = g.drains.every((drain) => drain.x - r >= g.edgeLeft && drain.x + r <= g.edgeLeft + g.basinWidth && drain.y - r >= g.edgeBack && drain.y + r <= g.edgeBack + g.basinDepth)
    if (!inside) set('drainOffsetLeft', 'Drain must sit inside the basin.')
  } else {
    if (d.drainLength <= 0 || d.drainWidth <= 0) set('drainLength', 'Drain length and width must be greater than 0.')
    else if (d.drainLength > eachBasin) set('drainLength', 'Drain must fit within the basin width.')
    if (d.drainType === 'Linear' && (d.drainOffsetBack < 0 || d.drainOffsetBack + d.drainWidth > g.basinDepth)) set('drainOffsetBack', 'Drain must sit inside the basin depth.')
  }
  if (d.drainType === 'Concealed Linear') {
    if (d.coverPlateDepth <= 0 || d.coverPlateDepth >= g.basinDepth) set('coverPlateDepth', 'Cover plate must be shallower than the basin opening.')
  }

  if (d.tapType === 'Deck Mounted') {
    if (d.tapHoleDiameter <= 0) set('tapHoleDiameter', 'Hole diameter must be greater than 0.')
    const r = d.tapHoleDiameter / 2
    const fits = g.tapHoles.every((hole) => hole.y - r >= 0 && hole.y + r <= g.edgeBack && hole.x - r >= 0 && hole.x + r <= d.overallWidth)
    if (!fits) set('tapPosition', 'Tap holes must fit inside the rear deck. Widen the rear rim or reduce the holes.')
    const sorted = [...g.tapHoles].sort((a, b) => a.x - b.x)
    if (sorted.some((hole, i) => i > 0 && hole.x - sorted[i - 1].x < d.tapHoleDiameter)) set('tapPosition', 'Tap holes overlap.')
  }

  if (d.upstandEnabled && d.backUpstandHeight <= 0) set('backUpstandHeight', 'Enter the upstand height.')

  if (d.drawersEnabled) {
    if (d.drawerCount < 1 || d.drawerCount > 6) set('drawerCount', 'Use between 1 and 6 drawers.')
    if (!d.drawerAutoWidth && d.drawerWidth <= 0) set('drawerWidth', 'Drawer width must be greater than 0.')
    if (d.drawerDepth <= 0) set('drawerDepth', 'Drawer depth must be greater than 0.')
    else if (d.drawerDepth > d.overallDepth) set('drawerDepth', `Drawer depth cannot exceed the sink depth (${d.overallDepth} mm).`)
    d.drawerHeights.slice(0, d.drawerCount).forEach((height, index) => { if (height <= 0) set(`drawerHeight${index}`, 'Drawer height must be greater than 0.') })
  }
  return errors
}
