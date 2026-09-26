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
  drawerWidth: number
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
  if (design.baseType === 'Sloped Front to Back') {
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
    bowlDepthFront, bowlDepthRear, drawerWidth: design.drawerAutoWidth ? design.overallWidth : design.drawerWidth,
  }
}
