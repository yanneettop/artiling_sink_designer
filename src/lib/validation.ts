import type { SinkGeometry } from './sinkGeometry'

export type ValidationErrors = Record<string, string>

export function validateGeometry(g: SinkGeometry): ValidationErrors {
  const d = g.design
  const errors: ValidationErrors = {}
  if (d.porcelainThickness <= 0) errors.porcelainThickness = 'Thickness must be greater than 0.'
  if (d.leftRimWidth < d.porcelainThickness) errors.leftRimWidth = 'Rim cannot be thinner than the porcelain.'
  if (d.rightRimWidth < d.porcelainThickness) errors.rightRimWidth = 'Rim cannot be thinner than the porcelain.'
  if (d.frontRimWidth < d.porcelainThickness) errors.frontRimWidth = 'Rim cannot be thinner than the porcelain.'
  if (d.rearRimWidth < d.porcelainThickness) errors.rearRimWidth = 'Rim cannot be thinner than the porcelain.'
  if (d.leftRimWidth + d.rightRimWidth >= d.overallWidth) errors.leftRimWidth = 'Left and right rims leave no basin width.'
  if (d.frontRimWidth + d.rearRimWidth >= d.overallDepth) errors.frontRimWidth = 'Front and rear rims leave no basin depth.'
  if (d.overallWidth <= d.porcelainThickness * 2) errors.overallWidth = 'Overall width is too small for the porcelain side panels.'
  if (d.overallDepth <= g.edgeFront + g.edgeBack) errors.overallDepth = 'Overall depth is too small for the front and rear decks.'
  if (d.drawersEnabled) {
    if (d.drawerCount < 1 || d.drawerCount > 6) errors.drawerCount = 'Use between 1 and 6 drawers.'
    if (!d.drawerAutoWidth && d.drawerWidth <= 0) errors.drawerWidth = 'Drawer width must be greater than 0.'
    if (d.drawerDepth <= 0) errors.drawerDepth = 'Drawer depth must be greater than 0.'
    d.drawerHeights.slice(0, d.drawerCount).forEach((height, index) => { if (height <= 0) errors[`drawerHeight${index}`] = 'Drawer height must be greater than 0.' })
  }
  const drainSpan = d.drainType === 'Circular' ? d.drainDiameter : d.drainLength
  if (drainSpan > g.basinWidth) errors.drainLength = 'Drain must fit within the internal basin.'
  if (d.drainType === 'Concealed Linear' && !d.coverPlateFullWidth && d.coverPlateWidth > g.basinWidth) errors.coverPlateWidth = 'Cover plate must fit within the internal basin.'
  if (d.drainType === 'Circular' && (g.drainX < g.edgeLeft || g.drainX > g.edgeLeft + g.basinWidth)) errors.drainOffsetLeft = 'Drain centre must remain inside the basin.'
  if (d.tapType === 'Deck Mounted' && (g.tapY + d.tapHoleDiameter / 2 > g.edgeBack || g.tapX < d.tapHoleDiameter / 2 || g.tapX > d.overallWidth - d.tapHoleDiameter / 2)) errors.tapPosition = 'Tap holes must remain inside the rear deck.'
  if (d.baseType === 'Sloped Front to Back' && d.fallControl === 'Fall and Low Point' && (d.baseFall < 0 || d.baseFall > d.overallHeight / 2)) errors.baseFall = 'Base fall must be between 0 and half the sink height.'
  if (d.baseType === 'Flat' || (d.baseType === 'Sloped Front to Back' && d.fallControl === 'Fall and Low Point')) {
    const maximumDepth = d.overallHeight - d.porcelainThickness * 2
    if (d.shallowBowlDepth < 40 || d.shallowBowlDepth > maximumDepth) errors.shallowBowlDepth = `Internal depth must be between 40 and ${maximumDepth} mm.`
    if (d.baseType === 'Sloped Front to Back' && d.shallowBowlDepth + d.baseFall > maximumDepth) errors.baseFall = `Deep internal depth must not exceed ${maximumDepth} mm.`
  }
  if (d.baseType === 'Sloped Front to Back' && d.fallControl === 'Corner Depths') {
    const maximumDepth = d.overallHeight - d.porcelainThickness * 2
    if (d.rearBowlDepth < 40 || d.rearBowlDepth > maximumDepth) errors.rearBowlDepth = `Rear corner depth must be between 40 and ${maximumDepth} mm.`
    if (d.frontBowlDepth < 40 || d.frontBowlDepth > maximumDepth) errors.frontBowlDepth = `Front corner depth must be between 40 and ${maximumDepth} mm.`
    if (d.rearBowlDepth === d.frontBowlDepth) errors.frontBowlDepth = 'Use Flat base when both corner depths are equal.'
  }
  return errors
}
