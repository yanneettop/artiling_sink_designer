import type { DeliveryType, DrainType, InstallationType, MaterialSupply, MountingType, PricingMode, ReviewFlag, ShapeType, TemplatingType } from '../types/sink'
import {
  BASE_ROUNDING, DEPOSIT_RATE, DEPTH_BANDS, LIMITS, MATERIAL_MARKUP, QUOTE_ROUNDING, RATES, SPEC_RANGE,
  STANDARD_DISCOUNT, TARGET_GROSS_MARGIN, WIDTH_BANDS, type ReviewLevel,
} from './rates'

export interface PricingInput {
  mode: PricingMode
  widthMm: number
  depthMm: number
  basinCount: number
  /** Total tap holes drilled in the sink (0 for wall-mounted or no taps). */
  tapHoles: number
  drainType: DrainType
  specialistConcealedDrain: boolean
  overflow: boolean
  mounting: MountingType
  shape: ShapeType
  upstand: boolean
  shelves: number
  /** Number of vanity drawers (0 when no vanity). */
  drawers: number
  vanityCladding: boolean
  materialSupply: MaterialSupply
  materialCost: number
  delivery: DeliveryType
  manualDelivery: number
  installation: InstallationType
  manualInstallation: number
  templating: TemplatingType
  manualComplexity: number
  directJobCost: number
  reviewFlags: ReviewFlag[]
}

export type PriceGroup = 'fabrication' | 'options' | 'vanity' | 'material' | 'delivery' | 'installation' | 'templating' | 'allowance'
export type WarningLevel = 'info' | 'review' | 'approval'
export type Confidence = 'high' | 'review' | 'approval'

export interface PriceLine {
  key: string
  group: PriceGroup
  label: string
  detail: string
  amount: number
}

export interface PriceWarning {
  key: string
  level: WarningLevel
  message: string
}

export interface PriceResult {
  mode: PricingMode
  lines: PriceLine[]
  groupTotals: Record<PriceGroup, number>
  /** Base fabrication from width, before the depth adjustment. */
  baseFabrication: number
  depthAdjustment: number
  subtotal: number
  /** Sum of all components rounded to the nearest £25. */
  commercialPrice: number
  /** Direct job cost / (1 - margin), rounded up to £25. Null when no direct cost is entered. */
  safeMinimum: number | null
  marginFloorApplied: boolean
  recommendedPrice: number
  deposit: number
  balance: number
  warnings: PriceWarning[]
  confidence: Confidence
}

export const PRICE_GROUPS: { key: PriceGroup; label: string }[] = [
  { key: 'fabrication', label: 'Fabrication' },
  { key: 'options', label: 'Options' },
  { key: 'vanity', label: 'Vanity & extras' },
  { key: 'material', label: 'Material' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'installation', label: 'Installation' },
  { key: 'templating', label: 'Templating' },
  { key: 'allowance', label: 'Manual allowance' },
]

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High confidence',
  review: 'Review recommended',
  approval: 'Artan confirmation required',
}

export const roundTo = (value: number, step: number) => Math.round(value / step) * step
export const roundUpTo = (value: number, step: number) => Math.ceil(value / step) * step

const gbp = (value: number) => `£${value.toLocaleString('en-GB')}`

export function widthBand(widthMm: number) {
  return WIDTH_BANDS.find((band) => widthMm <= band.maxWidth) ?? WIDTH_BANDS[WIDTH_BANDS.length - 1]
}

export function depthBand(depthMm: number) {
  return DEPTH_BANDS.find((band) => depthMm <= band.maxDepth) ?? DEPTH_BANDS[DEPTH_BANDS.length - 1]
}

export function portfolioBaseFabrication(widthMm: number): number {
  if (!(widthMm > 0)) return 0
  const band = widthBand(widthMm)
  return roundTo(Math.max(band.minimum, widthMm + band.addition), BASE_ROUNDING.Portfolio)
}

