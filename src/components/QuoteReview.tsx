import { useState } from 'react'
import { Check, ClipboardText, Circle } from '@phosphor-icons/react'
import type { SinkDesign } from '../types/sink'
import type { SinkGeometry } from '../lib/sinkGeometry'
import type { ValidationErrors } from '../lib/validation'
import { PRICE_GROUPS, formatGbp, formatSignedGbp, type PriceResult, type PriceWarning } from '../pricing/engine'
import { TARGET_GROSS_MARGIN } from '../pricing/rates'
import { clientSummaryText, exclusions, specification } from '../lib/summary'
import { isQuoteReady, quoteReadiness } from '../lib/review'
import { ConfidenceBadge, WarningList } from './PricePanel'

type Props = { design: SinkDesign; geometry: SinkGeometry; price: PriceResult; warnings: PriceWarning[]; errors: ValidationErrors; onNotify: (message: string) => void }

export function QuoteReview({ design: d, geometry: g, price, warnings, errors, onNotify }: Props) {
  const [copied, setCopied] = useState(false)
  const readiness = quoteReadiness(d, price, errors)
  const ready = isQuoteReady(readiness)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clientSummaryText(d, g, price))
      setCopied(true); window.setTimeout(() => setCopied(false), 2000)
      onNotify('Client summary copied')
    } catch { onNotify('Copy failed. Select the text manually.') }
  }
  return <article className="quote-review" aria-label="Quote review">
    <header className="quote-head">
      <div>
        <span className="quote-kicker">{d.reference || 'Unsaved design'} · {d.pricingMode} pricing</span>
        <h2>{d.clientName || 'Client not entered'}{d.projectName ? <small> / {d.projectName}</small> : null}</h2>
        <p>{d.overallWidth} × {d.overallDepth} × {d.overallHeight} mm · {d.basinCount > 1 ? `${d.basinCount} basins` : 'single basin'} · {d.mountingType === 'Wall Mounted' ? 'wall-mounted' : d.mountingType.toLowerCase()}</p>
      </div>
      <div className="quote-head-total">
        <span>Recommended quote</span>
        <strong>{formatGbp(price.recommendedPrice)}</strong>
        <ConfidenceBadge confidence={price.confidence} />
      </div>
    </header>

    <div className="quote-grid">
      <section className="quote-card quote-breakdown">
        <h3>Price breakdown</h3>
        <table>
          <tbody>
            {PRICE_GROUPS.map((group) => {
              const lines = price.lines.filter((line) => line.group === group.key)
              if (!lines.length) return null
              return lines.map((line, index) => <tr key={`${group.key}-${line.key}`} className={index === 0 ? 'group-start' : ''}>
                <th scope="row">{index === 0 && <span className="group-label">{group.label}</span>}{line.label}<small>{line.detail}</small></th>
                <td>{line.amount === 0 && line.group === 'material' ? '—' : formatSignedGbp(line.amount)}</td>
              </tr>)
            })}
          </tbody>
          <tfoot>
            <tr><th scope="row">Subtotal</th><td>{formatGbp(price.subtotal)}</td></tr>
            <tr><th scope="row">Rounded to £25</th><td>{formatGbp(price.commercialPrice)}</td></tr>
            {price.safeMinimum !== null && <tr className={price.marginFloorApplied ? 'is-applied' : 'is-muted'}><th scope="row">Margin floor <small>Direct cost {formatGbp(d.directJobCost)} ÷ {1 - TARGET_GROSS_MARGIN} · internal</small></th><td>{formatGbp(price.safeMinimum)}</td></tr>}
            <tr className="total-row"><th scope="row">Recommended quote</th><td>{formatGbp(price.recommendedPrice)}</td></tr>
            <tr className="is-muted"><th scope="row">50% deposit / balance</th><td>{formatGbp(price.deposit)} / {formatGbp(price.balance)}</td></tr>
          </tfoot>
        </table>
        <p className="quote-footnote">Artiling Studio is not VAT registered. No VAT added.</p>
      </section>

      <div className="quote-side">
        <section className="quote-card">
          <h3>Quote readiness</h3>
          <p className={`readiness-state ${ready ? 'is-ready' : ''}`}>{ready ? 'Ready to quote' : 'Not ready to send'}</p>
          <ul className="readiness-list">
            {readiness.map((item) => <li key={item.label} className={item.done ? 'is-done' : item.required ? 'is-open' : 'is-optional'}>
              {item.done ? <Check weight="bold" aria-hidden="true" /> : <Circle aria-hidden="true" />}
              <span>{item.label}{!item.required && !item.done ? ' (recommended)' : ''}</span>
            </li>)}
          </ul>
        </section>
        <section className="quote-card">
          <h3>Warnings</h3>
          {warnings.length ? <WarningList warnings={warnings} /> : <p className="quote-empty">None.</p>}
        </section>
      </div>

      <section className="quote-card">
        <h3>Specification</h3>
        <dl className="spec-list">{specification(d, g).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>

      <section className="quote-card">
        <h3>Not included</h3>
        <ul className="plain-list">{exclusions(d).map((item) => <li key={item}>{item}</li>)}</ul>
        <button type="button" className="copy-button" onClick={copy}>{copied ? <Check aria-hidden="true" /> : <ClipboardText aria-hidden="true" />}{copied ? 'Copied' : 'Copy client summary'}</button>
        <p className="quote-footnote">Copies specification, itemised price and exclusions. Direct cost, margin and pricing mode are not included.</p>
      </section>
    </div>
  </article>
}
