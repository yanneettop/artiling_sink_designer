export const DRAIN_TYPES = ['Concealed Linear', 'Circular', 'Linear'] as const
export const TAP_TYPES = ['Deck Mounted', 'Wall Mounted', 'None'] as const
export const BASE_TYPES = ['Sloped Front to Back', 'Flat'] as const
export const FALL_CONTROLS = ['Fall and Low Point', 'Corner Depths'] as const
export const FALL_LOW_POINTS = ['Rear Internal Corner', 'Front Internal Corner'] as const
export const FINISHES = ['Matt', 'Polished', 'Textured'] as const
export const MOUNTING_TYPES = ['Wall Mounted', 'Supported', 'Freestanding'] as const
export const SHAPE_TYPES = ['Rectangular', 'Irregular'] as const
export const CONCEALED_DETAILS = ['Standard', 'Specialist'] as const
export const MATERIAL_SUPPLY = ['TBC', 'Client', 'Artiling'] as const
export const DELIVERY_TYPES = ['None', 'London', 'Large', 'Manual'] as const
export const INSTALLATION_TYPES = ['None', 'Standard', 'Large', 'Manual'] as const
export const TEMPLATING_TYPES = ['None', 'Physical'] as const
export const PRICING_MODES = ['Portfolio', 'Standard'] as const
export const REVIEW_FLAGS = ['Specialist reinforcement', 'Difficult porcelain', 'Complex mounting', 'Non-standard fabrication'] as const

export type DrainType = typeof DRAIN_TYPES[number]
export type TapType = typeof TAP_TYPES[number]
export type BaseType = typeof BASE_TYPES[number]
export type FallControl = typeof FALL_CONTROLS[number]
export type FallLowPoint = typeof FALL_LOW_POINTS[number]
export type Finish = typeof FINISHES[number]
export type MountingType = typeof MOUNTING_TYPES[number]
export type ShapeType = typeof SHAPE_TYPES[number]
export type ConcealedDetail = typeof CONCEALED_DETAILS[number]
export type MaterialSupply = typeof MATERIAL_SUPPLY[number]
export type DeliveryType = typeof DELIVERY_TYPES[number]
export type InstallationType = typeof INSTALLATION_TYPES[number]
export type TemplatingType = typeof TEMPLATING_TYPES[number]
export type PricingMode = typeof PRICING_MODES[number]
export type ReviewFlag = typeof REVIEW_FLAGS[number]

export interface SinkDesign {
  id: string
  updatedAt: string
  clientName: string
  projectName: string
  reference: string
  notes: string
  siteLocation: string
  material: string
  finish: Finish
  materialNotes: string
  materialSupply: MaterialSupply
  /** Actual supplier cost of the porcelain in GBP, before handling / waste allowance. */
  materialCost: number
  overallWidth: number
  overallDepth: number
  overallHeight: number
  porcelainThickness: number
  leftRimWidth: number
  rightRimWidth: number
  frontRimWidth: number
  rearRimWidth: number
  /** When true the basin opening is entered directly and the rims are derived from it. */
  basinOpeningManual: boolean
  /** Total opening (all basins and dividers), mm. Used only when basinOpeningManual. */
  basinOpeningWidth: number
  basinOpeningDepth: number
  /** Legacy value retained only when loading older saved designs. */
  frontFasciaHeight?: number
  /** Legacy values retained only when loading older saved designs. */
  leftSideThickness?: number
  rightSideThickness?: number
  basinCount: number
  mountingType: MountingType
  shapeType: ShapeType
  overflow: boolean
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
  vanityCladding: boolean
  shelfCount: number
  baseType: BaseType
  baseFall: number
  fallControl: FallControl
  fallLowPoint: FallLowPoint
  shallowBowlDepth: number
  rearBowlDepth: number
  frontBowlDepth: number
  drainType: DrainType
  concealedDetail: ConcealedDetail
  drainPosition: 'Centre' | 'Rear'
  drainDiameter: number
  drainLength: number
  drainWidth: number
  drainOffsetBack: number
  drainOffsetLeft: number
  centreDrainAutomatically: boolean
  /** Legacy: the concealed-drain lid now always runs the full internal width. */
  coverPlateWidth: number
  coverPlateDepth: number
  coverPlateFullWidth: boolean
  drainGap: number
  tapType: TapType
  /** Tap holes per basin (deck-mounted taps only). */
  tapHoleCount: number
  tapHoleDiameter: number
  tapPosition: 'Centre' | 'Custom'
  tapOffsetBack: number
  tapOffsetLeft: number
  deliveryType: DeliveryType
  manualDelivery: number
  installationType: InstallationType
  manualInstallation: number
  templating: TemplatingType
  pricingMode: PricingMode
  manualComplexity: number
  manualComplexityNote: string
  directJobCost: number
  reviewFlags: ReviewFlag[]
}

export type ViewName = 'quote' | 'threeD' | 'axonometric' | 'client' | 'top' | 'front' | 'side'

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const createDefaultDesign = (reference = 'AS-SINK-001'): SinkDesign => ({
  id: createId(), updatedAt: new Date().toISOString(),
  clientName: '', projectName: '', reference, notes: '', siteLocation: '',
  material: '', finish: 'Matt', materialNotes: '', materialSupply: 'TBC', materialCost: 0,
  overallWidth: 800, overallDepth: 450, overallHeight: 250, porcelainThickness: 12,
  leftRimWidth: 50, rightRimWidth: 50, frontRimWidth: 50, rearRimWidth: 80,
  basinOpeningManual: false, basinOpeningWidth: 700, basinOpeningDepth: 320,
  basinCount: 1, mountingType: 'Supported', shapeType: 'Rectangular', overflow: false,
  upstandEnabled: false, backUpstandHeight: 100,
  drawersEnabled: false, drawerCount: 2, drawerAutoWidth: true, drawerWidth: 800,
  drawerDepth: 430, drawerHeights: [240, 240], equalDrawerHeights: true, drawerGap: 0, drawerTopGap: 0,
  vanityCladding: false, shelfCount: 0,
  baseType: 'Sloped Front to Back', baseFall: 20,
  fallControl: 'Fall and Low Point', fallLowPoint: 'Rear Internal Corner', shallowBowlDepth: 138, rearBowlDepth: 158, frontBowlDepth: 138,
  drainType: 'Concealed Linear', concealedDetail: 'Standard', drainPosition: 'Rear', drainDiameter: 45,
  drainLength: 700, drainWidth: 40, drainOffsetBack: 32, drainOffsetLeft: 38,
  centreDrainAutomatically: true, coverPlateWidth: 700, coverPlateDepth: 40, coverPlateFullWidth: true, drainGap: 5,
  tapType: 'Deck Mounted', tapHoleCount: 1, tapHoleDiameter: 35,
  tapPosition: 'Centre', tapOffsetBack: 25, tapOffsetLeft: 400,
  deliveryType: 'London', manualDelivery: 0, installationType: 'Standard', manualInstallation: 0, templating: 'None',
  pricingMode: 'Portfolio', manualComplexity: 0, manualComplexityNote: '', directJobCost: 0, reviewFlags: [],
})
