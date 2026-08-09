import type { ChangeEvent, ReactNode } from 'react'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import type { SinkDesign } from '../types/sink'
import type { ValidationErrors } from '../lib/validation'

type Props = { design: SinkDesign; errors: ValidationErrors; onChange: (patch: Partial<SinkDesign>) => void }

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <details className="parameter-group"><summary>{title}<span>+</span></summary><div className="group-body">{children}</div></details>
}

function Field({ label, value, onChange, type = 'text', suffix, error, disabled, min, max }: { label: string; value: string | number; onChange: (value: string | number) => void; type?: string; suffix?: string; error?: string; disabled?: boolean; min?: number; max?: number }) {
  const change = (e: ChangeEvent<HTMLInputElement>) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)
  const numeric = type === 'number' && !disabled
  const current = Number(value) || 0
  const adjust = (delta: number) => onChange(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, current + delta)))
  return <div className={`field ${error ? 'has-error' : ''}`}><span>{label}</span><div className={`input-wrap ${numeric ? 'has-stepper' : ''}`}><input aria-label={label} type={type} value={value} onChange={change} disabled={disabled} min={min} max={max} />{suffix && <b>{suffix}</b>}{numeric && <span className="number-stepper" aria-label={`Adjust ${label}`}>
    <button type="button" aria-label={`Increase ${label}`} disabled={max !== undefined && current >= max} onClick={() => adjust(1)}><CaretUp weight="bold" /></button>
    <button type="button" aria-label={`Decrease ${label}`} disabled={min !== undefined && current <= min} onClick={() => adjust(-1)}><CaretDown weight="bold" /></button>
  </span>}</div>{error && <small>{error}</small>}</div>
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return <label className="field"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-row"><span>{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><i /></label>
}

