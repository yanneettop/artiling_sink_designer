import { describe, expect, it } from 'vitest'
import { baseFabrication, calculatePrice, depthAdjustment, type PricingInput } from './engine'
import { pricingInputFromDesign } from './fromDesign'
import { createDefaultDesign } from '../types/sink'

const bare = (overrides: Partial<PricingInput> = {}): PricingInput => ({
  mode: 'Portfolio', widthMm: 1000, depthMm: 500, basinCount: 1, tapHoles: 1,
  drainType: 'Concealed Linear', specialistConcealedDrain: false, overflow: false,
  mounting: 'Supported', shape: 'Rectangular', upstand: false, shelves: 0, drawers: 0, vanityCladding: false,
  materialSupply: 'Client', materialCost: 0, delivery: 'None', manualDelivery: 0,
  installation: 'None', manualInstallation: 0, templating: 'None', manualComplexity: 0, directJobCost: 0, reviewFlags: [],
  ...overrides,
})

const levels = (input: Partial<PricingInput>) => calculatePrice(bare(input)).warnings.filter((w) => w.level !== 'info').map((w) => w.key)

describe('Portfolio base fabrication', () => {
  it.each([
    [600, 850], [450, 850], [601, 850], [800, 1050], [1000, 1250], [1150, 1400], [1200, 1450],
    [1201, 1600], [1500, 1900], [1501, 1950], [1800, 2250], [1801, 2300], [2000, 2500],
  ])('%i mm → £%i', (width, expected) => {
    expect(baseFabrication(width, 'Portfolio')).toBe(expected)
  })

  it('rounds non-round widths to the nearest £25', () => {
    expect(baseFabrication(1030, 'Portfolio')).toBe(1275)
    expect(baseFabrication(1040, 'Portfolio')).toBe(1300)
  })

  it('returns 0 for impossible widths', () => {
    expect(baseFabrication(0, 'Portfolio')).toBe(0)
    expect(baseFabrication(Number.NaN, 'Portfolio')).toBe(0)
  })
})

describe('Standard base fabrication', () => {
  it.each([[600, 950], [1000, 1400], [1500, 2100], [1800, 2500], [2000, 2800]])('%i mm → £%i', (width, expected) => {
    expect(baseFabrication(width, 'Standard')).toBe(expected)
  })
})

describe('Depth adjustment', () => {
  it.each([
    [280, -200], [300, -200], [301, -100], [350, -100], [400, -100], [401, 0], [500, 0], [550, 0],
    [551, 225], [600, 225], [650, 225], [651, 350], [700, 350],
  ])('Portfolio %i mm → %i', (depth, expected) => {
    expect(depthAdjustment(depth, 'Portfolio')).toBe(expected)
  })

  it.each([[280, -225], [350, -125], [500, 0], [600, 250], [700, 400]])('Standard %i mm → %i', (depth, expected) => {
    expect(depthAdjustment(depth, 'Standard')).toBe(expected)
  })
})

describe('Brief scenarios', () => {
  it('600 × 500 fabrication = £850, high confidence', () => {
    const r = calculatePrice(bare({ widthMm: 600 }))
    expect(r.groupTotals.fabrication).toBe(850)
    expect(r.confidence).toBe('high')
  })

  it('1000 × 500 = £1,250', () => expect(calculatePrice(bare()).groupTotals.fabrication).toBe(1250))
  it('1500 × 500 = £1,900', () => expect(calculatePrice(bare({ widthMm: 1500 })).groupTotals.fabrication).toBe(1900))

  it('1800 × 500 = £2,250 with no review warning', () => {
    const r = calculatePrice(bare({ widthMm: 1800 }))
    expect(r.groupTotals.fabrication).toBe(2250)
    expect(r.confidence).toBe('high')
  })

  it('2000 × 500 = £2,500 and manual review required', () => {
    const r = calculatePrice(bare({ widthMm: 2000 }))
    expect(r.groupTotals.fabrication).toBe(2500)
    expect(r.confidence).toBe('approval')
    expect(r.warnings.find((w) => w.key === 'width')?.level).toBe('approval')
  })

  it('1000 × 280: base £1,250, depth −£200', () => {
    const r = calculatePrice(bare({ depthMm: 280 }))
    expect(r.baseFabrication).toBe(1250)
    expect(r.depthAdjustment).toBe(-200)
    expect(r.groupTotals.fabrication).toBe(1050)
  })

  it('1150 × 280 = £1,200 under the current framework', () => {
    expect(calculatePrice(bare({ widthMm: 1150, depthMm: 280 })).groupTotals.fabrication).toBe(1200)
  })

  it('1000 × 350: depth −£100', () => expect(calculatePrice(bare({ depthMm: 350 })).depthAdjustment).toBe(-100))
  it('1000 × 500: no depth adjustment line', () => expect(calculatePrice(bare()).lines.some((l) => l.key === 'depth')).toBe(false))

  it('1000 × 600: +£225, review recommended', () => {
    const r = calculatePrice(bare({ depthMm: 600 }))
    expect(r.depthAdjustment).toBe(225)
    expect(r.confidence).toBe('review')
  })

  it('1000 × 650: +£225, review recommended', () => {
    const r = calculatePrice(bare({ depthMm: 650 }))
    expect(r.depthAdjustment).toBe(225)
    expect(r.confidence).toBe('review')
  })

  it('1000 × 700: +£350, Artan approval required', () => {
    const r = calculatePrice(bare({ depthMm: 700 }))
    expect(r.depthAdjustment).toBe(350)
    expect(r.warnings.find((w) => w.key === 'depth')?.level).toBe('approval')
    expect(r.confidence).toBe('approval')
  })
})

