import { describe, expect, it } from 'vitest'
import { createDefaultDesign, type SinkDesign } from '../types/sink'
import { applyOpeningRules, calculateGeometry, DEFAULT_DRAIN_CHANNEL_DEPTH_MM, DEFAULT_FRONT_BASIN_DEPTH_MM, DEFAULT_REAR_DRAIN_LEVEL_MM, describeFall } from './sinkGeometry'
import { validateGeometry } from './validation'
import { migrateDesign, nextReference } from './storage'
import { clientSummaryText } from './summary'
import { priceDesign } from '../pricing/fromDesign'

const design = (patch: Partial<SinkDesign> = {}) => ({ ...createDefaultDesign(), ...patch })
const errorsFor = (patch: Partial<SinkDesign>) => validateGeometry(calculateGeometry(design(patch)))

describe('geometry', () => {
  it('splits the opening into equal basins with porcelain dividers', () => {
    const g = calculateGeometry(design({ overallWidth: 1500, basinCount: 2 }))
    expect(g.basins).toHaveLength(2)
    expect(g.dividerWidth).toBe(24)
    expect(g.basins[0].width).toBeCloseTo((1400 - 24) / 2)
    expect(g.drains).toHaveLength(2)
  })

  it('places tap holes per basin', () => {
    const g = calculateGeometry(design({ overallWidth: 1500, basinCount: 2, tapHoleCount: 2 }))
    expect(g.tapHoles).toHaveLength(4)
  })

  it('always places a concealed drain at the rear', () => {
    const g = calculateGeometry(design({ drainType: 'Concealed Linear', drainPosition: 'Centre' }))
    expect(g.drainY).toBe(g.edgeBack + 20)
  })
})

describe('validation', () => {
  it('accepts the default template', () => expect(errorsFor({})).toEqual({}))

  it('rejects tap holes that spill off the rear deck', () => {
    expect(errorsFor({ tapHoleCount: 4, tapHoleDiameter: 60 }).tapPosition).toBeDefined()
    expect(errorsFor({ tapHoleDiameter: 90 }).tapPosition).toBeDefined()
  })

  it('flags a drain that no longer fits each basin', () => {
    expect(errorsFor({ overallWidth: 1500, basinCount: 2, drainLength: 700 }).drainLength).toBeDefined()
  })

  it('gives a sensible message when the height is too low', () => {
    expect(errorsFor({ overallHeight: 30 }).overallHeight).toMatch(/at least 59 mm/)
  })

  it('requires an upstand height and drawers no deeper than the sink', () => {
    expect(errorsFor({ upstandEnabled: true, backUpstandHeight: 0 }).backUpstandHeight).toBeDefined()
    expect(errorsFor({ drawersEnabled: true, overallDepth: 300, drawerDepth: 430 }).drawerDepth).toBeDefined()
  })

  it('keeps both rim messages instead of overwriting them', () => {
    const errors = errorsFor({ leftRimWidth: 5, rightRimWidth: 900 })
    expect(errors.leftRimWidth).toBeDefined()
    expect(errors.rimWidthTotal).toBeDefined()
  })
})

describe('storage', () => {
  it('migrates legacy designs with pricing defaults', () => {
    const legacy = { id: 'legacy', reference: 'AS-SINK-004', overallWidth: 900, overallDepth: 450, overallHeight: 250, porcelainThickness: 12, baseFall: 20, tapType: 'Deck Mounted', upstandEnabled: false, backUpstandHeight: 0 } as Partial<SinkDesign>
    const d = migrateDesign(legacy)
    expect(d.id).toBe('legacy')
    expect(d.materialSupply).toBe('TBC')
    expect(d.pricingMode).toBe('Portfolio')
    expect(d.basinCount).toBe(1)
    expect(d.reviewFlags).toEqual([])
    expect(d.backUpstandHeight).toBeGreaterThan(0)
    expect(priceDesign(d).groupTotals.fabrication).toBe(1150)
  })

  it('issues the next free reference', () => {
    expect(nextReference([])).toBe('AS-SINK-001')
    expect(nextReference([design({ reference: 'AS-SINK-009' }), design({ reference: 'CUSTOM' })])).toBe('AS-SINK-010')
  })
})

describe('client summary', () => {
  it('omits internal controls', () => {
    const d = design({ clientName: 'Test', directJobCost: 400, pricingMode: 'Portfolio' })
    const text = clientSummaryText(d, calculateGeometry(d), priceDesign(d))
    expect(text).toContain('Estimated total: £1,400')
    expect(text).not.toMatch(/portfolio|direct|margin/i)
    expect(text).toContain('not VAT registered')
  })
})

