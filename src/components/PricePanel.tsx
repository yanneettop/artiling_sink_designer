import { CheckCircle, WarningCircle, Info, ArrowRight } from '@phosphor-icons/react'
import type { SinkDesign } from '../types/sink'
import { CONFIDENCE_LABEL, PRICE_GROUPS, formatGbp, formatSignedGbp, type Confidence, type PriceResult, type PriceWarning, type WarningLevel } from '../pricing/engine'

export const LEVEL_LABEL: Record<WarningLevel, string> = { info: 'Note', review: 'Review recommended', approval: 'Approval required' }

export function ConfidenceBadge({ confidence, compact = false }: { confidence: Confidence; compact?: boolean }) {
  const Icon = confidence === 'high' ? CheckCircle : WarningCircle
  return <span className={`confidence-badge confidence-${confidence} ${compact ? 'compact' : ''}`}><Icon weight="fill" aria-hidden="true" />{CONFIDENCE_LABEL[confidence]}</span>
}

export function WarningList({ warnings, showInfo = true }: { warnings: PriceWarning[]; showInfo?: boolean }) {
  const order: WarningLevel[] = ['approval', 'review', 'info']
  const sorted = [...warnings].filter((w) => showInfo || w.level !== 'info').sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
  if (!sorted.length) return null
  return <ul className="warning-list">
    {sorted.map((w) => <li key={w.key} className={`level-${w.level}`}>
      {w.level === 'info' ? <Info aria-hidden="true" /> : <WarningCircle weight="fill" aria-hidden="true" />}
      <span><b className="visually-hidden">{LEVEL_LABEL[w.level]}: </b>{w.message}</span>
    </li>)}
  </ul>
}

function materialValue(d: SinkDesign, price: PriceResult) {
  if (d.materialSupply === 'TBC') return <em>Not confirmed</em>
  if (d.materialSupply === 'Client') return <em>Client supplied</em>
  return formatGbp(price.groupTotals.material)
}

const CORE_GROUPS = new Set(['fabrication', 'options', 'vanity', 'material', 'delivery', 'installation'])

export function PricePanel({ design: d, price, warnings, onOpenReview }: { design: SinkDesign; price: PriceResult; warnings: PriceWarning[]; onOpenReview: () => void }) {
  const flagged = warnings.filter((w) => w.level !== 'info')
  const notes = warnings.filter((w) => w.level === 'info')
  return <aside className="price-panel" aria-label="Estimated price">
    <div className="price-head">
      <span>Estimated price</span>
      <em className={`mode-chip mode-${d.pricingMode.toLowerCase()}`}>{d.pricingMode}</em>
    </div>
    <div className="price-scroll">
      <div className="price-total" aria-live="polite">
        <strong>{formatGbp(price.recommendedPrice)}</strong>
        <small>No VAT · {price.marginFloorApplied ? 'raised to margin floor' : 'rounded to £25'}</small>
      </div>
      <ConfidenceBadge confidence={price.confidence} />
      <dl className="price-groups">
        {PRICE_GROUPS.filter((group) => CORE_GROUPS.has(group.key) || price.groupTotals[group.key] !== 0).map((group) => <div key={group.key} className={price.groupTotals[group.key] === 0 && group.key !== 'material' ? 'is-zero' : ''}>
          <dt>{group.label}</dt>
          <dd>{group.key === 'material' ? materialValue(d, price) : group.key === 'fabrication' && price.depthAdjustment ? <>{formatGbp(price.groupTotals.fabrication)}<small>{formatGbp(price.baseFabrication)} {formatSignedGbp(price.depthAdjustment).replace(/^£/, '+£')} depth</small></> : formatGbp(price.groupTotals[group.key])}</dd>
        </div>)}
      </dl>
      {flagged.length > 0 && <section className="price-section"><h3>Review</h3><WarningList warnings={flagged} /></section>}
      {notes.length > 0 && <details className="price-notes"><summary>{notes.length} note{notes.length > 1 ? 's' : ''}</summary><WarningList warnings={notes} /></details>}
      <button type="button" className="review-link" onClick={onOpenReview}>Full breakdown & quote <ArrowRight aria-hidden="true" /></button>
    </div>
  </aside>
}

/** Compact bar used below 1280 px. */
export function PriceBar({ price, onOpenReview }: { price: PriceResult; onOpenReview: () => void }) {
  return <button type="button" className="price-bar" onClick={onOpenReview} aria-label={`Estimated price ${formatGbp(price.recommendedPrice)}, ${CONFIDENCE_LABEL[price.confidence]}. Open breakdown`}>
    <span className="price-bar-label">Estimate</span>
    <strong>{formatGbp(price.recommendedPrice)}</strong>
    <ConfidenceBadge confidence={price.confidence} compact />
  </button>
}
