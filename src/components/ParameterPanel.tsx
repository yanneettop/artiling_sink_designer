import { useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import {
  BASE_TYPES, DELIVERY_TYPES, DRAIN_TYPES, FALL_CONTROLS, FALL_LOW_POINTS, FINISHES, INSTALLATION_TYPES, MATERIAL_SUPPLY,
  MOUNTING_TYPES, PRICING_MODES, REVIEW_FLAGS, SHAPE_TYPES, TAP_TYPES, TEMPLATING_TYPES, CONCEALED_DETAILS,
  type SinkDesign,
} from '../types/sink'
import type { ValidationErrors } from '../lib/validation'
import type { SinkGeometry } from '../lib/sinkGeometry'
import type { PriceResult, PriceWarning } from '../pricing/engine'
import { formatGbp } from '../pricing/engine'
import { LIMITS, MATERIAL_MARKUP, RATES } from '../pricing/rates'
import { NumberField, Section, Segmented, SelectField, TextField, Toggle } from './controls'

type Props = {
  design: SinkDesign
  geometry: SinkGeometry
  errors: ValidationErrors
  price: PriceResult
  warnings: PriceWarning[]
  onChange: (patch: Partial<SinkDesign>) => void
  onShowPreview?: () => void
}

/** Hard input limits. Values inside them are accepted; business ranges raise review warnings instead. */
const INPUT = {
  width: { min: 200, max: 4000, step: 10 },
  depth: { min: 100, max: 1200, step: 10 },
  height: { min: 60, max: 1000, step: 5 },
  thickness: { min: 3, max: 40 },
  rim: { min: 1, max: 800, step: 5 },
  internal: { min: 0, max: 1000 },
  fitting: { min: 0, max: 2000, step: 5 },
  drawerHeight: { min: 1, max: 1200, step: 10 },
  money: { min: 0, max: 100000, step: 25 },
}

type SectionKey = 'project' | 'dimensions' | 'construction' | 'vanity' | 'material' | 'service' | 'commercial' | 'detail'

const SECTION_FIELDS: Record<SectionKey, string[]> = {
  project: [],
  dimensions: ['overallWidth', 'overallDepth', 'overallHeight', 'width', 'depth', 'width-range', 'depth-range'],
  construction: ['basinCount', 'tapPosition', 'shape', 'linear-drain', 'basins'],
  vanity: ['backUpstandHeight', 'drawerCount', 'drawers-odd', 'drawers-many', 'shelves'],
  material: ['material-tbc', 'material-cost', 'flag-Difficult porcelain'],
  service: ['delivery-manual', 'installation-manual', 'wall-install'],
  commercial: ['allowance', 'flag-Specialist reinforcement', 'flag-Complex mounting', 'flag-Non-standard fabrication'],
  detail: ['porcelainThickness', 'leftRimWidth', 'rightRimWidth', 'frontRimWidth', 'rearRimWidth', 'rimWidthTotal', 'rimDepthTotal', 'shallowBowlDepth', 'baseFall', 'rearBowlDepth', 'frontBowlDepth', 'drainDiameter', 'drainOffsetLeft', 'drainLength', 'drainOffsetBack', 'coverPlateWidth', 'coverPlateDepth', 'tapHoleDiameter', 'drawerWidth', 'drawerDepth', 'fall-front'],
}

const plural = (count: number, word: string, many = `${word}s`) => `${count} ${count === 1 ? word : many}`

export function ParameterPanel({ design: d, geometry: g, errors, price, warnings, onChange, onShowPreview }: Props) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({ project: false, dimensions: true, construction: true, vanity: false, material: false, service: false, commercial: false, detail: false })
  const toggle = (key: SectionKey) => setOpen((current) => ({ ...current, [key]: !current[key] }))
  const set = <K extends keyof SinkDesign>(key: K) => (value: SinkDesign[K]) => onChange({ [key]: value } as Partial<SinkDesign>)
  const mode = d.pricingMode
  const rate = (key: keyof typeof RATES) => formatGbp(RATES[key][mode])
  const warningFor = (key: string) => warnings.find((w) => w.key === key)
  const flag = (section: SectionKey) => {
    const keys = SECTION_FIELDS[section]
    if (keys.some((key) => errors[key] || (key.startsWith('drawerHeight') && errors[key]))) return 'error'
    if (section === 'detail' && Object.keys(errors).some((key) => key.startsWith('drawerHeight'))) return 'error'
    const levels = keys.map((key) => warningFor(key)?.level)
    return levels.includes('approval') ? 'approval' : levels.includes('review') ? 'review' : undefined
  }
  const widthWarning = warningFor('width') ?? warningFor('width-range')
  const depthWarning = warningFor('depth') ?? warningFor('depth-range')
  const errorCount = Object.keys(errors).length
  const maxInternal = g.maximumInternalDepth

  const constructionSummary = [
    plural(d.basinCount, 'basin'), d.mountingType === 'Wall Mounted' ? 'wall-mounted' : d.mountingType.toLowerCase(),
    d.drainType === 'Concealed Linear' ? `${d.concealedDetail.toLowerCase()} concealed drain` : `${d.drainType.toLowerCase()} drain`,
  ].join(' · ')
  const vanityItems = [d.drawersEnabled && plural(d.drawerCount, 'drawer'), d.vanityCladding && 'cladding', d.shelfCount > 0 && plural(d.shelfCount, 'shelf', 'shelves'), d.upstandEnabled && 'upstand'].filter(Boolean)
  const materialSummary = d.materialSupply === 'TBC' ? 'Supply not confirmed' : d.materialSupply === 'Client' ? 'Client supplied' : `Artiling supplied · ${formatGbp(d.materialCost)} cost`
  const serviceSummary = [
    d.deliveryType === 'None' ? 'No delivery' : `${d.deliveryType === 'Manual' ? 'Manual' : d.deliveryType} delivery`,
    d.installationType === 'None' ? 'no install' : `${d.installationType.toLowerCase()} install`,
    d.templating === 'Physical' && 'templating',
  ].filter(Boolean).join(' · ')

  return <aside className="parameter-panel" aria-label="Sink configuration">
    <div className="panel-heading">
      <span>Configuration</span>
      <strong className={errorCount ? 'has-checks' : ''}>{errorCount ? plural(errorCount, 'geometry check') : 'Geometry valid'}</strong>
      {onShowPreview && <button className="mobile-show-preview" type="button" onClick={onShowPreview}>Preview <ArrowRight weight="bold" /></button>}
    </div>
    <div className="parameter-scroll">
      <Section title="Client & project" summary={[d.clientName || 'No client', d.reference].join(' · ')} open={open.project} onToggle={() => toggle('project')}>
        <TextField label="Client name" value={d.clientName} onChange={set('clientName')} />
        <TextField label="Project" value={d.projectName} onChange={set('projectName')} />
        <div className="field-grid">
          <TextField label="Reference" value={d.reference} onChange={set('reference')} />
          <TextField label="Site location" value={d.siteLocation} onChange={set('siteLocation')} placeholder="e.g. SW11" />
        </div>
        <TextField label="Notes" value={d.notes} onChange={set('notes')} multiline />
      </Section>

      <Section step="1" title="Dimensions" summary={`${d.overallWidth} × ${d.overallDepth} × ${d.overallHeight} mm`} open={open.dimensions} onToggle={() => toggle('dimensions')} flagged={flag('dimensions')}>
        <NumberField label="Width" value={d.overallWidth} suffix="mm" {...INPUT.width} onChange={set('overallWidth')} error={errors.overallWidth} hint={widthWarning?.message} hintLevel={widthWarning?.level} />
        <div className="field-grid">
          <NumberField label="Depth (front to back)" value={d.overallDepth} suffix="mm" {...INPUT.depth} onChange={set('overallDepth')} error={errors.overallDepth} />
          <NumberField label="Overall height" value={d.overallHeight} suffix="mm" {...INPUT.height} onChange={set('overallHeight')} error={errors.overallHeight} />
        </div>
        {depthWarning && <p className={`inline-warning level-${depthWarning.level}`}>{depthWarning.message}</p>}
        <div className="opening-result"><span>Basin opening{d.basinCount > 1 ? ` · ${d.basinCount} basins` : ''}</span><strong>{d.basinCount > 1 ? `${d.basinCount} × ${Math.round(g.basins[0].width)}` : Math.round(g.basinWidth)} × {Math.round(g.basinDepth)} <small>mm</small></strong></div>
      </Section>

      <Section step="2" title="Construction" summary={constructionSummary} open={open.construction} onToggle={() => toggle('construction')} flagged={flag('construction')}>
        <Segmented label="Basins" value={d.basinCount} options={[1, 2, 3]} onChange={set('basinCount')} hint={d.basinCount > 1 ? `+${rate('additionalBasin')} each after the first` : undefined} />
        {errors.basinCount && <p className="inline-warning level-error">{errors.basinCount}</p>}
        {!errors.basinCount && (errors.drainLength || errors.coverPlateWidth || errors.drainDiameter) && <p className="inline-warning level-error">Drain no longer fits each basin ({Math.round(g.basins[0].width)} mm). Adjust it under Fabrication detail.</p>}
        <Segmented label="Mounting" value={d.mountingType} options={MOUNTING_TYPES} onChange={set('mountingType')} labels={{ 'Wall Mounted': 'Wall-mounted', Supported: 'Supported' }} hint={d.mountingType === 'Wall Mounted' ? `Support allowance +${rate('wallMountedSupport')}` : d.mountingType === 'Supported' ? 'Sits on a vanity or countertop' : undefined} />
        <Segmented label="Shape" value={d.shapeType} options={SHAPE_TYPES} onChange={set('shapeType')} labels={{ Irregular: 'Irregular / polygonal' }} hint={d.shapeType === 'Irregular' ? `+${rate('irregularGeometry')} · manual review` : undefined} />
        <SelectField label="Drain" value={d.drainType} options={DRAIN_TYPES} onChange={set('drainType')} labels={{ 'Concealed Linear': 'Concealed linear (rear)', Circular: 'Round', Linear: 'Exposed linear' }} />
        {d.drainType === 'Concealed Linear' && <Segmented label="Concealed drain detail" value={d.concealedDetail} options={CONCEALED_DETAILS} onChange={set('concealedDetail')} labels={{ Standard: 'Standard (included)', Specialist: `Specialist +${rate('specialistConcealedDrain')}` }} />}
        <Segmented label="Taps" value={d.tapType} options={TAP_TYPES} onChange={set('tapType')} labels={{ 'Deck Mounted': 'Deck-mounted', 'Wall Mounted': 'Wall-mounted', None: 'None' }} />
        {d.tapType === 'Deck Mounted' && <NumberField label={d.basinCount > 1 ? 'Tap holes per basin' : 'Tap holes'} value={d.tapHoleCount} {...LIMITS.tapHolesPerBasin} onChange={set('tapHoleCount')} error={errors.tapPosition} hint={price.lines.find((l) => l.key === 'taps')?.detail ?? 'First hole included'} />}
        <Toggle label="Overflow" detail={`+${rate('overflow')}`} checked={d.overflow} onChange={set('overflow')} />
      </Section>

      <Section step="3" title="Vanity & extras" summary={vanityItems.length ? vanityItems.join(' · ') : 'None'} open={open.vanity} onToggle={() => toggle('vanity')} flagged={flag('vanity')}>
        <Toggle label="Vanity drawers" detail={`${rate('drawerPair')} per pair`} checked={d.drawersEnabled} onChange={set('drawersEnabled')} />
        {d.drawersEnabled && <NumberField label="Number of drawers" value={d.drawerCount} min={1} max={6} onChange={(drawerCount) => onChange({ drawerCount })} error={errors.drawerCount} hint={warningFor('drawers-odd')?.message ?? warningFor('drawers-many')?.message} hintLevel="review" />}
        <Toggle label="Porcelain vanity cladding" detail={rate('vanityCladding')} checked={d.vanityCladding} onChange={set('vanityCladding')} />
        <NumberField label="Matching porcelain shelves" value={d.shelfCount} min={0} max={6} onChange={set('shelfCount')} hint={d.shelfCount ? `${d.shelfCount} × ${rate('shelf')}` : `${rate('shelf')} each`} />
        <Toggle label="Matching upstand" detail={`+${rate('matchingUpstand')}`} checked={d.upstandEnabled} onChange={set('upstandEnabled')} />
        {d.upstandEnabled && <NumberField label="Upstand height" value={d.backUpstandHeight} suffix="mm" min={0} max={1500} step={10} onChange={set('backUpstandHeight')} error={errors.backUpstandHeight} />}
      </Section>

      <Section step="4" title="Material" summary={materialSummary} open={open.material} onToggle={() => toggle('material')} flagged={flag('material')}>
        <Segmented label="Porcelain supply" value={d.materialSupply} options={MATERIAL_SUPPLY} onChange={set('materialSupply')} labels={{ TBC: 'Not confirmed', Client: 'Client', Artiling: 'Artiling' }} />
        {d.materialSupply === 'Artiling' && <NumberField label="Supplier cost" prefix="£" decimal value={d.materialCost} {...INPUT.money} onChange={set('materialCost')} hint={`Charged at cost + ${Math.round(MATERIAL_MARKUP[mode] * 100)}% handling / waste = ${formatGbp(price.groupTotals.material)}`} />}
        <TextField label="Porcelain reference" value={d.material} onChange={set('material')} placeholder="Supplier, range, colour, slab size" />
        <SelectField label="Finish" value={d.finish} options={FINISHES} onChange={set('finish')} />
        <Toggle label="Difficult or premium porcelain" detail="Artan confirmation" checked={d.reviewFlags.includes('Difficult porcelain')} onChange={(on) => onChange({ reviewFlags: on ? [...d.reviewFlags, 'Difficult porcelain'] : d.reviewFlags.filter((f) => f !== 'Difficult porcelain') })} />
        <TextField label="Material notes" value={d.materialNotes} onChange={set('materialNotes')} multiline />
      </Section>

      <Section step="5" title="Site & service" summary={serviceSummary} open={open.service} onToggle={() => toggle('service')} flagged={flag('service')}>
        <SelectField label="Delivery" value={d.deliveryType} options={DELIVERY_TYPES} onChange={set('deliveryType')} labels={{ None: 'None / collection', London: `London · ${rate('deliveryLondon')}`, Large: `Large / two-person · ${rate('deliveryLarge')}`, Manual: 'Manual amount' }} />
        {d.deliveryType === 'Manual' && <NumberField label="Delivery amount" prefix="£" value={d.manualDelivery} {...INPUT.money} onChange={set('manualDelivery')} />}
        <SelectField label="Installation" value={d.installationType} options={INSTALLATION_TYPES} onChange={set('installationType')} labels={{ None: 'Not included', Standard: `Standard · ${rate('installationStandard')}`, Large: `Large / wall-mounted · ${rate('installationLarge')}`, Manual: 'Manual amount' }} />
        {d.installationType === 'Manual' && <NumberField label="Installation amount" prefix="£" value={d.manualInstallation} {...INPUT.money} onChange={set('manualInstallation')} />}
        {warningFor('wall-install') && <p className="inline-warning level-info">{warningFor('wall-install')!.message}</p>}
        <Segmented label="Templating" value={d.templating} options={TEMPLATING_TYPES} onChange={set('templating')} labels={{ None: 'Not required', Physical: `Physical · ${rate('templatingPhysical')}` }} />
      </Section>

      <Section step="6" title="Pricing controls" summary={`${mode}${d.directJobCost ? ` · cost ${formatGbp(d.directJobCost)}` : ''}${d.reviewFlags.length ? ` · ${plural(d.reviewFlags.length, 'flag')}` : ''}`} open={open.commercial} onToggle={() => toggle('commercial')} flagged={flag('commercial')}>
        <p className="parameter-note">Internal only. Not shown to the client.</p>
        <Segmented label="Pricing mode" value={d.pricingMode} options={PRICING_MODES} onChange={set('pricingMode')} hint={mode === 'Portfolio' ? 'Launch pricing, about 10% below Standard' : 'Normal market pricing'} />
        <NumberField label="Direct job cost" prefix="£" value={d.directJobCost} {...INPUT.money} onChange={set('directJobCost')} hint={price.safeMinimum ? `Margin floor ${formatGbp(price.safeMinimum)}` : 'Labour, material, transport, consumables'} />
        <NumberField label="Manual complexity allowance" prefix="£" value={d.manualComplexity} {...INPUT.money} onChange={set('manualComplexity')} hint={d.manualComplexity ? 'Triggers review' : 'For detailing not covered above'} hintLevel={d.manualComplexity ? 'review' : 'info'} />
        {d.manualComplexity > 0 && <TextField label="Reason for allowance" value={d.manualComplexityNote} onChange={set('manualComplexityNote')} />}
        <fieldset className="field flag-list">
          <legend>Needs Artan confirmation</legend>
          {REVIEW_FLAGS.filter((f) => f !== 'Difficult porcelain').map((f) => <Toggle key={f} label={f} checked={d.reviewFlags.includes(f)} onChange={(on) => onChange({ reviewFlags: on ? [...d.reviewFlags, f] : d.reviewFlags.filter((x) => x !== f) })} />)}
        </fieldset>
      </Section>

      <Section title="Fabrication detail" summary={`${d.porcelainThickness} mm porcelain · rims ${d.leftRimWidth}/${d.rightRimWidth}/${d.frontRimWidth}/${d.rearRimWidth}`} open={open.detail} onToggle={() => toggle('detail')} flagged={flag('detail')}>
        <NumberField label="Porcelain thickness" value={d.porcelainThickness} suffix="mm" {...INPUT.thickness} onChange={set('porcelainThickness')} error={errors.porcelainThickness} />
        <h3 className="subhead">Rims</h3>
        <div className="field-grid">
          <NumberField label="Left rim" value={d.leftRimWidth} suffix="mm" {...INPUT.rim} onChange={set('leftRimWidth')} error={errors.leftRimWidth ?? errors.rimWidthTotal} />
          <NumberField label="Right rim" value={d.rightRimWidth} suffix="mm" {...INPUT.rim} onChange={set('rightRimWidth')} error={errors.rightRimWidth} />
          <NumberField label="Front rim" value={d.frontRimWidth} suffix="mm" {...INPUT.rim} onChange={set('frontRimWidth')} error={errors.frontRimWidth ?? errors.rimDepthTotal} />
          <NumberField label="Rear rim / tap deck" value={d.rearRimWidth} suffix="mm" {...INPUT.rim} onChange={set('rearRimWidth')} error={errors.rearRimWidth} />
        </div>

        <h3 className="subhead">Basin floor</h3>
        <SelectField label="Base" value={d.baseType} options={BASE_TYPES} onChange={set('baseType')} labels={{ 'Sloped Front to Back': 'Single fall, front to back', Flat: 'Flat' }} />
        {d.baseType === 'Flat' && <NumberField label="Internal depth" value={d.shallowBowlDepth} suffix="mm" {...INPUT.internal} onChange={set('shallowBowlDepth')} error={errors.shallowBowlDepth} hint={`Maximum ${maxInternal} mm`} />}
        {d.baseType === 'Sloped Front to Back' && <>
          <SelectField label="Fall setup" value={d.fallControl} options={FALL_CONTROLS} onChange={set('fallControl')} labels={{ 'Fall and Low Point': 'Depth + fall', 'Corner Depths': 'Front and rear depths' }} />
          {d.fallControl === 'Fall and Low Point' ? <>
            <div className="field-grid">
              <NumberField label="Shallow internal depth" value={d.shallowBowlDepth} suffix="mm" {...INPUT.internal} onChange={set('shallowBowlDepth')} error={errors.shallowBowlDepth} />
              <NumberField label="Fall" value={d.baseFall} suffix="mm" {...INPUT.internal} onChange={set('baseFall')} error={errors.baseFall} />
            </div>
            <SelectField label="Low point" value={d.fallLowPoint} options={FALL_LOW_POINTS} onChange={set('fallLowPoint')} labels={{ 'Rear Internal Corner': 'Rear (Artiling standard)', 'Front Internal Corner': 'Front (non-standard)' }} />
            <div className="opening-result"><span>{d.fallLowPoint === 'Rear Internal Corner' ? 'Rear' : 'Front'} depth</span><strong>{d.shallowBowlDepth + d.baseFall} <small>mm</small></strong></div>
          </> : <>
            <div className="field-grid">
              <NumberField label="Rear depth" value={d.rearBowlDepth} suffix="mm" {...INPUT.internal} onChange={set('rearBowlDepth')} error={errors.rearBowlDepth} />
              <NumberField label="Front depth" value={d.frontBowlDepth} suffix="mm" {...INPUT.internal} onChange={set('frontBowlDepth')} error={errors.frontBowlDepth} />
            </div>
            {d.rearBowlDepth !== d.frontBowlDepth && <p className="parameter-note">Fall {Math.abs(d.rearBowlDepth - d.frontBowlDepth)} mm to the {d.rearBowlDepth > d.frontBowlDepth ? 'rear' : 'front'}.</p>}
          </>}
          {warningFor('fall-front') && <p className="inline-warning level-review">{warningFor('fall-front')!.message}</p>}
        </>}

        <h3 className="subhead">Drain</h3>
        {d.drainType !== 'Concealed Linear' && <SelectField label="Drain position" value={d.drainPosition} options={['Rear', 'Centre'] as const} onChange={set('drainPosition')} />}
        {d.drainType === 'Circular' ? <>
          <NumberField label="Drain diameter" value={d.drainDiameter} suffix="mm" {...INPUT.fitting} onChange={set('drainDiameter')} error={errors.drainDiameter ?? errors.drainOffsetLeft} />
          {d.basinCount === 1 && <Toggle label="Centre left to right" checked={d.centreDrainAutomatically} onChange={set('centreDrainAutomatically')} />}
          <div className="field-grid">
            {d.drainPosition === 'Rear' && <NumberField label="From basin rear wall" value={d.drainOffsetBack} suffix="mm" {...INPUT.fitting} onChange={set('drainOffsetBack')} />}
            {d.basinCount === 1 && !d.centreDrainAutomatically && <NumberField label="From sink left edge" value={d.drainOffsetLeft} suffix="mm" {...INPUT.fitting} onChange={set('drainOffsetLeft')} />}
          </div>
        </> : <>
          <div className="field-grid">
            <NumberField label="Drain length" value={d.drainLength} suffix="mm" {...INPUT.fitting} onChange={set('drainLength')} error={errors.drainLength} />
            <NumberField label="Drain width" value={d.drainWidth} suffix="mm" {...INPUT.fitting} onChange={set('drainWidth')} />
          </div>
          {d.drainType === 'Linear' && d.drainPosition === 'Rear' && <NumberField label="From basin rear wall" value={d.drainOffsetBack} suffix="mm" {...INPUT.fitting} onChange={set('drainOffsetBack')} error={errors.drainOffsetBack} />}
          {d.drainType === 'Concealed Linear' && <>
            <Toggle label="Cover full basin width" checked={d.coverPlateFullWidth} onChange={set('coverPlateFullWidth')} />
            <div className="field-grid">
              {!d.coverPlateFullWidth && <NumberField label="Cover plate width" value={d.coverPlateWidth} suffix="mm" {...INPUT.fitting} onChange={set('coverPlateWidth')} error={errors.coverPlateWidth} />}
              <NumberField label="Cover plate depth" value={d.coverPlateDepth} suffix="mm" {...INPUT.fitting} onChange={set('coverPlateDepth')} error={errors.coverPlateDepth} />
              <NumberField label="Drain gap" value={d.drainGap} suffix="mm" min={0} max={50} onChange={set('drainGap')} />
            </div>
            <p className="parameter-note">Cover plate sits against the basin rear wall.</p>
          </>}
        </>}

        {d.tapType === 'Deck Mounted' && <>
          <h3 className="subhead">Tap holes</h3>
          <NumberField label="Hole diameter" value={d.tapHoleDiameter} suffix="mm" min={1} max={100} onChange={set('tapHoleDiameter')} error={errors.tapHoleDiameter} />
          {d.basinCount === 1 && <SelectField label="Tap position" value={d.tapPosition} options={['Centre', 'Custom'] as const} onChange={set('tapPosition')} />}
          <div className="field-grid">
            <NumberField label="From rear edge" value={d.tapOffsetBack} suffix="mm" {...INPUT.fitting} onChange={set('tapOffsetBack')} />
            {d.basinCount === 1 && d.tapPosition === 'Custom' && <NumberField label="From left edge" value={d.tapOffsetLeft} suffix="mm" {...INPUT.fitting} onChange={set('tapOffsetLeft')} />}
          </div>
          {errors.tapPosition && <p className="inline-warning level-error">{errors.tapPosition}</p>}
        </>}

        {d.drawersEnabled && <>
          <h3 className="subhead">Drawers</h3>
          <Toggle label="Match sink width" checked={d.drawerAutoWidth} onChange={set('drawerAutoWidth')} />
          <div className="field-grid">
            {!d.drawerAutoWidth && <NumberField label="Drawer width" value={d.drawerWidth} suffix="mm" {...INPUT.width} onChange={set('drawerWidth')} error={errors.drawerWidth} />}
            <NumberField label="Drawer depth" value={d.drawerDepth} suffix="mm" {...INPUT.depth} onChange={set('drawerDepth')} error={errors.drawerDepth} />
            <NumberField label="Gap below sink" value={d.drawerTopGap} suffix="mm" min={0} max={500} onChange={set('drawerTopGap')} />
            <NumberField label="Gap between" value={d.drawerGap} suffix="mm" min={0} max={200} onChange={set('drawerGap')} />
          </div>
          <Toggle label="Equal drawer heights" checked={d.equalDrawerHeights} onChange={set('equalDrawerHeights')} />
          {d.equalDrawerHeights
            ? <NumberField label="Drawer height" value={d.drawerHeights[0] ?? 240} suffix="mm" {...INPUT.drawerHeight} error={errors.drawerHeight0} onChange={(value) => onChange({ drawerHeights: Array.from({ length: d.drawerCount }, () => value) })} />
            : <div className="field-grid">{d.drawerHeights.slice(0, d.drawerCount).map((height, index) => <NumberField key={index} label={`Drawer ${index + 1} height`} value={height} suffix="mm" {...INPUT.drawerHeight} error={errors[`drawerHeight${index}`]} onChange={(value) => onChange({ drawerHeights: d.drawerHeights.map((item, i) => i === index ? value : item) })} />)}</div>}
        </>}
      </Section>
    </div>
  </aside>
}