export function ParameterPanel({ design: d, errors, onChange }: Props) {
  const number = (key: keyof SinkDesign) => (value: string | number) => onChange({ [key]: value } as Partial<SinkDesign>)
  const calculatedBasinWidth = Math.max(1, d.overallWidth - Math.max(d.leftRimWidth, d.porcelainThickness) - Math.max(d.rightRimWidth, d.porcelainThickness))
  const calculatedBasinDepth = Math.max(1, d.overallDepth - Math.max(d.frontRimWidth, d.porcelainThickness) - Math.max(d.rearRimWidth, d.porcelainThickness))
  return <aside className="parameter-panel">
    <div className="panel-heading"><span>Sink parameters</span><strong>{Object.keys(errors).length ? `${Object.keys(errors).length} checks` : 'Geometry valid'}</strong></div>
    <div className="parameter-scroll">
      <Group title="Project details">
        <Field label="Client name" value={d.clientName} onChange={number('clientName')} />
        <Field label="Project name" value={d.projectName} onChange={number('projectName')} />
        <Field label="Reference" value={d.reference} onChange={number('reference')} />
        <label className="field"><span>Notes</span><textarea value={d.notes} onChange={(e) => onChange({ notes: e.target.value })} /></label>
      </Group>
      <Group title="Overall dimensions">
        <div className="field-grid"><Field label="Overall width" value={d.overallWidth} type="number" suffix="mm" min={1} onChange={number('overallWidth')} error={errors.overallWidth} /><Field label="Overall depth" value={d.overallDepth} type="number" suffix="mm" min={1} onChange={number('overallDepth')} error={errors.overallDepth} /></div>
        <div className="field-grid"><Field label="Overall height" value={d.overallHeight} type="number" suffix="mm" min={1} onChange={number('overallHeight')} /><Field label="Porcelain thickness" value={d.porcelainThickness} type="number" suffix="mm" min={1} onChange={number('porcelainThickness')} error={errors.porcelainThickness} /></div>
      </Group>
      <Group title="Rim configuration">
        <p className="parameter-note">Visible porcelain widths around the basin opening.</p>
        <div className="field-grid"><Field label="Left rim" value={d.leftRimWidth} type="number" suffix="mm" min={d.porcelainThickness} onChange={number('leftRimWidth')} error={errors.leftRimWidth} /><Field label="Right rim" value={d.rightRimWidth} type="number" suffix="mm" min={d.porcelainThickness} onChange={number('rightRimWidth')} error={errors.rightRimWidth} /></div>
        <div className="field-grid"><Field label="Front rim" value={d.frontRimWidth} type="number" suffix="mm" min={d.porcelainThickness} onChange={number('frontRimWidth')} error={errors.frontRimWidth} /><Field label="Rear rim / tap deck" value={d.rearRimWidth} type="number" suffix="mm" min={d.porcelainThickness} onChange={number('rearRimWidth')} error={errors.rearRimWidth} /></div>
      </Group>
      <Group title="Basin base / fall">
        <SelectField label="Base type" value={d.baseType} options={['Flat','Sloped Front to Back'] as const} onChange={(baseType) => onChange({ baseType })} />
        {d.baseType === 'Flat' && <Field label="Internal depth" value={d.shallowBowlDepth} type="number" suffix="mm" min={40} max={d.overallHeight - d.porcelainThickness * 2} onChange={number('shallowBowlDepth')} error={errors.shallowBowlDepth} />}
        {d.baseType === 'Sloped Front to Back' && <>
          <SelectField label="Fall setup" value={d.fallControl} options={['Fall and Low Point','Corner Depths'] as const} onChange={(fallControl) => onChange({ fallControl })} />
          {d.fallControl === 'Fall and Low Point' ? <>
            <Field label="Shallow internal depth" value={d.shallowBowlDepth} type="number" suffix="mm" min={40} max={d.overallHeight - d.porcelainThickness * 2} onChange={number('shallowBowlDepth')} error={errors.shallowBowlDepth} />
            <Field label="Base fall" value={d.baseFall} type="number" suffix="mm" min={0} onChange={number('baseFall')} error={errors.baseFall} />
            <SelectField label="Low point / floor-wall junction" value={d.fallLowPoint} options={['Rear Internal Corner','Front Internal Corner'] as const} onChange={(fallLowPoint) => onChange({ fallLowPoint })} />
            <div className="opening-result"><span>Calculated {d.fallLowPoint === 'Rear Internal Corner' ? 'rear' : 'front'} depth</span><strong>{d.shallowBowlDepth + d.baseFall} <small>mm</small></strong></div>
            <p className="parameter-note">The low point is the internal bottom corner where the basin floor meets the rear or front wall.</p>
          </> : <>
            <div className="field-grid">
              <Field label="Rear junction depth" value={d.rearBowlDepth} type="number" suffix="mm" min={40} onChange={number('rearBowlDepth')} error={errors.rearBowlDepth} />
              <Field label="Front junction depth" value={d.frontBowlDepth} type="number" suffix="mm" min={40} onChange={number('frontBowlDepth')} error={errors.frontBowlDepth} />
            </div>
            <p className="parameter-note">{d.rearBowlDepth === d.frontBowlDepth ? 'Both junctions are level. Select Flat base.' : `Calculated fall: ${Math.abs(d.rearBowlDepth - d.frontBowlDepth)} mm to ${d.rearBowlDepth > d.frontBowlDepth ? 'rear' : 'front'}.`}</p>
          </>}
        </>}
      </Group>
      <Group title="Basin opening">
        <p className="parameter-note">The opening is calculated from the overall size minus the four rim widths.</p>
        <div className="opening-result"><span>Calculated opening</span><strong>{calculatedBasinWidth} × {calculatedBasinDepth} <small>mm</small></strong></div>
      </Group>
      <Group title="Tap configuration">
        <SelectField label="Tap type" value={d.tapType} options={['None','Wall Mounted','Deck Mounted'] as const} onChange={(tapType) => onChange({ tapType })} />
        {d.tapType === 'Deck Mounted' && <>
          <div className="field-grid"><Field label="Number of holes" value={d.tapHoleCount} type="number" min={1} max={5} onChange={number('tapHoleCount')} /><Field label="Hole diameter" value={d.tapHoleDiameter} type="number" suffix="mm" onChange={number('tapHoleDiameter')} /></div>
          <SelectField label="Tap position" value={d.tapPosition} options={['Centre','Custom'] as const} onChange={(tapPosition) => onChange({ tapPosition })} />
          {d.tapPosition === 'Custom' && <div className="field-grid"><Field label="Offset from back" value={d.tapOffsetBack} type="number" suffix="mm" onChange={number('tapOffsetBack')} /><Field label="Offset from left" value={d.tapOffsetLeft} type="number" suffix="mm" onChange={number('tapOffsetLeft')} /></div>}
          {errors.tapPosition && <p className="group-warning">{errors.tapPosition}</p>}
        </>}
      </Group>
      <Group title="Drain configuration">
        <SelectField label="Drain type" value={d.drainType} options={['Circular','Linear','Concealed Linear'] as const} onChange={(drainType) => onChange({ drainType })} />
        <SelectField label="Drain position" value={d.drainPosition} options={['Centre','Rear'] as const} onChange={(drainPosition) => onChange({ drainPosition })} />
        {d.drainType === 'Circular' ? <>
          <Field label="Drain diameter" value={d.drainDiameter} type="number" suffix="mm" onChange={number('drainDiameter')} />
          <Toggle label="Centre automatically" checked={d.centreDrainAutomatically} onChange={(centreDrainAutomatically) => onChange({ centreDrainAutomatically })} />
          {!d.centreDrainAutomatically && <div className="field-grid"><Field label="Offset from back" value={d.drainOffsetBack} type="number" suffix="mm" onChange={number('drainOffsetBack')} /><Field label="Offset from left" value={d.drainOffsetLeft} type="number" suffix="mm" onChange={number('drainOffsetLeft')} error={errors.drainOffsetLeft} /></div>}
        </> : <>
          <div className="field-grid"><Field label="Drain length" value={d.drainLength} type="number" suffix="mm" onChange={number('drainLength')} error={errors.drainLength} /><Field label="Drain width" value={d.drainWidth} type="number" suffix="mm" onChange={number('drainWidth')} /></div>
          {d.drainType === 'Linear'
            ? <Field label="Offset from back" value={d.drainOffsetBack} type="number" suffix="mm" onChange={number('drainOffsetBack')} />
            : <p className="parameter-note">Cover plate rear edge fixed to basin opening.</p>}
          {d.drainType === 'Concealed Linear' && <>
            <Toggle label="Full basin width cover" checked={d.coverPlateFullWidth} onChange={(coverPlateFullWidth) => onChange({ coverPlateFullWidth })} />
            <div className="field-grid"><Field label="Cover plate width" value={d.coverPlateFullWidth ? 'AUTO' : d.coverPlateWidth} type={d.coverPlateFullWidth ? 'text' : 'number'} suffix={d.coverPlateFullWidth ? undefined : 'mm'} disabled={d.coverPlateFullWidth} onChange={number('coverPlateWidth')} error={errors.coverPlateWidth} /><Field label="Cover plate depth" value={d.coverPlateDepth} type="number" suffix="mm" onChange={number('coverPlateDepth')} /></div>
            <Field label="Drain gap" value={d.drainGap} type="number" suffix="mm" onChange={number('drainGap')} />
          </>}
        </>}
      </Group>
      <Group title="Drawer configuration">
        <Toggle label="Include drawers" checked={d.drawersEnabled} onChange={(drawersEnabled) => onChange({ drawersEnabled })} />
        {d.drawersEnabled && <>
          <Field label="Number of drawers" value={d.drawerCount} type="number" min={1} max={6} onChange={number('drawerCount')} error={errors.drawerCount} />
          <Toggle label="Match sink width automatically" checked={d.drawerAutoWidth} onChange={(drawerAutoWidth) => onChange({ drawerAutoWidth })} />
          <div className="field-grid"><Field label="Drawer width" value={d.drawerAutoWidth ? 'AUTO' : d.drawerWidth} type={d.drawerAutoWidth ? 'text' : 'number'} suffix={d.drawerAutoWidth ? undefined : 'mm'} disabled={d.drawerAutoWidth} onChange={number('drawerWidth')} error={errors.drawerWidth} /><Field label="Drawer depth" value={d.drawerDepth} type="number" suffix="mm" onChange={number('drawerDepth')} error={errors.drawerDepth} /></div>
          <div className="field-grid"><Field label="Gap below sink" value={d.drawerTopGap} type="number" suffix="mm" min={0} onChange={number('drawerTopGap')} /><Field label="Gap between drawers" value={d.drawerGap} type="number" suffix="mm" min={0} onChange={number('drawerGap')} /></div>
          <Toggle label="Equal drawer heights" checked={d.equalDrawerHeights} onChange={(equalDrawerHeights) => onChange({ equalDrawerHeights })} />
          {d.equalDrawerHeights
            ? <Field label="Drawer height" value={d.drawerHeights[0] ?? 240} type="number" suffix="mm" min={1} error={errors.drawerHeight0} onChange={(value) => onChange({ drawerHeights: Array.from({ length: d.drawerCount }, () => Number(value)) })} />
            : <div className="drawer-height-fields">{d.drawerHeights.slice(0, d.drawerCount).map((height, index) => <Field key={index} label={`Drawer ${index + 1} height`} value={height} type="number" suffix="mm" min={1} error={errors[`drawerHeight${index}`]} onChange={(value) => onChange({ drawerHeights: d.drawerHeights.map((item, itemIndex) => itemIndex === index ? Number(value) : item) })} />)}</div>}
        </>}
      </Group>
      <Group title="Back upstand">
        <p className="parameter-note">The front and side panels use the overall height and porcelain thickness automatically.</p>
        <Toggle label="Back upstand" checked={d.upstandEnabled} onChange={(upstandEnabled) => onChange({ upstandEnabled })} />
        {d.upstandEnabled && <Field label="Upstand height" value={d.backUpstandHeight} type="number" suffix="mm" onChange={number('backUpstandHeight')} />}
      </Group>
      <Group title="Material">
        <Field label="Material / porcelain name" value={d.material} onChange={number('material')} />
        <SelectField label="Finish" value={d.finish} options={['Matt','Polished','Textured'] as const} onChange={(finish) => onChange({ finish })} />
        <label className="field"><span>Material notes</span><textarea value={d.materialNotes} onChange={(e) => onChange({ materialNotes: e.target.value })} /></label>
      </Group>
    </div>
  </aside>
}
