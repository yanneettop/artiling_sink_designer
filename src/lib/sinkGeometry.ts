import type { SinkDesign } from '../types/sink'

export interface SinkGeometry {
  design: SinkDesign
  basinWidth: number
  basinDepth: number
  edgeLeft: number
  edgeRight: number
  edgeFront: number
  edgeBack: number
  drainX: number
  drainY: number
  tapX: number
  tapY: number
  bowlDepthFront: number
  bowlDepthRear: number
}

export function calculateGeometry(design: SinkDesign): SinkGeometry {
  const edgeLeft = Math.max(design.leftRimWidth, design.porcelainThickness)
  const edgeRight = Math.max(design.rightRimWidth, design.porcelainThickness)
  const edgeFront = Math.max(design.frontRimWidth, design.porcelainThickness)
  const edgeBack = Math.max(design.rearRimWidth, design.porcelainThickness)
  const basinWidth = Math.max(1, design.overallWidth - edgeLeft - edgeRight)
  const basinDepth = Math.max(1, design.overallDepth - edgeFront - edgeBack)
  const drainX = design.centreDrainAutomatically ? edgeLeft + basinWidth / 2 : design.drainOffsetLeft
  const drainY = design.drainPosition === 'Rear'
    ? design.drainType === 'Concealed Linear'
      ? edgeBack + design.coverPlateDepth / 2
      : edgeBack + design.drainOffsetBack
    : edgeBack + basinDepth / 2
  const tapX = design.tapPosition === 'Centre' ? design.overallWidth / 2 : design.tapOffsetLeft
  const tapY = Math.max(8, design.tapOffsetBack)
  const maximumDepth = design.overallHeight - design.porcelainThickness * 2
  const automaticDepth = Math.min(maximumDepth, Math.max(40, design.shallowBowlDepth))
  let bowlDepthFront = automaticDepth
  let bowlDepthRear = automaticDepth
  if (design.baseType === 'Sloped Front to Back') {
    if (design.fallControl === 'Corner Depths') {
      bowlDepthFront = Math.min(maximumDepth, Math.max(40, design.frontBowlDepth))
      bowlDepthRear = Math.min(maximumDepth, Math.max(40, design.rearBowlDepth))
    } else if (design.fallLowPoint === 'Front Internal Corner') {
      bowlDepthRear = automaticDepth
      bowlDepthFront = Math.min(maximumDepth, automaticDepth + design.baseFall)
    } else {
      bowlDepthFront = automaticDepth
      bowlDepthRear = Math.min(maximumDepth, automaticDepth + design.baseFall)
    }
  }
  return { design, basinWidth, basinDepth, edgeLeft, edgeRight, edgeFront, edgeBack, drainX, drainY, tapX, tapY, bowlDepthFront, bowlDepthRear }
}
