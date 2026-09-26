import { createDefaultDesign, type SinkDesign } from '../types/sink'

const KEY = 'artiling-sink-designs-v1'
const DRAFT_KEY = 'artiling-sink-draft-v1'

/** Fill fields added in later versions and convert legacy values. */
export function migrateDesign(raw: Partial<SinkDesign>): SinkDesign {
  const defaults = createDefaultDesign()
  const design = { ...defaults, ...raw } as SinkDesign
  const thickness = design.porcelainThickness
  const legacyFascia = raw.frontFasciaHeight ?? 100
  const legacyFrontDepth = Math.max(40, design.overallHeight - legacyFascia - thickness)
  return {
    ...design,
    id: raw.id || defaults.id,
    leftRimWidth: raw.leftRimWidth ?? Math.max(raw.leftSideThickness ?? thickness, thickness),
    rightRimWidth: raw.rightRimWidth ?? Math.max(raw.rightSideThickness ?? thickness, thickness),
    frontRimWidth: raw.frontRimWidth ?? Math.max(thickness * 2, 28),
    rearRimWidth: raw.rearRimWidth ?? (design.tapType === 'Deck Mounted' ? Math.max(72, thickness * 3) : Math.max(36, thickness * 2)),
    drawerWidth: raw.drawerWidth ?? design.overallWidth,
    drawerDepth: raw.drawerDepth ?? Math.max(1, design.overallDepth - 20),
    drawerHeights: raw.drawerHeights?.length ? raw.drawerHeights : [240, 240],
    equalDrawerHeights: raw.equalDrawerHeights ?? false,
    shallowBowlDepth: raw.shallowBowlDepth ?? Math.min(raw.frontBowlDepth ?? legacyFrontDepth, raw.rearBowlDepth ?? legacyFrontDepth + design.baseFall),
    rearBowlDepth: raw.rearBowlDepth ?? legacyFrontDepth + design.baseFall,
    frontBowlDepth: raw.frontBowlDepth ?? legacyFrontDepth,
    backUpstandHeight: raw.upstandEnabled ? raw.backUpstandHeight ?? defaults.backUpstandHeight : raw.backUpstandHeight || defaults.backUpstandHeight,
    reviewFlags: Array.isArray(raw.reviewFlags) ? raw.reviewFlags : [],
  }
}

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

function write(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}

export function loadDesigns(): SinkDesign[] {
  const designs = read<Partial<SinkDesign>[]>(KEY, [])
  return Array.isArray(designs) ? designs.map(migrateDesign) : []
}

export function persistDesign(design: SinkDesign): { designs: SinkDesign[]; ok: boolean } {
  const saved = loadDesigns()
  const designs = [design, ...saved.filter((item) => item.id !== design.id)]
  return { designs, ok: write(KEY, designs) }
}

export function removeDesign(id: string): SinkDesign[] {
  const designs = loadDesigns().filter((item) => item.id !== id)
  write(KEY, designs)
  return designs
}

export function loadDraft(): SinkDesign | null {
  const draft = read<Partial<SinkDesign> | null>(DRAFT_KEY, null)
  return draft && typeof draft === 'object' ? migrateDesign(draft) : null
}

export const saveDraft = (design: SinkDesign) => write(DRAFT_KEY, design)

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* storage unavailable */ }
}

/** Next free AS-SINK-### reference. */
export function nextReference(designs: SinkDesign[], prefix = 'AS-SINK-'): string {
  const numbers = designs.map((d) => d.reference.startsWith(prefix) ? Number.parseInt(d.reference.slice(prefix.length), 10) : 0).filter(Number.isFinite)
  return `${prefix}${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`
}

/** Compare two designs ignoring timestamps. */
export const sameDesign = (a: SinkDesign, b: SinkDesign) => JSON.stringify({ ...a, updatedAt: '' }) === JSON.stringify({ ...b, updatedAt: '' })