describe('Add-ons', () => {
  it('prices each fabrication add-on at the Portfolio rate', () => {
    const r = calculatePrice(bare({ specialistConcealedDrain: true, basinCount: 2, tapHoles: 3, overflow: true, mounting: 'Wall Mounted', shape: 'Irregular' }))
    const amount = (key: string) => r.lines.find((l) => l.key === key)?.amount
    expect(amount('drain')).toBe(175)
    expect(amount('basins')).toBe(400)
    expect(amount('taps')).toBe(80)
    expect(amount('overflow')).toBe(75)
    expect(amount('wall')).toBe(150)
    expect(amount('shape')).toBe(200)
    expect(r.groupTotals.options).toBe(1080)
  })

  it('does not charge a standard concealed drain or the first basin / tap hole', () => {
    const r = calculatePrice(bare({ drainType: 'Concealed Linear', specialistConcealedDrain: false, basinCount: 1, tapHoles: 1 }))
    expect(r.groupTotals.options).toBe(0)
  })

  it('ignores the specialist flag when the drain is not concealed', () => {
    expect(calculatePrice(bare({ drainType: 'Circular', specialistConcealedDrain: true })).groupTotals.options).toBe(0)
  })

  it('prices vanity and extras', () => {
    const r = calculatePrice(bare({ upstand: true, shelves: 2, drawers: 2, vanityCladding: true }))
    expect(r.groupTotals.vanity).toBe(150 + 600 + 850 + 550)
  })

  it('prices odd drawer counts as whole pairs and flags them', () => {
    const r = calculatePrice(bare({ drawers: 3 }))
    expect(r.groupTotals.vanity).toBe(1700)
    expect(r.warnings.some((w) => w.key === 'drawers-odd')).toBe(true)
  })

  it('prices services', () => {
    const r = calculatePrice(bare({ delivery: 'Large', installation: 'Large', templating: 'Physical' }))
    expect(r.groupTotals.delivery).toBe(200)
    expect(r.groupTotals.installation).toBe(350)
    expect(r.groupTotals.templating).toBe(150)
  })

  it('uses manual service amounts and flags them for review', () => {
    const r = calculatePrice(bare({ delivery: 'Manual', manualDelivery: 250, installation: 'Manual', manualInstallation: 400 }))
    expect(r.groupTotals.delivery).toBe(250)
    expect(r.groupTotals.installation).toBe(400)
    expect(r.confidence).toBe('review')
  })

  it('prices Standard mode add-ons from the Standard column', () => {
    const r = calculatePrice(bare({ mode: 'Standard', specialistConcealedDrain: true, tapHoles: 2, overflow: true, delivery: 'London', installation: 'Standard' }))
    expect(r.groupTotals.fabrication).toBe(1400)
    expect(r.groupTotals.options).toBe(200 + 50 + 100)
    expect(r.groupTotals.delivery).toBe(150)
    expect(r.groupTotals.installation).toBe(300)
  })
})

