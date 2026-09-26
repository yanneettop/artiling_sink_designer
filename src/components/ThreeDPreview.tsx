import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Edges, Environment, Grid, Lightformer, Line, OrbitControls } from '@react-three/drei'
import {
  BoxGeometry, BufferGeometry, CanvasTexture, Float32BufferAttribute, MeshPhysicalMaterial, MeshStandardMaterial,
  RepeatWrapping, SRGBColorSpace, type Material,
} from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { SinkGeometry } from '../lib/sinkGeometry'

type Vec3 = [number, number, number]
type ViewPreset = 'perspective' | 'front' | 'top' | 'side'
type RenderMode = 'realistic' | 'technical'

const SCALE = 1 / 200
/** Visual only: height of the sink rim above the floor used to place the room. */
const RIM_HEIGHT_MM = 860
/** World size of one porcelain texture tile (2.4 m), so typical sinks show no repeat. */
const TEXTURE_TILE = 2400 * SCALE

const SURFACES = {
  'Warm white': { base: '#ebe6de', vein: '', veins: 0, cloud: 0.035 },
  Calacatta: { base: '#f1eee8', vein: '140,112,76', veins: 9, cloud: 0.04 },
  Statuario: { base: '#eeefee', vein: '96,100,106', veins: 12, cloud: 0.05 },
  'Beige stone': { base: '#d9ccb7', vein: '150,126,92', veins: 4, cloud: 0.1 },
} as const
type SurfaceName = keyof typeof SURFACES
const SURFACE_KEY = 'artiling-3d-surface'

const technicalPorcelain = '#dedbd4'
const technicalSide = '#c9c5bd'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** Procedural porcelain slab texture. Deterministic per surface so renders are repeatable. */
function makeSurfaceTexture(name: SurfaceName): CanvasTexture {
  const spec = SURFACES[name]
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = seeded(name.length * 7919 + 17)
  ctx.fillStyle = spec.base
  ctx.fillRect(0, 0, size, size)
  // Soft clouding
  for (let i = 0; i < 260; i++) {
    const x = rand() * size, y = rand() * size, r = 60 + rand() * 260
    const light = rand() > 0.5
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, light ? `rgba(255,255,255,${spec.cloud})` : `rgba(90,80,70,${spec.cloud * 0.7})`)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // Veins: meandering strokes, a wide soft pass under a fine sharp pass
  for (let v = 0; v < spec.veins; v++) {
    const points: [number, number][] = []
    let x = -50, y = rand() * size, angle = (rand() - 0.5) * 0.9
    while (x < size + 50) {
      points.push([x, y])
      angle += (rand() - 0.5) * 0.35
      angle = Math.max(-0.9, Math.min(0.9, angle))
      x += 10 + rand() * 7
      y += Math.sin(angle) * 12
    }
    const major = v < Math.ceil(spec.veins / 3)
    for (const [width, alpha, blur] of [[major ? 18 : 7, 0.14, 6], [major ? 3.4 : 1.4, major ? 0.8 : 0.5, 0.5]] as const) {
      ctx.save()
      ctx.filter = `blur(${blur}px)`
      ctx.strokeStyle = `rgba(${spec.vein},${alpha})`
      ctx.lineWidth = width
      ctx.lineJoin = ctx.lineCap = 'round'
      ctx.beginPath()
      points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))
      ctx.stroke()
      ctx.restore()
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 8
  return texture
}

/**
 * Box-project UVs in world space so the slab pattern runs continuously across
 * mitred pieces instead of being stretched onto each face.
 */
function applyWorldUVs(geometry: BufferGeometry, offset: Vec3) {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const uv = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + offset[0], y = position.getY(i) + offset[1], z = position.getZ(i) + offset[2]
    const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i)), nz = Math.abs(normal.getZ(i))
    const [u, v] = ny >= nx && ny >= nz ? [x, z] : nx >= nz ? [z, y] : [x, y]
    uv[i * 2] = u / TEXTURE_TILE + 0.5
    uv[i * 2 + 1] = v / TEXTURE_TILE + 0.5
  }
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
}

function Box({ size, position, material, edges = false }: { size: Vec3; position: Vec3; material: Material; edges?: boolean }) {
  const key = [...size, ...position].map((n) => n.toFixed(5)).join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const geometry = useMemo(() => { const geo = new BoxGeometry(...size); applyWorldUVs(geo, position); return geo }, [key])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={position} material={material} castShadow receiveShadow>
    {edges && <Edges threshold={15} color="#595a55" />}
  </mesh>
}

