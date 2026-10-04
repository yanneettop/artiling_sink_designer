import type { SinkDesign } from '../types/sink'

/** Minimum internal depth of the basin, mm. */
export const MIN_INTERNAL_DEPTH = 40
/** Centre spacing of multiple tap holes, as a multiple of the hole diameter. */
export const TAP_HOLE_SPACING = 1.8

export interface Basin {
  /** Left edge from the sink's left edge, mm. */
  x: number
  width: number
}

export interface SinkGeometry {
  design: SinkDesign
  basinWidth: number
  basinDepth: number
  edgeLeft: number
  edgeRight: number
  edgeFront: number
  edgeBack: number
  /** Width of the porcelain divider between basins (two mitred walls), mm. */
  dividerWidth: number
  basins: Basin[]
  /** Drain centre per basin, mm from the sink's left / rear edges. */
  drains: { x: number; y: number }[]
  drainX: number
  drainY: number
  /** Tap hole centres (deck-mounted) or wall-tap outlet positions, mm. */
  tapHoles: { x: number; y: number }[]
  tapX: number
  tapY: number
  maximumInternalDepth: number
  bowlDepthFront: number
  bowlDepthRear: number
  /** True when the floor falls from all four walls to a centre round drain. */
  fallToDrain: boolean
  /** Internal depth at the drain, mm. */
  bowlDepthDrain: number
  drawerWidth: number
}

const RIM_KEYS = ['leftRimWidth', 'rightRimWidth', 'frontRimWidth', 'rearRimWidth'] as const

/**
 * Rims that produce the requested opening. The opening is centred left to right;
 * the rear rim (tap deck) is kept and the front rim takes up the difference,
 * borrowing from the rear only when the front would be thinner than the porcelain.
 */
export function rimsForOpening(design: SinkDesign, openingWidth: number, openingDepth: number): Pick<SinkDesign, typeof RIM_KEYS[number]> {
  const side = Math.max(0, design.overallWidth - openingWidth) / 2
  const leftRimWidth = Math.floor(side)
  const rightRimWidth = Math.max(0, design.overallWidth - openingWidth - leftRimWidth)
  const spareDepth = design.overallDepth - openingDepth
  let rearRimWidth = design.rearRimWidth
  let frontRimWidth = spareDepth - rearRimWidth
  if (frontRimWidth < design.porcelainThickness) {
    frontRimWidth = design.porcelainThickness
    rearRimWidth = spareDepth - frontRimWidth
  }
  return { leftRimWidth, rightRimWidth, frontRimWidth: Math.max(0, frontRimWidth), rearRimWidth: Math.max(0, rearRimWidth) }
}

/**
 * Applies a patch while honouring a manually entered basin opening: overall size
 * changes keep the opening and move the rims; rim changes update the stored opening.
 */
export function applyOpeningRules(current: SinkDesign, patch: Partial<SinkDesign>): SinkDesign {
  const next = { ...current, ...patch }
  if (!next.basinOpeningManual) return next
  const turningOn = patch.basinOpeningManual === true && !current.basinOpeningManual
  if (turningOn) {
    const g = calculateGeometry(current)
    return { ...next, basinOpeningWidth: Math.round(g.basinWidth), basinOpeningDepth: Math.round(g.basinDepth) }
  }
  if (RIM_KEYS.some((key) => key in patch)) {
    return { ...next, basinOpeningWidth: next.overallWidth - next.leftRimWidth - next.rightRimWidth, basinOpeningDepth: next.overallDepth - next.frontRimWidth - next.rearRimWidth }
  }
  if ('overallWidth' in patch || 'overallDepth' in patch || 'basinOpeningWidth' in patch || 'basinOpeningDepth' in patch) {
    return { ...next, ...rimsForOpening(next, next.basinOpeningWidth, next.basinOpeningDepth) }
  }
  return next
}

/** Size and direction of the basin floor fall, for labels and specifications. */
export function describeFall(g: SinkGeometry): { fall: number; to: 'rear' | 'front' | 'drain' | 'level' } {
  if (g.fallToDrain) {
    const fall = Math.round(g.bowlDepthDrain - g.bowlDepthRear)
    return { fall, to: fall > 0 ? 'drain' : 'level' }
  }
  const fall = Math.round(Math.abs(g.bowlDepthRear - g.bowlDepthFront))
  return { fall, to: g.bowlDepthRear > g.bowlDepthFront ? 'rear' : g.bowlDepthFront > g.bowlDepthRear ? 'front' : 'level' }
}