describe('Material', () => {
  it('adds 18% in Portfolio and 20% in Standard', () => {
    expect(calculatePrice(bare({ materialSupply: 'Artiling', materialCost: 150 })).groupTotals.material).toBe(177)
    expect(calculatePrice(bare({ mode: 'Standard', materialSupply: 'Artiling', materialCost: 150 })).groupTotals.material).toBe(180)
  })

  it('charges nothing for client-supplied porcelain', () => {
    expect(calculatePrice(bare({ materialSupply: 'Client', materialCost: 500 })).groupTotals.material).toBe(0)
  })

  it('excludes material and flags it when supply is not confirmed', () => {
    const r = calculatePrice(bare({ materialSupply: 'TBC', materialCost: 500 }))
    expect(r.groupTotals.material).toBe(0)
    expect(r.warnings.some((w) => w.key === 'material-tbc')).toBe(true)
  })
})

describe('Totals and commercial control', () => {
  it('reproduces the framework example: 1000 × 500, £150 porcelain, London delivery, standard install', () => {
    const input = { materialSupply: 'Artiling' as const, materialCost: 150, delivery: 'London' as const, installation: 'Standard' as const }
    const portfolio = calculatePrice(bare(input))
    expect(portfolio.subtotal).toBe(1777)
    expect(portfolio.recommendedPrice).toBe(1775)
    const standard = calculatePrice(bare({ ...input, mode: 'Standard' }))
    expect(standard.subtotal).toBe(2030)
    expect(standard.recommendedPrice).toBe(2025)
  })

  it('combines many add-ons without double charging', () => {
    const r = calculatePrice(bare({
      widthMm: 1500, depthMm: 500, basinCount: 2, tapHoles: 2, specialistConcealedDrain: true, mounting: 'Wall Mounted',
      upstand: true, drawers: 2, vanityCladding: true, materialSupply: 'Artiling', materialCost: 400,
      delivery: 'Large', installation: 'Large', templating: 'Physical',
    }))
    // 1900 + 175 + 400 + 40 + 150 + 150 + 850 + 550 + 472 + 200 + 350 + 150
    expect(r.subtotal).toBe(5387)
    expect(r.recommendedPrice).toBe(5375)
    expect(r.lines.filter((l) => l.key === 'wall')).toHaveLength(1)
  })

  it('never falls below direct job cost / 0.65, rounded up', () => {
    const r = calculatePrice(bare({ directJobCost: 1000 }))
    expect(r.safeMinimum).toBe(1550)
    expect(r.marginFloorApplied).toBe(true)
    expect(r.recommendedPrice).toBe(1550)
    expect(r.recommendedPrice).toBeGreaterThanOrEqual(1000 / 0.65)
  })

  it('keeps the commercial price when it is above the floor', () => {
    const r = calculatePrice(bare({ directJobCost: 500 }))
    expect(r.marginFloorApplied).toBe(false)
    expect(r.recommendedPrice).toBe(1250)
  })

  it('calculates a 50% deposit', () => {
    const r = calculatePrice(bare())
    expect(r.deposit).toBe(625)
    expect(r.balance).toBe(625)
  })

  it('never produces a negative total for tiny shallow sinks', () => {
    const r = calculatePrice(bare({ widthMm: 300, depthMm: 150 }))
    expect(r.recommendedPrice).toBeGreaterThan(0)
    expect(r.groupTotals.fabrication).toBe(650)
  })

  it('does not add VAT', () => {
    expect(calculatePrice(bare()).lines.some((l) => /vat/i.test(l.label))).toBe(false)
  })
})

describe('Review status', () => {
  it('flags irregular geometry, manual allowance and review flags', () => {
    expect(levels({ shape: 'Irregular' })).toContain('shape')
    expect(levels({ manualComplexity: 100 })).toContain('allowance')
    expect(calculatePrice(bare({ reviewFlags: ['Specialist reinforcement'] })).confidence).toBe('approval')
  })
})

describe('Design mapping', () => {
  it('counts tap holes per basin and ignores holes for wall-mounted taps', () => {
    const d = { ...createDefaultDesign(), basinCount: 2, tapHoleCount: 1 }
    expect(pricingInputFromDesign(d).tapHoles).toBe(2)
    expect(pricingInputFromDesign({ ...d, tapType: 'Wall Mounted' }).tapHoles).toBe(0)
  })

  it('only charges drawers when the vanity is enabled', () => {
    const d = { ...createDefaultDesign(), drawersEnabled: false, drawerCount: 4 }
    expect(pricingInputFromDesign(d).drawers).toBe(0)
  })

  it('prices the default template without surcharges', () => {
    const r = calculatePrice(pricingInputFromDesign(createDefaultDesign()))
    expect(r.groupTotals.fabrication).toBe(1050)
    expect(r.groupTotals.options).toBe(0)
  })
})
