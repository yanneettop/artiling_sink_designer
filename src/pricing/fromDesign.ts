import type { SinkDesign } from '../types/sink'
import { calculatePrice, type PriceResult, type PricingInput } from './engine'

export function pricingInputFromDesign(d: SinkDesign): PricingInput {
  return {
    mode: d.pricingMode,
    widthMm: d.overallWidth,
    depthMm: d.overallDepth,
    basinCount: d.basinCount,
    // CONFIRM: holes are entered per basin; every hole after the first on the sink is charged.
    tapHoles: d.tapType === 'Deck Mounted' ? d.tapHoleCount * d.basinCount : 0,
    drainType: d.drainType,
    specialistConcealedDrain: d.drainType === 'Concealed Linear' && d.concealedDetail === 'Specialist',
    overflow: d.overflow,
    mounting: d.mountingType,
    shape: d.shapeType,
    upstand: d.upstandEnabled,
    shelves: d.shelfCount,
    drawers: d.drawersEnabled ? d.drawerCount : 0,
    vanityCladding: d.vanityCladding,
    materialSupply: d.materialSupply,
    materialCost: d.materialCost,
    delivery: d.deliveryType,
    manualDelivery: d.manualDelivery,
    installation: d.installationType,
    manualInstallation: d.manualInstallation,
    templating: d.templating,
    manualComplexity: d.manualComplexity,
    directJobCost: d.directJobCost,
    reviewFlags: d.reviewFlags,
  }
}

export const priceDesign = (d: SinkDesign): PriceResult => calculatePrice(pricingInputFromDesign(d))