const solidIndices = [
  0, 1, 2, 0, 2, 3,
  4, 6, 5, 4, 7, 6,
  0, 4, 5, 0, 5, 1,
  1, 5, 6, 1, 6, 2,
  2, 6, 7, 2, 7, 3,
  3, 7, 4, 3, 4, 0,
]

function SolidMesh({ vertices, material, edges = false }: { vertices: number[]; material: Material; edges?: boolean }) {
  const geometry = useMemo(() => {
    const indexed = new BufferGeometry()
    indexed.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    indexed.setIndex(solidIndices)
    const result = indexed.toNonIndexed()
    indexed.dispose()
    result.computeVertexNormals()
    applyWorldUVs(result, [0, 0, 0])
    return result
  }, [vertices])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow>
    {edges && <Edges threshold={10} color="#595a55" />}
  </mesh>
}

function CameraControls({ preset, extent, targetY, realistic }: { preset: ViewPreset; extent: number; targetY: number; realistic: boolean }) {
  const { camera, invalidate, size } = useThree()
  const controls = useRef<OrbitControlsImpl>(null)
  // Portrait viewports need the camera further back to fit the sink's width.
  const fit = Math.max(1, 1.3 / Math.max(.1, size.width / Math.max(1, size.height)))
  useEffect(() => {
    const r = extent * fit
    const positions: Record<ViewPreset, Vec3> = {
      perspective: [r * 1.2, r * .8, r * 1.65],
      front: [0, targetY, r * 2.35],
      top: [0, r * 2.4, .001],
      side: [r * 2.35, targetY, 0],
    }
    camera.position.set(...positions[preset])
    camera.up.set(0, preset === 'top' ? 0 : 1, preset === 'top' ? -1 : 0)
    camera.lookAt(0, targetY, 0)
    controls.current?.target.set(0, targetY, 0)
    controls.current?.update()
    invalidate()
  }, [camera, extent, fit, preset, targetY, invalidate])
  // In the room view, keep the camera in front of the wall.
  const azimuth = realistic ? Math.PI * .49 : Infinity
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} minDistance={extent * .45} maxDistance={extent * 4 * fit} maxPolarAngle={Math.PI * .92} minAzimuthAngle={-azimuth} maxAzimuthAngle={azimuth} />
}

interface Materials { porcelain: Material; side: Material; metal: Material; shadowGap: Material; carcass: Material }

function useMaterials(mode: RenderMode, surface: SurfaceName, finish: string): Materials {
  const texture = useMemo(() => mode === 'realistic' ? makeSurfaceTexture(surface) : null, [mode, surface])
  useEffect(() => () => texture?.dispose(), [texture])
  const materials = useMemo<Materials>(() => {
    const roughness = finish === 'Polished' ? .16 : finish === 'Textured' ? .82 : .5
    if (mode === 'technical') {
      const porcelain = new MeshStandardMaterial({ color: technicalPorcelain, roughness: Math.max(.24, roughness), metalness: .02 })
      return {
        porcelain, side: new MeshStandardMaterial({ color: technicalSide, roughness: Math.max(.24, roughness), metalness: .02 }),
        metal: new MeshStandardMaterial({ color: '#8d8c88', roughness: .35, metalness: .6 }),
        shadowGap: new MeshStandardMaterial({ color: '#343531', roughness: .8 }),
        carcass: new MeshStandardMaterial({ color: '#343531', roughness: .8 }),
      }
    }
    const porcelain = new MeshPhysicalMaterial({
      map: texture, roughness, metalness: 0,
      clearcoat: finish === 'Polished' ? 1 : finish === 'Matt' ? .15 : 0,
      clearcoatRoughness: finish === 'Polished' ? .05 : .4,
      specularIntensity: finish === 'Textured' ? .3 : .6,
    })
    return {
      porcelain, side: porcelain,
      metal: new MeshStandardMaterial({ color: '#d6d3cd', roughness: .32, metalness: 1, envMapIntensity: 1.4 }),
      shadowGap: new MeshStandardMaterial({ color: '#1d1d1b', roughness: 1 }),
      carcass: new MeshStandardMaterial({ color: '#b3aca1', roughness: .7 }),
    }
  }, [mode, texture, finish])
  useEffect(() => () => { new Set(Object.values(materials)).forEach((m) => m.dispose()) }, [materials])
  return materials
}

