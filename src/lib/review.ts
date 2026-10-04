import type { SinkDesign } from '../types/sink'
import type { PriceResult, PriceWarning } from '../pricing/engine'
import type { ValidationErrors } from './validation'

/** Design notes that do not affect price but should be seen before quoting. */
export function designAdvisories(d: SinkDesign): PriceWarning[] {
  const notes: PriceWarning[] = []
  if (d.baseType === 'Sloped Front to Back' && !(d.drainType === 'Circular' && d.drainPosition === 'Centre') && ((d.fallControl === 'Fall and Low Point' && d.fallLowPoint === 'Front Internal Corner') || (d.fallControl === 'Corner Depths' && d.frontBowlDepth > d.rearBowlDepth))) {
    notes.push({ key: 'fall-front', level: 'review', message: 'Fall runs to the front. Artiling standard is lowest at the rear.' })
  }
  if (d.baseType === 'Flat') notes.push({ key: 'flat-base', level: 'info', message: 'Flat base selected. Standard Artiling detail is a front-to-back fall.' })
  if (d.drawersEnabled && !d.drawerAutoWidth && d.drawerWidth > d.overallWidth) notes.push({ key: 'drawer-wide', level: 'info', message: 'Vanity is wider than the sink.' })
  if (d.shapeType === 'Irregular') notes.push({ key: 'shape-preview', level: 'info', message: 'Drawings show a rectangular outline. Irregular shape is confirmed by template.' })
  return notes
}

export interface ReadinessItem {
  label: string
  done: boolean
  required: boolean
}

export function quoteReadiness(d: SinkDesign, price: PriceResult, errors: ValidationErrors): ReadinessItem[] {
  const errorCount = Object.keys(errors).length
  return [
    { label: errorCount ? `Resolve ${errorCount} geometry check${errorCount > 1 ? 's' : ''}` : 'Geometry checks clear', done: !errorCount, required: true },
    { label: d.materialSupply !== 'TBC' ? 'Porcelain supply confirmed' : 'Confirm who supplies the porcelain', done: d.materialSupply !== 'TBC', required: true },
    ...(d.materialSupply === 'Artiling' ? [{ label: d.materialCost > 0 ? 'Porcelain supplier cost entered' : 'Enter porcelain supplier cost', done: d.materialCost > 0, required: true }] : []),
    { label: d.clientName.trim() ? 'Client name entered' : 'Enter client name', done: Boolean(d.clientName.trim()), required: true },
    { label: price.confidence === 'approval' ? 'Get Artan confirmation' : 'No Artan approval items', done: price.confidence !== 'approval', required: true },
    { label: price.safeMinimum !== null ? 'Checked against margin floor' : 'Enter direct job cost to check margin', done: price.safeMinimum !== null, required: false },
  ]
}

export const isQuoteReady = (items: ReadinessItem[]) => items.every((item) => item.done || !item.required)
