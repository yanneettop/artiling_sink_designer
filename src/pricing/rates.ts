/**
 * Artiling Studio sink pricing framework, September 2026.
 *
 * Source: Artiling_Sink_Pricing.pdf ("Bespoke Sink Pricing Framework") and the
 * "Pricing Rules" / "Developer Spec" sheets of Artiling_Sink_Pricing_Calculator.xlsx.
 *
 * Every figure here is a business rule. Do not change a value without
 * confirmation from Ioannis / Artan. Items marked CONFIRM are interpretations
 * that are still awaiting sign-off.
 */
import type { PricingMode } from '../types/sink'

export type ReviewLevel = 'none' | 'review' | 'approval'

export interface WidthBand {
  /** Inclusive upper bound in mm. `Infinity` for the last band. */
  maxWidth: number
  /** Portfolio price = max(minimum, width + addition). */
  addition: number
  minimum: number
  review: ReviewLevel
}

export interface DepthBand {
  /** Inclusive upper bound in mm. */
  maxDepth: number
  adjustment: Record<PricingMode, number>
  review: ReviewLevel
}

/** Portfolio base fabrication by overall width. Standard is derived from it (see STANDARD_DISCOUNT). */
export const WIDTH_BANDS: WidthBand[] = [
  { maxWidth: 600, addition: 0, minimum: 850, review: 'none' },
  { maxWidth: 1200, addition: 250, minimum: 0, review: 'none' },
  { maxWidth: 1500, addition: 400, minimum: 0, review: 'none' },
  { maxWidth: 1800, addition: 450, minimum: 0, review: 'none' },
  { maxWidth: Infinity, addition: 500, minimum: 0, review: 'approval' },
]

export const DEPTH_BANDS: DepthBand[] = [
  { maxDepth: 300, adjustment: { Portfolio: -200, Standard: -225 }, review: 'none' },
  { maxDepth: 400, adjustment: { Portfolio: -100, Standard: -125 }, review: 'none' },
  { maxDepth: 550, adjustment: { Portfolio: 0, Standard: 0 }, review: 'none' },
  { maxDepth: 650, adjustment: { Portfolio: 225, Standard: 250 }, review: 'review' },
  { maxDepth: Infinity, adjustment: { Portfolio: 350, Standard: 400 }, review: 'approval' },
]

/** Portfolio pricing sits ~10% below Standard. Standard base = Portfolio base / (1 - discount). */
export const STANDARD_DISCOUNT = 0.1

/**
 * Rounding of the width-based fabrication price.
 * CONFIRM: the brief says "normally nearest £25"; the xlsx developer spec says £50.
 * Standard uses £50, which is required to reproduce the published £2,800 for 2000 mm.
 */
export const BASE_ROUNDING: Record<PricingMode, number> = { Portfolio: 25, Standard: 50 }

/** Final quotation rounding. */
export const QUOTE_ROUNDING = 25

/** Porcelain handling / waste allowance added to actual supplier cost. */
export const MATERIAL_MARKUP: Record<PricingMode, number> = { Portfolio: 0.18, Standard: 0.2 }

/** Minimum price = direct job cost / (1 - TARGET_GROSS_MARGIN). */
export const TARGET_GROSS_MARGIN = 0.35

export const DEPOSIT_RATE = 0.5

type Rate = Record<PricingMode, number>

export const RATES = {
  specialistConcealedDrain: { Portfolio: 175, Standard: 200 },
  additionalBasin: { Portfolio: 400, Standard: 450 },
  additionalTapHole: { Portfolio: 40, Standard: 50 },
  overflow: { Portfolio: 75, Standard: 100 },
  wallMountedSupport: { Portfolio: 150, Standard: 200 },
  irregularGeometry: { Portfolio: 200, Standard: 250 },
  matchingUpstand: { Portfolio: 150, Standard: 175 },
  shelf: { Portfolio: 300, Standard: 350 },
  drawerPair: { Portfolio: 850, Standard: 950 },
  vanityCladding: { Portfolio: 550, Standard: 650 },
  deliveryLondon: { Portfolio: 100, Standard: 150 },
  deliveryLarge: { Portfolio: 200, Standard: 250 },
  installationStandard: { Portfolio: 250, Standard: 300 },
  installationLarge: { Portfolio: 350, Standard: 450 },
  templatingPhysical: { Portfolio: 150, Standard: 200 },
} satisfies Record<string, Rate>

/** Configurator range from the developer spec. Outside it, prices are indicative only. */
export const SPEC_RANGE = {
  width: { min: 400, max: 2400 },
  depth: { min: 200, max: 800 },
}

export const LIMITS = {
  basins: { min: 1, max: 3 },
  tapHolesPerBasin: { min: 1, max: 4 },
  shelves: { min: 0, max: 3 },
  /** Drawers are priced in pairs; the rate card covers up to two pairs. */
  pricedDrawerPairs: 2,
}
