export type DrainType = 'Circular' | 'Linear' | 'Concealed Linear'
export type TapType = 'None' | 'Wall Mounted' | 'Deck Mounted'
export type BaseType = 'Flat' | 'Sloped Front to Back'
export type FallControl = 'Fall and Low Point' | 'Corner Depths'
export type FallLowPoint = 'Rear Internal Corner' | 'Front Internal Corner'
export type Finish = 'Matt' | 'Polished' | 'Textured'

export interface SinkDesign {
  id: string
  updatedAt: string
  clientName: string
  projectName: string
  reference: string
  notes: string
  material: string
  finish: Finish
  materialNotes: string
  overallWidth: number
  overallDepth: number
  overallHeight: number
  porcelainThickness: number
  leftRimWidth: number
  rightRimWidth: number
  frontRimWidth: number
  rearRimWidth: number
  /** Legacy value retained only when loading older saved designs. */
  frontFasciaHeight?: number
  /** Legacy values retained only when loading older saved designs. */
  leftSideThickness?: number
  rightSideThickness?: number
  upstandEnabled: boolean
  backUpstandHeight: number
  drawersEnabled: boolean
  drawerCount: number
  drawerAutoWidth: boolean
  drawerWidth: number
  drawerDepth: number
  drawerHeights: number[]
  equalDrawerHeights: boolean
  drawerGap: number
  drawerTopGap: number
  baseType: BaseType
  baseFall: number
  fallControl: FallControl
  fallLowPoint: FallLowPoint
  shallowBowlDepth: number
  rearBowlDepth: number
  frontBowlDepth: number
  drainType: DrainType
  drainPosition: 'Centre' | 'Rear'
  drainDiameter: number
  drainLength: number
  drainWidth: number
  drainOffsetBack: number
  drainOffsetLeft: number
  centreDrainAutomatically: boolean
  coverPlateWidth: number
  coverPlateDepth: number
  coverPlateFullWidth: boolean
  drainGap: number
  tapType: TapType
  tapHoleCount: number
  tapHoleDiameter: number
  tapPosition: 'Centre' | 'Custom'
  tapOffsetBack: number
  tapOffsetLeft: number
}

export type ViewName = 'threeD' | 'axonometric' | 'client' | 'top' | 'front' | 'side'

export const createDefaultDesign = (): SinkDesign => ({
  id: crypto.randomUUID(), updatedAt: new Date().toISOString(),
  clientName: '', projectName: '', reference: 'AS-SINK-001', notes: '',
  material: 'Porcelain', finish: 'Matt', materialNotes: '',
  overallWidth: 800, overallDepth: 450, overallHeight: 250, porcelainThickness: 12,
  leftRimWidth: 50, rightRimWidth: 50, frontRimWidth: 50, rearRimWidth: 80,
  upstandEnabled: false, backUpstandHeight: 0,
  drawersEnabled: false, drawerCount: 2, drawerAutoWidth: true, drawerWidth: 800,
  drawerDepth: 430, drawerHeights: [240, 240], equalDrawerHeights: true, drawerGap: 0, drawerTopGap: 0,
  baseType: 'Sloped Front to Back', baseFall: 20,
  fallControl: 'Fall and Low Point', fallLowPoint: 'Rear Internal Corner', shallowBowlDepth: 138, rearBowlDepth: 158, frontBowlDepth: 138,
  drainType: 'Concealed Linear', drainPosition: 'Rear', drainDiameter: 45,
  drainLength: 700, drainWidth: 40, drainOffsetBack: 32, drainOffsetLeft: 38,
  centreDrainAutomatically: true, coverPlateWidth: 700, coverPlateDepth: 40, coverPlateFullWidth: true, drainGap: 5,
  tapType: 'Deck Mounted', tapHoleCount: 1, tapHoleDiameter: 35,
  tapPosition: 'Centre', tapOffsetBack: 25, tapOffsetLeft: 400,
})