function Tap({ x, z, wall, spoutReach, metal }: { x: number; z: number; wall: boolean; spoutReach: number; metal: Material }) {
  const mm = (value: number) => value * SCALE
  if (wall) {
    const y = mm(150)
    return <group position={[x, y, z]}>
      <mesh material={metal} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, mm(3)]} castShadow><cylinderGeometry args={[mm(32), mm(32), mm(6), 40]} /></mesh>
      <mesh material={metal} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, spoutReach / 2]} castShadow><cylinderGeometry args={[mm(11), mm(11), spoutReach, 28]} /></mesh>
      <mesh material={metal} position={[0, mm(-6), spoutReach]} castShadow><cylinderGeometry args={[mm(11), mm(11), mm(12), 28]} /></mesh>
    </group>
  }
  const bodyH = mm(170)
  return <group position={[x, 0, z]}>
    <mesh material={metal} position={[0, bodyH / 2, 0]} castShadow><cylinderGeometry args={[mm(16), mm(18), bodyH, 36]} /></mesh>
    <mesh material={metal} rotation={[Math.PI / 2, 0, 0]} position={[0, bodyH - mm(12), mm(80)]} castShadow><cylinderGeometry args={[mm(10), mm(10), mm(160), 28]} /></mesh>
    <mesh material={metal} position={[0, bodyH + mm(8), mm(-12)]} rotation={[-.35, 0, 0]} castShadow><boxGeometry args={[mm(10), mm(8), mm(70)]} /></mesh>
  </group>
}

function TapHandle({ x, z, metal }: { x: number; z: number; metal: Material }) {
  const h = 70 * SCALE
  return <mesh material={metal} position={[x, h / 2, z]} castShadow><cylinderGeometry args={[14 * SCALE, 16 * SCALE, h, 32]} /></mesh>
}