describe('manual basin opening', () => {
  const manual = () => applyOpeningRules(design(), { basinOpeningManual: true })

  it('captures the current opening when switched on', () => {
    const d = manual()
    expect(d.basinOpeningWidth).toBe(700)
    expect(d.basinOpeningDepth).toBe(320)
  })

  it('centres a new opening width and keeps the rear tap deck', () => {
    const d = applyOpeningRules(manual(), { basinOpeningWidth: 600, basinOpeningDepth: 300 })
    expect([d.leftRimWidth, d.rightRimWidth]).toEqual([100, 100])
    expect(d.rearRimWidth).toBe(80)
    expect(d.frontRimWidth).toBe(70)
    const g = calculateGeometry(d)
    expect([g.basinWidth, g.basinDepth]).toEqual([600, 300])
  })

  it('borrows from the rear rim when the front would be thinner than the porcelain', () => {
    const d = applyOpeningRules(manual(), { basinOpeningDepth: 400 })
    expect(d.frontRimWidth).toBe(12)
    expect(d.rearRimWidth).toBe(38)
  })

  it('keeps the opening when the overall size changes', () => {
    const d = applyOpeningRules(manual(), { overallWidth: 1000 })
    expect(calculateGeometry(d).basinWidth).toBe(700)
    expect([d.leftRimWidth, d.rightRimWidth]).toEqual([150, 150])
  })

  it('updates the stored opening when a rim is edited', () => {
    const d = applyOpeningRules(manual(), { leftRimWidth: 100 })
    expect(d.basinOpeningWidth).toBe(650)
  })

  it('flags an opening that leaves no porcelain at the sides', () => {
    expect(errorsFor({ basinOpeningManual: true, basinOpeningWidth: 790 }).basinOpeningWidth).toBeTruthy()
  })

  it('leaves rims alone when the opening is not manual', () => {
    const d = applyOpeningRules(design(), { overallWidth: 1000 })
    expect(d.leftRimWidth).toBe(50)
  })
})

describe('fall to a centre round drain', () => {
  const round = (patch: Partial<SinkDesign> = {}) => calculateGeometry(design({ drainType: 'Circular', drainPosition: 'Centre', shallowBowlDepth: 120, baseFall: 15, ...patch }))

  it('keeps every wall at the shallow depth and the drain lowest', () => {
    const g = round()
    expect(g.fallToDrain).toBe(true)
    expect([g.bowlDepthRear, g.bowlDepthFront, g.bowlDepthDrain]).toEqual([120, 120, 135])
  })

  it('ignores the front-to-back fall settings', () => {
    expect(round({ fallControl: 'Corner Depths', rearBowlDepth: 200, frontBowlDepth: 100 }).bowlDepthDrain).toBe(135)
  })

  it('keeps the front-to-back fall for a rear round drain', () => {
    const g = round({ drainPosition: 'Rear' })
    expect(g.fallToDrain).toBe(false)
    expect(g.bowlDepthRear).toBe(135)
  })

  it('flags a drain deeper than the porcelain allows', () => {
    expect(errorsFor({ drainType: 'Circular', drainPosition: 'Centre', shallowBowlDepth: 200, baseFall: 40 }).baseFall).toBeTruthy()
  })

  it('describes the fall in the client specification', () => {
    const d = design({ drainType: 'Circular', drainPosition: 'Centre' })
    expect(clientSummaryText(d, calculateGeometry(d), priceDesign(d))).toContain('fall from all sides to the drain')
  })
})

describe('standard Artiling basin levels', () => {
  // 1545 × 500 × 150 with the default 50 mm front and 80 mm rear rims and a 40 mm drain cover.
  const standard = () => calculateGeometry(design({ overallWidth: 1545, overallDepth: 500, overallHeight: 150 }))

  it('starts 35 mm below the top at the front and ends 120 mm below at the rear drain', () => {
    const g = standard()
    expect(g.bowlDepthFront).toBe(DEFAULT_FRONT_BASIN_DEPTH_MM)
    expect(g.bowlDepthRear).toBe(DEFAULT_REAR_DRAIN_LEVEL_MM)
    expect(describeFall(g)).toEqual({ fall: 85, to: 'rear' })
  })

  it('derives the slope angle from the run in front of the drain cover', () => {
    const g = standard()
    expect(g.slopeRun).toBe(370 - 40)
    expect(g.slopeAngle).toBeCloseTo(Math.atan(85 / 330) * 180 / Math.PI)
    // A deeper sink keeps the two levels and flattens the slope.
    const deep = calculateGeometry(design({ overallWidth: 1545, overallDepth: 600, overallHeight: 150 }))
    expect([deep.bowlDepthFront, deep.bowlDepthRear]).toEqual([35, 120])
    expect(deep.slopeAngle).toBeLessThan(g.slopeAngle)
  })

  it('leaves an open channel below the cover within the overall height', () => {
    const g = standard()
    expect(g.concealedDrain).toBe(true)
    expect(g.drainChannelBottom).toBe(150 - 12)
    expect(g.drainChannelDepth).toBe(150 - 12 - (120 + 12))
    const tall = calculateGeometry(design({ overallHeight: 250 }))
    expect(tall.drainChannelBottom).toBe(120 + DEFAULT_DRAIN_CHANNEL_DEPTH_MM)
    expect(validateGeometry(standard())).toEqual({})
  })

  it('flags a height with no room for the drain channel', () => {
    expect(errorsFor({ overallHeight: 144 }).overallHeight ?? errorsFor({ overallHeight: 144 }).baseFall).toBeTruthy()
  })

  it('keeps the levels of previously saved designs', () => {
    const old = migrateDesign({ id: 'old', reference: 'AS-SINK-009', shallowBowlDepth: 78, baseFall: 12, rearBowlDepth: 90, frontBowlDepth: 78 })
    const g = calculateGeometry(old)
    expect([g.bowlDepthFront, g.bowlDepthRear]).toEqual([78, 90])
  })
})