export function baseFabrication(widthMm: number, mode: PricingMode): number {
  const portfolio = portfolioBaseFabrication(widthMm)
  if (mode === 'Portfolio') return portfolio
  return roundTo(portfolio / (1 - STANDARD_DISCOUNT), BASE_ROUNDING.Standard)
}

export function depthAdjustment(depthMm: number, mode: PricingMode): number {
  if (!(depthMm > 0)) return 0
  return depthBand(depthMm).adjustment[mode]
}

function bandLabel(widthMm: number) {
  const index = WIDTH_BANDS.indexOf(widthBand(widthMm))
  const band = WIDTH_BANDS[index]
  const lower = index === 0 ? 0 : WIDTH_BANDS[index - 1].maxWidth + 1
  const range = band.maxWidth === Infinity ? `over ${lower - 1} mm` : index === 0 ? `up to ${band.maxWidth} mm` : `${lower}–${band.maxWidth} mm`
  return band.minimum ? `${range}, minimum ${gbp(band.minimum)}` : `${range}, width + ${gbp(band.addition)}`
}

const levelFromReview = (review: ReviewLevel): WarningLevel | null => review === 'none' ? null : review

export function calculatePrice(input: PricingInput): PriceResult {
  const { mode } = input
  const rate = (key: keyof typeof RATES) => RATES[key][mode]
  const lines: PriceLine[] = []
  const warnings: PriceWarning[] = []
  const add = (line: PriceLine) => lines.push(line)
  const warn = (key: string, level: WarningLevel, message: string) => warnings.push({ key, level, message })

  // 1–2. Base fabrication from width
  const base = baseFabrication(input.widthMm, mode)
  add({ key: 'base', group: 'fabrication', label: 'Base fabrication', detail: `${input.widthMm} mm wide · ${bandLabel(input.widthMm)}${mode === 'Standard' ? ' · Standard rate' : ''}`, amount: base })

  // 3. Depth adjustment
  const depthAdj = depthAdjustment(input.depthMm, mode)
  if (depthAdj !== 0) add({ key: 'depth', group: 'fabrication', label: depthAdj < 0 ? 'Shallow depth adjustment' : 'Deep sink adjustment', detail: `${input.depthMm} mm deep`, amount: depthAdj })

  // 4. Fabrication add-ons
  if (input.drainType === 'Concealed Linear' && input.specialistConcealedDrain) add({ key: 'drain', group: 'options', label: 'Specialist concealed drain', detail: 'Per sink', amount: rate('specialistConcealedDrain') })
  const extraBasins = Math.max(0, Math.round(input.basinCount) - 1)
  if (extraBasins) add({ key: 'basins', group: 'options', label: `Additional basin${extraBasins > 1 ? 's' : ''}`, detail: `${extraBasins} × ${gbp(rate('additionalBasin'))} after the first`, amount: extraBasins * rate('additionalBasin') })
  const extraHoles = Math.max(0, Math.round(input.tapHoles) - 1)
  if (extraHoles) add({ key: 'taps', group: 'options', label: `Additional tap hole${extraHoles > 1 ? 's' : ''}`, detail: `${extraHoles} × ${gbp(rate('additionalTapHole'))} after the first`, amount: extraHoles * rate('additionalTapHole') })
  if (input.overflow) add({ key: 'overflow', group: 'options', label: 'Overflow detail', detail: 'Per sink', amount: rate('overflow') })
  if (input.mounting === 'Wall Mounted') add({ key: 'wall', group: 'options', label: 'Wall-mounted support', detail: 'Support allowance per sink', amount: rate('wallMountedSupport') })
  if (input.shape === 'Irregular') add({ key: 'shape', group: 'options', label: 'Irregular / polygonal geometry', detail: 'Per sink', amount: rate('irregularGeometry') })

  // 5. Vanity and extras
  if (input.upstand) add({ key: 'upstand', group: 'vanity', label: 'Matching upstand', detail: 'Per sink', amount: rate('matchingUpstand') })
  const shelves = Math.max(0, Math.round(input.shelves))
  if (shelves) add({ key: 'shelves', group: 'vanity', label: `Porcelain shel${shelves > 1 ? 'ves' : 'f'}`, detail: `${shelves} × ${gbp(rate('shelf'))}`, amount: shelves * rate('shelf') })
  const drawers = Math.max(0, Math.round(input.drawers))
  const pairs = Math.ceil(drawers / 2)
  if (pairs) add({ key: 'drawers', group: 'vanity', label: 'Two-drawer vanity unit', detail: `${drawers} drawer${drawers > 1 ? 's' : ''} priced as ${pairs} pair${pairs > 1 ? 's' : ''} × ${gbp(rate('drawerPair'))}`, amount: pairs * rate('drawerPair') })
  if (input.vanityCladding) add({ key: 'cladding', group: 'vanity', label: 'Porcelain vanity cladding', detail: 'Per unit', amount: rate('vanityCladding') })

  // 6. Material
  if (input.materialSupply === 'Artiling') {
    const cost = Math.max(0, input.materialCost)
    const markup = MATERIAL_MARKUP[mode]
    add({ key: 'material', group: 'material', label: 'Porcelain (Artiling supplied)', detail: `${gbp(cost)} supplier cost + ${Math.round(markup * 100)}% handling / waste`, amount: Math.round(cost * (1 + markup) * 100) / 100 })
  } else if (input.materialSupply === 'Client') {
    add({ key: 'material', group: 'material', label: 'Porcelain', detail: 'Client supplied', amount: 0 })
  }

  // 7–9. Services
  if (input.delivery === 'London') add({ key: 'delivery', group: 'delivery', label: 'London delivery', detail: 'Per order', amount: rate('deliveryLondon') })
  if (input.delivery === 'Large') add({ key: 'delivery', group: 'delivery', label: 'Large / two-person delivery', detail: 'Per order', amount: rate('deliveryLarge') })
  if (input.delivery === 'Manual') add({ key: 'delivery', group: 'delivery', label: 'Delivery', detail: 'Manual amount', amount: Math.max(0, input.manualDelivery) })
  if (input.installation === 'Standard') add({ key: 'installation', group: 'installation', label: 'Standard installation', detail: 'Per visit', amount: rate('installationStandard') })
  if (input.installation === 'Large') add({ key: 'installation', group: 'installation', label: 'Large / wall-mounted installation', detail: 'Per visit', amount: rate('installationLarge') })
  if (input.installation === 'Manual') add({ key: 'installation', group: 'installation', label: 'Installation', detail: 'Manual amount', amount: Math.max(0, input.manualInstallation) })
  if (input.templating === 'Physical') add({ key: 'templating', group: 'templating', label: 'Physical templating', detail: 'Per project', amount: rate('templatingPhysical') })
  if (input.manualComplexity > 0) add({ key: 'allowance', group: 'allowance', label: 'Manual complexity allowance', detail: 'Entered amount', amount: input.manualComplexity })

  // 10–12. Totals and commercial control
  const groupTotals = Object.fromEntries(PRICE_GROUPS.map((group) => [group.key, 0])) as Record<PriceGroup, number>
  for (const line of lines) groupTotals[line.group] += line.amount
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
  const commercialPrice = roundTo(subtotal, QUOTE_ROUNDING)
  // CONFIRM: rounded up so the quote never lands below the margin floor.
  const safeMinimum = input.directJobCost > 0 ? roundUpTo(input.directJobCost / (1 - TARGET_GROSS_MARGIN), QUOTE_ROUNDING) : null
  const marginFloorApplied = safeMinimum !== null && safeMinimum > commercialPrice
  const recommendedPrice = Math.max(commercialPrice, safeMinimum ?? 0)
  const deposit = Math.round(recommendedPrice * DEPOSIT_RATE)

  // Warnings
  const widthLevel = levelFromReview(widthBand(input.widthMm).review)
  if (widthLevel) warn('width', widthLevel, `Width over 1800 mm. Manual fabrication review required.`)
  const depthLevel = levelFromReview(depthBand(input.depthMm).review)
  if (depthLevel === 'review') warn('depth', 'review', `Depth ${input.depthMm} mm is above the standard range. Review recommended.`)
  if (depthLevel === 'approval') warn('depth', 'approval', `Depth over 650 mm. Artan approval required.`)
  if (input.widthMm < SPEC_RANGE.width.min || input.widthMm > SPEC_RANGE.width.max) warn('width-range', input.widthMm > SPEC_RANGE.width.max ? 'approval' : 'review', `Width is outside the ${SPEC_RANGE.width.min}–${SPEC_RANGE.width.max} mm pricing range. Estimate is indicative only.`)
  if (input.depthMm < SPEC_RANGE.depth.min) warn('depth-range', 'review', `Depth is under ${SPEC_RANGE.depth.min} mm. Estimate is indicative only.`)
  if (input.shape === 'Irregular') warn('shape', 'review', 'Irregular geometry. Manual review recommended.')
  if (input.drainType === 'Linear') warn('linear-drain', 'review', 'Exposed linear drain has no rate in the pricing framework. Confirm with Artan.')
  if (input.basinCount > LIMITS.basins.max) warn('basins', 'approval', `More than ${LIMITS.basins.max} basins. Manual review required.`)
  if (drawers % 2 === 1) warn('drawers-odd', 'review', `${drawers} drawer${drawers > 1 ? 's' : ''} priced as ${pairs} pair${pairs > 1 ? 's' : ''}. Confirm drawer pricing.`)
  if (pairs > LIMITS.pricedDrawerPairs) warn('drawers-many', 'review', `More than ${LIMITS.pricedDrawerPairs * 2} drawers is beyond the rate card. Review recommended.`)
  if (input.shelves > LIMITS.shelves.max) warn('shelves', 'review', `More than ${LIMITS.shelves.max} shelves is beyond the rate card.`)
  if (input.delivery === 'Manual') warn('delivery-manual', 'review', 'Manual delivery price. Confirm before quoting.')
  if (input.installation === 'Manual') warn('installation-manual', 'review', 'Manual installation price. Confirm before quoting.')
  if (input.manualComplexity > 0) warn('allowance', 'review', 'Manual complexity allowance entered. Review recommended.')
  for (const flag of input.reviewFlags) warn(`flag-${flag}`, 'approval', `${flag}. Artan confirmation required.`)
  if (input.materialSupply === 'TBC') warn('material-tbc', 'info', 'Porcelain supply not confirmed. Material is not included.')
  if (input.materialSupply === 'Artiling' && !(input.materialCost > 0)) warn('material-cost', 'info', 'Enter the porcelain supplier cost.')
  if (input.mounting === 'Wall Mounted' && input.installation === 'Standard') warn('wall-install', 'info', 'Wall-mounted sinks normally use large / wall-mounted installation.')
  if (safeMinimum === null) warn('direct-cost', 'info', 'Direct job cost not entered. Margin floor not checked.')
  if (marginFloorApplied) warn('margin-floor', 'info', `Raised to the margin floor (direct cost ÷ ${1 - TARGET_GROSS_MARGIN}).`)

  const confidence: Confidence = warnings.some((w) => w.level === 'approval') ? 'approval' : warnings.some((w) => w.level === 'review') ? 'review' : 'high'

  return {
    mode, lines, groupTotals, baseFabrication: base, depthAdjustment: depthAdj, subtotal, commercialPrice, safeMinimum,
    marginFloorApplied, recommendedPrice, deposit, balance: recommendedPrice - deposit, warnings, confidence,
  }
}

export const formatGbp = (value: number) => `£${Math.round(value).toLocaleString('en-GB')}`
export const formatSignedGbp = (value: number) => value < 0 ? `−${formatGbp(-value)}` : formatGbp(value)