function SinkModel({ g, materials, technical }: { g: SinkGeometry; materials: Materials; technical: boolean }) {
  const d = g.design
  const { porcelain, side, metal, shadowGap, carcass } = materials
  const W = d.overallWidth * SCALE, D = d.overallDepth * SCALE, H = d.overallHeight * SCALE
  const T = Math.max(.035, d.porcelainThickness * SCALE)
  const leftRim = g.edgeLeft * SCALE, rightRim = g.edgeRight * SCALE
  const frontRim = g.edgeFront * SCALE, rearRim = g.edgeBack * SCALE
  const basinW = g.basinWidth * SCALE, basinD = g.basinDepth * SCALE
  const backZ = -D / 2, frontZ = D / 2
  const basinBackZ = backZ + rearRim, basinFrontZ = frontZ - frontRim
  const rearFloorY = -g.bowlDepthRear * SCALE
  const frontFloorY = -g.bowlDepthFront * SCALE
  const basinLeftX = -W / 2 + leftRim
  const basinRightX = W / 2 - rightRim
  const floorVertices = [
    basinLeftX, rearFloorY, basinBackZ, basinRightX, rearFloorY, basinBackZ, basinRightX, frontFloorY, basinFrontZ, basinLeftX, frontFloorY, basinFrontZ,
    basinLeftX, rearFloorY - T, basinBackZ, basinRightX, rearFloorY - T, basinBackZ, basinRightX, frontFloorY - T, basinFrontZ, basinLeftX, frontFloorY - T, basinFrontZ,
  ]
  const leftWallVertices = [
    basinLeftX - T, 0, basinBackZ, basinLeftX, 0, basinBackZ, basinLeftX, 0, basinFrontZ, basinLeftX - T, 0, basinFrontZ,
    basinLeftX - T, rearFloorY, basinBackZ, basinLeftX, rearFloorY, basinBackZ, basinLeftX, frontFloorY, basinFrontZ, basinLeftX - T, frontFloorY, basinFrontZ,
  ]
  const rightWallVertices = [
    basinRightX, 0, basinBackZ, basinRightX + T, 0, basinBackZ, basinRightX + T, 0, basinFrontZ, basinRightX, 0, basinFrontZ,
    basinRightX, rearFloorY, basinBackZ, basinRightX + T, rearFloorY, basinBackZ, basinRightX + T, frontFloorY, basinFrontZ, basinRightX, frontFloorY, basinFrontZ,
  ]
  const drawerWidth = (d.drawerAutoWidth ? d.overallWidth : d.drawerWidth) * SCALE
  const eachBasinW = g.basins[0].width
  const coverWidth3d = (d.coverPlateFullWidth ? eachBasinW : Math.min(eachBasinW, d.coverPlateWidth)) * SCALE
  const drainXs = g.drains.map((drain) => (drain.x - d.overallWidth / 2) * SCALE)
  const drainZ = d.drainPosition === 'Rear' ? basinBackZ + d.drainOffsetBack * SCALE : (basinBackZ + basinFrontZ) / 2
  const drainFloorY = d.drainPosition === 'Rear' ? rearFloorY : (rearFloorY + frontFloorY) / 2
  const deepest = Math.max(-rearFloorY, -frontFloorY)
  const coverDepth3d = d.coverPlateDepth * SCALE
  const coverFrontZ = basinBackZ + coverDepth3d
  const coverJoinProgress = Math.min(1, Math.max(0, coverDepth3d / Math.max(.001, basinD)))
  const coverJoinY = rearFloorY + (frontFloorY - rearFloorY) * coverJoinProgress
  const upstandH = d.upstandEnabled ? d.backUpstandHeight * SCALE : 0
  const holesPerBasin = Math.max(1, Math.round(d.tapHoleCount))
  const spoutIndex = Math.floor((holesPerBasin - 1) / 2)
  const gap = .004
  let drawerTop = -H - d.drawerTopGap * SCALE
  const e = technical

  return <group>
    <Box size={[leftRim, T, D]} position={[-W / 2 + leftRim / 2, -T / 2, 0]} material={porcelain} edges={e} />
    <Box size={[rightRim, T, D]} position={[W / 2 - rightRim / 2, -T / 2, 0]} material={porcelain} edges={e} />
    <Box size={[basinW, T, rearRim]} position={[(leftRim - rightRim) / 2, -T / 2, backZ + rearRim / 2]} material={porcelain} edges={e} />
    <Box size={[basinW, T, frontRim]} position={[(leftRim - rightRim) / 2, -T / 2, frontZ - frontRim / 2]} material={porcelain} edges={e} />

    <Box size={[W, H - T, T]} position={[0, -T - (H - T) / 2, frontZ - T / 2]} material={side} edges={e} />
    <Box size={[T, H - T, D - T * 2]} position={[-W / 2 + T / 2, -T - (H - T) / 2, 0]} material={side} edges={e} />
    <Box size={[T, H - T, D - T * 2]} position={[W / 2 - T / 2, -T - (H - T) / 2, 0]} material={side} edges={e} />
    <Box size={[W, H - T, T]} position={[0, -T - (H - T) / 2, backZ + T / 2]} material={side} edges={e} />

    <SolidMesh vertices={floorVertices} material={porcelain} edges={e} />
    <SolidMesh vertices={leftWallVertices} material={porcelain} edges={e} />
    <SolidMesh vertices={rightWallVertices} material={porcelain} edges={e} />
    <Box size={[basinW, Math.max(T, -rearFloorY), T]} position={[(leftRim - rightRim) / 2, rearFloorY / 2, basinBackZ - T / 2]} material={porcelain} edges={e} />
    <Box size={[basinW, Math.max(T, -frontFloorY), T]} position={[(leftRim - rightRim) / 2, frontFloorY / 2, basinFrontZ + T / 2]} material={porcelain} edges={e} />

    {upstandH > 0 && <Box size={[W, upstandH, T]} position={[0, upstandH / 2, backZ + T / 2]} material={porcelain} edges={e} />}

    {g.basins.slice(1).map((basin, index) => <Box key={`divider-${index}`} size={[g.dividerWidth * SCALE, deepest, basinD]} position={[(basin.x - g.dividerWidth / 2 - d.overallWidth / 2) * SCALE, -deepest / 2, (basinBackZ + basinFrontZ) / 2]} material={porcelain} edges={e} />)}

    {d.drainType === 'Concealed Linear' && drainXs.map((x, index) => <group key={`cover-${index}`}>
      <Box size={[coverWidth3d, T, coverDepth3d]} position={[x, coverJoinY - T / 2 + .003, basinBackZ + coverDepth3d / 2]} material={porcelain} edges={e} />
      {e
        ? <Line points={[[x - coverWidth3d / 2, coverJoinY + .008, coverFrontZ], [x + coverWidth3d / 2, coverJoinY + .008, coverFrontZ]]} color="#62635e" lineWidth={1} />
        : <Box size={[coverWidth3d, .006, gap * 1.5]} position={[x, coverJoinY - .002, coverFrontZ + gap]} material={shadowGap} />}
    </group>)}
    {e && d.baseType === 'Sloped Front to Back' && <Line points={[[0, frontFloorY + .028, basinFrontZ - .08], [0, rearFloorY + .028, basinBackZ + .08]]} color="#73746e" lineWidth={1.4} />}
    {d.drainType === 'Linear' && drainXs.map((x, index) => <Box key={`linear-${index}`} size={[Math.min(d.drainLength, eachBasinW) * SCALE, .01, d.drainWidth * SCALE]} position={[x, drainFloorY + .004, drainZ + d.drainWidth * SCALE / 2]} material={e ? shadowGap : metal} />)}
    {d.drainType === 'Circular' && drainXs.map((x, index) => <group key={`round-${index}`} position={[x, drainFloorY + .006, drainZ]}>
      <mesh material={e ? shadowGap : metal} receiveShadow><cylinderGeometry args={[d.drainDiameter * SCALE / 2, d.drainDiameter * SCALE / 2, .008, 40]} /></mesh>
      {!e && <mesh position={[0, .0045, 0]} material={shadowGap}><cylinderGeometry args={[d.drainDiameter * SCALE * .32, d.drainDiameter * SCALE * .32, .002, 32]} /></mesh>}
    </group>)}

    {d.tapType === 'Deck Mounted' && g.tapHoles.map((hole, index) => {
      const x = (hole.x - d.overallWidth / 2) * SCALE
      const z = backZ + hole.y * SCALE
      if (e) return <mesh key={index} position={[x, .006, z]} material={shadowGap}><cylinderGeometry args={[d.tapHoleDiameter * SCALE / 2, d.tapHoleDiameter * SCALE / 2, .018, 28]} /></mesh>
      return index % holesPerBasin === spoutIndex
        ? <Tap key={index} x={x} z={z} wall={false} spoutReach={0} metal={metal} />
        : <TapHandle key={index} x={x} z={z} metal={metal} />
    })}
    {d.tapType === 'Wall Mounted' && !e && g.tapHoles.map((hole, index) => <Tap key={index} x={(hole.x - d.overallWidth / 2) * SCALE} z={backZ} wall spoutReach={rearRim + 90 * SCALE} metal={metal} />)}

    {d.drawersEnabled && d.drawerHeights.slice(0, d.drawerCount).map((heightMm, index) => {
      const drawerH = heightMm * SCALE
      const y = drawerTop - drawerH / 2
      drawerTop -= drawerH + d.drawerGap * SCALE
      return <group key={index}>
        <Box size={[drawerWidth, drawerH - gap, d.drawerDepth * SCALE - T]} position={[0, y, frontZ - T - (d.drawerDepth * SCALE - T) / 2]} material={e ? carcass : d.vanityCladding ? porcelain : carcass} edges={e} />
        <Box size={[drawerWidth, drawerH - gap, T]} position={[0, y, frontZ + .006]} material={porcelain} edges={e} />
      </group>
    })}
  </group>
}

