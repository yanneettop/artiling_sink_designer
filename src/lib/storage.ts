import type { SinkDesign } from '../types/sink'

const KEY = 'artiling-sink-designs-v1'

export function loadDesigns(): SinkDesign[] {
  try {
    const designs = JSON.parse(localStorage.getItem(KEY) || '[]') as SinkDesign[]
    return designs.map((design) => {
      const legacyFascia = design.frontFasciaHeight ?? 100
      const legacyFrontDepth = Math.max(40, design.overallHeight - legacyFascia - design.porcelainThickness)
      return {
      ...design,
      leftRimWidth: design.leftRimWidth ?? Math.max(design.leftSideThickness ?? design.porcelainThickness, design.porcelainThickness),
      rightRimWidth: design.rightRimWidth ?? Math.max(design.rightSideThickness ?? design.porcelainThickness, design.porcelainThickness),
      frontRimWidth: design.frontRimWidth ?? Math.max(design.porcelainThickness * 2, 28),
      rearRimWidth: design.rearRimWidth ?? (design.tapType === 'Deck Mounted' ? Math.max(72, design.porcelainThickness * 3) : Math.max(36, design.porcelainThickness * 2)),
      coverPlateFullWidth: design.coverPlateFullWidth ?? true,
      drawersEnabled: design.drawersEnabled ?? false,
      drawerCount: design.drawerCount ?? 2,
      drawerAutoWidth: design.drawerAutoWidth ?? true,
      drawerWidth: design.drawerWidth ?? design.overallWidth,
      drawerDepth: design.drawerDepth ?? Math.max(1, design.overallDepth - 20),
      drawerHeights: design.drawerHeights?.length ? design.drawerHeights : [240, 240],
      equalDrawerHeights: design.equalDrawerHeights ?? false,
      drawerGap: design.drawerGap ?? 0,
      drawerTopGap: design.drawerTopGap ?? 0,
      fallControl: design.fallControl ?? 'Fall and Low Point',
      fallLowPoint: design.fallLowPoint ?? 'Rear Internal Corner',
      shallowBowlDepth: design.shallowBowlDepth ?? Math.min(design.frontBowlDepth ?? legacyFrontDepth, design.rearBowlDepth ?? legacyFrontDepth + design.baseFall),
      rearBowlDepth: design.rearBowlDepth ?? legacyFrontDepth + design.baseFall,
      frontBowlDepth: design.frontBowlDepth ?? legacyFrontDepth,
    }})
  } catch { return [] }
}

export function persistDesign(design: SinkDesign): SinkDesign[] {
  const saved = loadDesigns()
  const next = { ...design, updatedAt: new Date().toISOString() }
  const designs = [next, ...saved.filter((item) => item.id !== next.id)]
  localStorage.setItem(KEY, JSON.stringify(designs))
  return designs
}

export function removeDesign(id: string): SinkDesign[] {
  const designs = loadDesigns().filter((item) => item.id !== id)
  localStorage.setItem(KEY, JSON.stringify(designs))
  return designs
}