export function calculateGeometry(design: SinkDesign): SinkGeometry {
  const edgeLeft = Math.max(design.leftRimWidth, design.porcelainThickness)
  const edgeRight = Math.max(design.rightRimWidth, design.porcelainThickness)
  const edgeFront = Math.max(design.frontRimWidth, design.porcelainThickness)
  const edgeBack = Math.max(design.rearRimWidth, design.porcelainThickness)
  const basinWidth = Math.max(1, design.overallWidth - edgeLeft - edgeRight)
  const basinDepth = Math.max(1, design.overallDepth - edgeFront - edgeBack)

  const count = Math.max(1, Math.round(design.basinCount) || 1)
  const dividerWidth = count > 1 ? design.porcelainThickness * 2 : 0
  const eachWidth = Math.max(1, (basinWidth - dividerWidth * (count - 1)) / count)
  const basins = Array.from({ length: count }, (_, index) => ({ x: edgeLeft + index * (eachWidth + dividerWidth), width: eachWidth }))

  // Concealed linear drains always sit against the rear wall.
  const atRear = design.drainType === 'Concealed Linear' || design.drainPosition === 'Rear'
  const drainY = atRear
    ? design.drainType === 'Concealed Linear' ? edgeBack + design.coverPlateDepth / 2
      : design.drainType === 'Linear' ? edgeBack + design.drainOffsetBack + design.drainWidth / 2 : edgeBack + design.drainOffsetBack
    : edgeBack + basinDepth / 2
  const customDrainX = count === 1 && design.drainType === 'Circular' && !design.centreDrainAutomatically
  const drains = basins.map((basin) => ({ x: customDrainX ? design.drainOffsetLeft : basin.x + basin.width / 2, y: drainY }))

  const tapY = design.tapType === 'Wall Mounted' ? 0 : Math.max(8, design.tapOffsetBack)
  const customTap = count === 1 && design.tapPosition === 'Custom' && design.tapType === 'Deck Mounted'
  const tapCentres = customTap ? [design.tapOffsetLeft] : count === 1 ? [design.overallWidth / 2] : basins.map((basin) => basin.x + basin.width / 2)
  const holesPerBasin = design.tapType === 'Deck Mounted' ? Math.max(1, Math.round(design.tapHoleCount)) : design.tapType === 'Wall Mounted' ? 1 : 0
  const spacing = design.tapHoleDiameter * TAP_HOLE_SPACING
  const tapHoles = tapCentres.flatMap((centre) => Array.from({ length: holesPerBasin }, (_, i) => ({ x: centre + (i - (holesPerBasin - 1) / 2) * spacing, y: tapY })))

  const maximumInternalDepth = design.overallHeight - design.porcelainThickness * 2
  const clampDepth = (value: number) => Math.max(1, Math.min(maximumInternalDepth, Math.max(MIN_INTERNAL_DEPTH, value)))
  const automaticDepth = clampDepth(design.shallowBowlDepth)
  let bowlDepthFront = automaticDepth
  let bowlDepthRear = automaticDepth
  // A centre round drain gets a four-way fall: every wall at the shallow depth, the drain lowest.
  const fallToDrain = design.baseType === 'Sloped Front to Back' && design.drainType === 'Circular' && design.drainPosition === 'Centre'
  let bowlDepthDrain = automaticDepth
  if (fallToDrain) {
    bowlDepthDrain = clampDepth(automaticDepth + design.baseFall)
  } else if (design.baseType === 'Sloped Front to Back') {
    if (design.fallControl === 'Corner Depths') {
      bowlDepthFront = clampDepth(design.frontBowlDepth)
      bowlDepthRear = clampDepth(design.rearBowlDepth)
    } else if (design.fallLowPoint === 'Front Internal Corner') {
      bowlDepthFront = clampDepth(automaticDepth + design.baseFall)
    } else {
      bowlDepthRear = clampDepth(automaticDepth + design.baseFall)
    }
  }

  return {
    design, basinWidth, basinDepth, edgeLeft, edgeRight, edgeFront, edgeBack, dividerWidth, basins, drains,
    drainX: drains[0].x, drainY, tapHoles, tapX: tapCentres[0] ?? design.overallWidth / 2, tapY, maximumInternalDepth,
    bowlDepthFront, bowlDepthRear, fallToDrain,
    bowlDepthDrain: fallToDrain ? bowlDepthDrain : atRear ? bowlDepthRear : (bowlDepthFront + bowlDepthRear) / 2,
    drawerWidth: design.drawerAutoWidth ? design.overallWidth : design.drawerWidth,
  }
}
