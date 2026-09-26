import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { CaretDown, CaretUp } from '@phosphor-icons/react'

type NumberFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
  suffix?: string
  prefix?: string
  min?: number
  max?: number
  step?: number
  /** Allow decimals (currency). */
  decimal?: boolean
  error?: string
  hint?: string
  hintLevel?: 'info' | 'review' | 'approval'
  disabled?: boolean
}

const clamp = (value: number, min = -Infinity, max = Infinity) => Math.min(max, Math.max(min, value))

/**
 * Numeric input that keeps a local draft so it can be cleared and retyped.
 * Only digits (and one decimal point when `decimal`) are accepted. The value is
 * committed while typing when it is within range, and clamped on blur.
 */
export function NumberField({ label, value, onChange, suffix, prefix, min, max, step = 1, decimal = false, error, hint, hintLevel = 'info', disabled }: NumberFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setDraft(String(value)) }, [value, focused])
  const pattern = decimal ? /^\d*\.?\d{0,2}$/ : /^\d*$/
  const commit = (next: number) => { const v = clamp(next, min, max); onChange(v); setDraft(String(v)) }
  const change = (text: string) => {
    if (!pattern.test(text)) return
    setDraft(text)
    const parsed = Number(text)
    if (text !== '' && text !== '.' && Number.isFinite(parsed) && parsed >= (min ?? -Infinity) && parsed <= (max ?? Infinity)) onChange(parsed)
  }
  const blur = () => {
    setFocused(false)
    const parsed = Number(draft)
    if (draft === '' || draft === '.' || !Number.isFinite(parsed)) setDraft(String(value))
    else commit(parsed)
  }
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const delta = (event.shiftKey ? step * 10 : step) * (event.key === 'ArrowUp' ? 1 : -1)
    commit((Number(draft) || value) + delta)
  }
  const messageId = error || hint ? `${id}-msg` : undefined
  const outOfRange = focused && draft !== '' && (Number(draft) < (min ?? -Infinity) || Number(draft) > (max ?? Infinity))
  return <div className={`field ${error ? 'has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className={`input-wrap ${disabled ? '' : 'has-stepper'} ${prefix ? 'has-prefix' : ''}`}>
      {prefix && <i className="input-prefix">{prefix}</i>}
      <input id={id} type="text" inputMode={decimal ? 'decimal' : 'numeric'} autoComplete="off" value={draft} disabled={disabled}
        aria-invalid={Boolean(error)} aria-describedby={messageId}
        onFocus={(e) => { setFocused(true); e.currentTarget.select() }} onBlur={blur} onChange={(e) => change(e.target.value)} onKeyDown={keyDown} />
      {suffix && <b>{suffix}</b>}
      {!disabled && <span className="number-stepper">
        <button type="button" tabIndex={-1} aria-label={`Increase ${label}`} disabled={max !== undefined && value >= max} onClick={() => commit(value + step)}><CaretUp weight="bold" /></button>
        <button type="button" tabIndex={-1} aria-label={`Decrease ${label}`} disabled={min !== undefined && value <= min} onClick={() => commit(value - step)}><CaretDown weight="bold" /></button>
      </span>}
    </div>
    {outOfRange && !error && <small className="field-hint level-review">Allowed {min}–{max}{suffix ? ` ${suffix}` : ''}</small>}
    {error ? <small id={messageId} className="field-error">{error}</small> : hint && !outOfRange ? <small id={messageId} className={`field-hint level-${hintLevel}`}>{hint}</small> : null}
  </div>
}

export function TextField({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    {multiline
      ? <textarea id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      : <input id={id} type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
  </div>
}

export function SelectField<T extends string>({ label, value, options, onChange, labels }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void; labels?: Partial<Record<T, string>> }) {
  const id = useId()
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map((option) => <option key={option} value={option}>{labels?.[option] ?? option}</option>)}</select>
  </div>
}

/** Single-choice radio group rendered as a segmented control. */
export function Segmented<T extends string | number>({ label, value, options, onChange, labels, hint }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void; labels?: Partial<Record<string, string>>; hint?: string }) {
  const name = useId()
  return <fieldset className="field segmented-field">
    <legend>{label}</legend>
    <div className="segmented" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => <label key={String(option)} className={option === value ? 'is-selected' : ''}>
        <input type="radio" name={name} checked={option === value} onChange={() => onChange(option)} />
        <span>{labels?.[String(option)] ?? String(option)}</span>
      </label>)}
    </div>
    {hint && <small className="field-hint level-info">{hint}</small>}
  </fieldset>
}

export function Toggle({ label, checked, onChange, detail }: { label: string; checked: boolean; onChange: (value: boolean) => void; detail?: string }) {
  return <label className="toggle-row">
    <span>{label}{detail && <em>{detail}</em>}</span>
    <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} /><i aria-hidden="true" />
  </label>
}

export function Section({ step, title, summary, open, onToggle, children, flagged }: { step?: string; title: string; summary?: string; open: boolean; onToggle: () => void; children: ReactNode; flagged?: 'review' | 'approval' | 'error' }) {
  const id = useId()
  return <section className={`parameter-group ${open ? 'is-open' : ''}`}>
    <h2>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        {step && <span className="step-number">{step}</span>}
        <span className="section-title">{title}</span>
        {flagged && <span className={`section-flag flag-${flagged}`} aria-label={flagged === 'error' ? 'Has geometry checks' : flagged === 'approval' ? 'Approval required' : 'Review recommended'} />}
        {summary && !open && <span className="section-summary">{summary}</span>}
        <span className="section-caret" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
    </h2>
    {open && <div id={id} className="group-body">{children}</div>}
  </section>
}