function Room({ backZ, floorY }: { backZ: number; floorY: number }) {
  return <group>
    <mesh position={[0, floorY + 6, backZ - .001]} receiveShadow><planeGeometry args={[40, 16]} /><meshStandardMaterial color="#cdc5b9" roughness={.96} /></mesh>
    <mesh position={[0, floorY, backZ + 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 20]} /><meshStandardMaterial color="#a99d8d" roughness={.85} /></mesh>
  </group>
}

export function ThreeDPreview({ g, onCanvas }: { g: SinkGeometry; onCanvas?: (canvas: HTMLCanvasElement) => void }) {
  const [preset, setPreset] = useState<ViewPreset>('perspective')
  const [mode, setMode] = useState<RenderMode>('realistic')
  const [surface, setSurfaceState] = useState<SurfaceName>(() => {
    try { const saved = localStorage.getItem(SURFACE_KEY); return saved && saved in SURFACES ? saved as SurfaceName : 'Calacatta' } catch { return 'Calacatta' }
  })
  const setSurface = (next: SurfaceName) => { setSurfaceState(next); try { localStorage.setItem(SURFACE_KEY, next) } catch { /* storage unavailable */ } }
  const d = g.design
  const realistic = mode === 'realistic'
  const materials = useMaterials(mode, surface, d.finish)
  const totalDrawerHeight = d.drawersEnabled ? d.drawerTopGap + d.drawerHeights.slice(0, d.drawerCount).reduce((sum, height) => sum + height, 0) + Math.max(0, d.drawerCount - 1) * d.drawerGap : 0
  const totalHeight = (d.overallHeight + totalDrawerHeight) * SCALE
  const extent = useMemo(() => Math.max(d.overallWidth * SCALE, d.overallDepth * SCALE, totalHeight, 2.5), [d.overallDepth, d.overallWidth, totalHeight])
  const targetY = -totalHeight * .42
  const backZ = -d.overallDepth * SCALE / 2
  const floorY = -Math.max(RIM_HEIGHT_MM * SCALE, totalHeight + .02)
  const calculatedFall = Math.abs(g.bowlDepthRear - g.bowlDepthFront)
  const fallDirection = g.bowlDepthRear > g.bowlDepthFront ? 'rear' : g.bowlDepthFront > g.bowlDepthRear ? 'front' : 'level'
  const shadowSpan = extent * 1.6

  return <div className="preview-3d">
    <div className="view-3d-controls" aria-label="3D camera views">
      {(['perspective', 'front', 'top', 'side'] as ViewPreset[]).map((view) => <button key={view} className={preset === view ? 'active' : ''} aria-pressed={preset === view} onClick={() => setPreset(view)}>{view}</button>)}
    </div>
    <div className="view-3d-options">
      <div className="view-3d-controls static" role="group" aria-label="Render style">
        <button className={realistic ? 'active' : ''} aria-pressed={realistic} onClick={() => setMode('realistic')}>Realistic</button>
        <button className={!realistic ? 'active' : ''} aria-pressed={!realistic} onClick={() => setMode('technical')}>Technical</button>
      </div>
      {realistic && <label className="surface-select"><span>Surface</span>
        <select value={surface} onChange={(event) => setSurface(event.target.value as SurfaceName)}>{Object.keys(SURFACES).map((name) => <option key={name}>{name}</option>)}</select>
      </label>}
    </div>
    <div className="view-3d-help">{realistic ? `Visual only · ${d.finish.toLowerCase()} finish · ` : ''}Drag to rotate · Wheel to zoom</div>
    {d.baseType === 'Sloped Front to Back' && <div className="fall-3d-indicator"><span>Base fall</span><strong>{Math.round(calculatedFall)} mm {fallDirection === 'level' ? 'level' : `to ${fallDirection}`}</strong></div>}
    <Canvas shadows dpr={[1, 2]} frameloop="demand" gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 32, near: .01, far: 120 }} onCreated={({ gl }) => onCanvas?.(gl.domElement)} fallback={<div className="webgl-fallback">3D preview is unavailable in this browser.</div>}>
      <color attach="background" args={[realistic ? '#cfc8bd' : '#f3f3ef']} />
      {realistic ? <>
        <Environment resolution={256} environmentIntensity={.75}>
          <color attach="background" args={['#b9b3aa']} />
          <Lightformer form="rect" intensity={3} position={[0, 6, 3]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 6, 1]} />
          <Lightformer form="rect" intensity={1.4} position={[-6, 2, 4]} rotation={[0, Math.PI / 3, 0]} scale={[4, 6, 1]} />
          <Lightformer form="rect" intensity={.8} position={[6, 1, 2]} rotation={[0, -Math.PI / 2.5, 0]} scale={[3, 5, 1]} />
          <Lightformer form="rect" intensity={.5} color="#f3e6d2" position={[0, -3, 6]} rotation={[-Math.PI / 4, 0, 0]} scale={[10, 3, 1]} />
        </Environment>
        <ambientLight intensity={.12} />
        <directionalLight position={[1.6, 10, 3.6]} intensity={2.1} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.0003} shadow-normalBias={.02} shadow-radius={7}
          shadow-camera-left={-shadowSpan} shadow-camera-right={shadowSpan} shadow-camera-top={shadowSpan} shadow-camera-bottom={-shadowSpan} shadow-camera-near={.5} shadow-camera-far={30} />
        <Room backZ={backZ} floorY={floorY} />
      </> : <>
        <ambientLight intensity={1.5} />
        <directionalLight position={[6, 9, 7]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-5, 3, -4]} intensity={.7} />
        <Grid position={[0, -totalHeight - .06, 0]} args={[extent * 2.6, extent * 2.6]} cellSize={.25} cellThickness={.35} cellColor="#b8b9b3" sectionSize={1} sectionThickness={.65} sectionColor="#8e8f89" fadeDistance={extent * 2.2} fadeStrength={1.4} infiniteGrid />
      </>}
      <SinkModel g={g} materials={materials} technical={!realistic} />
      <CameraControls preset={preset} extent={extent} targetY={targetY} realistic={realistic} />
    </Canvas>
  </div>
}
