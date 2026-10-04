import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Edges, Environment, Grid, Lightformer, Line, OrbitControls } from '@react-three/drei'
import {
  BoxGeometry, BufferGeometry, CanvasTexture, ExtrudeGeometry, Float32BufferAttribute, MeshPhysicalMaterial, MeshStandardMaterial,
  MirroredRepeatWrapping, Path, PCFShadowMap, RepeatWrapping, SRGBColorSpace, Shape, TextureLoader, type Group, type Material, type Texture,
} from 'three'
import { EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { describeFall, type SinkGeometry } from '../lib/sinkGeometry'

type Vec3 = [number, number, number]
type ViewPreset = 'perspective' | 'front' | 'top' | 'side'
type RenderMode = 'realistic' | 'technical'

const SCALE = 1 / 200
/** Visual only: height of the sink rim above the floor used to place the room. */
const RIM_HEIGHT_MM = 860
/** World size of one procedural texture tile (2.4 m), so typical sinks show no repeat. */
const TEXTURE_TILE = 2400 * SCALE
/** Visual only: each slab photo is mapped to a full 3200 × 1600 mm slab so vein scale is true to life. */
const SLAB_MM = { width: 3200, height: 1600 }

/** Slab photographs from the Artiling tile library (public/slabs). */
const SLAB_SURFACES = {
  Statuario: { url: '/slabs/statuario-marble-effect-porcelain-slab.webp', group: 'White marble' },
  'Calacatta Gold': { url: '/slabs/calacatta-gold.webp', group: 'White marble' },
  'Calacatta Macchia': { url: '/slabs/calacatta-macchia-marble-effect-porcelain-slab.webp', group: 'White marble' },
  Arabescato: { url: '/slabs/arabescato-marble-effect-porcelain-slab.webp', group: 'White marble' },
  'Bianco Carrara': { url: '/slabs/bianco-carrara-marble-effect-porcelain-slab.webp', group: 'White marble' },
  'Invisible White': { url: '/slabs/invisible-white-marble-effect-porcelain-slab.webp', group: 'White marble' },
  'Lux Viola': { url: '/slabs/lux-viola-marble-effect-porcelain-slab.webp', group: 'White marble' },
  'Calacatta Viola': { url: '/slabs/calacatta-viola-marble-effect-porcelain-slab.webp', group: 'White marble' },
  'Breccia Capraia': { url: '/slabs/breccia-capraia-marble-effect-porcelain-slab.webp', group: 'White marble' },
  'Taj Mahal': { url: '/slabs/taj-mahal-quartzite-effect-porcelain-slab.webp', group: 'Warm stone' },
  Patagonia: { url: '/slabs/patagonia-quartzite-effect-porcelain-slab.webp', group: 'Warm stone' },
  'Ivory Limestone': { url: '/slabs/ivory-limestone.webp', group: 'Warm stone' },
  'Classic Travertine': { url: '/slabs/classic-travertine.webp', group: 'Warm stone' },
  'Silver Travertine': { url: '/slabs/silver-travertine.webp', group: 'Warm stone' },
  Terrazzo: { url: '/slabs/terrazzo.webp', group: 'Warm stone' },
  'Ceppo di Gre': { url: '/slabs/ceppo-di-gre.webp', group: 'Grey & concrete' },
  'Pietra Grey': { url: '/slabs/pietra-grey.webp', group: 'Grey & concrete' },
  'Warm Concrete': { url: '/slabs/warm-concrete.webp', group: 'Grey & concrete' },
  'Fior di Bosco': { url: '/slabs/fior-di-bosco-marble-effect-porcelain-slab.webp', group: 'Dark' },
  'Marron Imperial': { url: '/slabs/marron-imperial-marble-effect-porcelain-slab.webp', group: 'Dark' },
  'Nero Marquina': { url: '/slabs/nero-marquina.webp', group: 'Dark' },
  'Sahara Noir': { url: '/slabs/sahara-noir-marble-effect-porcelain-slab.webp', group: 'Dark' },
  'Antique Black': { url: '/slabs/antique-black-gemstone-effect-porcelain-slab.webp', group: 'Dark' },
  'Blue Onyx': { url: '/slabs/blue-onyx.webp', group: 'Colour' },
  'Green Onyx': { url: '/slabs/green-onyx.webp', group: 'Colour' },
  'Verde Alpi': { url: '/slabs/verde-alpi-marble-effect-porcelain-slab.webp', group: 'Colour' },
  'Rosso Levanto': { url: '/slabs/rosso-levanto-marble-effect-porcelain-slab.webp', group: 'Colour' },
} as const
const SURFACE_GROUPS = ['White marble', 'Warm stone', 'Grey & concrete', 'Dark', 'Colour'] as const
const PLAIN_WHITE = { base: '#ebe6de', vein: '', veins: 0, cloud: 0.035 }
type SurfaceName = keyof typeof SLAB_SURFACES | 'Plain white'
const SURFACE_NAMES = [...Object.keys(SLAB_SURFACES), 'Plain white'] as SurfaceName[]
const SURFACE_KEY = 'artiling-3d-surface'

const technicalPorcelain = '#dedbd4'
const technicalSide = '#c9c5bd'

function seeded(seed: number) {
  let s = seed >>> 0
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** Procedural porcelain slab texture. Deterministic per surface so renders are repeatable. */
function makeSurfaceTexture(spec: { base: string; vein: string; veins: number; cloud: number }): CanvasTexture {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = seeded(spec.base.length * 7919 + spec.veins * 31 + 17)
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
 * UVs are world coordinates (1 unit = 200 mm); each texture's repeat converts
 * them to its own physical size, centred on the sink.
 *
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
    uv[i * 2] = u
    uv[i * 2 + 1] = v
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

/**
 * Basin floor that falls from all four walls to a drain: four flat facets
 * meeting at the drain, so the valley lines read like a wet-room tray.
 */
function FunnelFloor({ x0, x1, z0, z1, wallY, drain, thickness, material, edges }: { x0: number; x1: number; z0: number; z1: number; wallY: number; drain: Vec3; thickness: number; material: Material; edges: boolean }) {
  const key = [x0, x1, z0, z1, wallY, ...drain, thickness].map((n) => n.toFixed(5)).join(',')
  const geometry = useMemo(() => {
    const top = [[x0, wallY, z0], [x1, wallY, z0], [x1, wallY, z1], [x0, wallY, z1]]
    const apex = drain
    const below = (p: number[]) => [p[0], p[1] - thickness, p[2]]
    const positions: number[] = []
    for (let i = 0; i < 4; i++) {
      const a = top[i], b = top[(i + 1) % 4]
      positions.push(...a, ...apex, ...b) // upper facet, normal up
      positions.push(...below(a), ...below(b), ...below(apex)) // underside
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geo.computeVertexNormals()
    applyWorldUVs(geo, [0, 0, 0])
    return geo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow>
    {edges && <Edges threshold={1} color="#73746e" />}
  </mesh>
}

/**
 * One-piece top deck with the basin opening(s) cut out, so the rim reads as a
 * single mitred slab rather than four separate strips.
 */
function DeckSlab({ width, depth, thickness, holes, material, edges }: { width: number; depth: number; thickness: number; holes: { x0: number; x1: number; z0: number; z1: number }[]; material: Material; edges: boolean }) {
  const key = [width, depth, thickness, ...holes.flatMap((h) => [h.x0, h.x1, h.z0, h.z1])].map((n) => n.toFixed(5)).join(',')
  const geometry = useMemo(() => {
    // Shape y is world -z; the extrusion becomes world y after rotating onto the deck plane.
    const shape = new Shape()
    shape.moveTo(-width / 2, -depth / 2); shape.lineTo(width / 2, -depth / 2); shape.lineTo(width / 2, depth / 2); shape.lineTo(-width / 2, depth / 2); shape.closePath()
    for (const h of holes) {
      const hole = new Path()
      hole.moveTo(h.x0, -h.z1); hole.lineTo(h.x0, -h.z0); hole.lineTo(h.x1, -h.z0); hole.lineTo(h.x1, -h.z1); hole.closePath()
      shape.holes.push(hole)
    }
    const geo = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, -thickness, 0)
    geo.computeVertexNormals()
    applyWorldUVs(geo, [0, 0, 0])
    return geo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow>
    {edges && <Edges threshold={15} color="#595a55" />}
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

function scaleTexture(texture: Texture, widthUnits: number, heightUnits: number) {
  texture.repeat.set(1 / widthUnits, 1 / heightUnits)
  texture.offset.set(.5, .5)
  texture.needsUpdate = true
  return texture
}

/** Loads the selected slab photo, falling back to a plain procedural surface while it loads. */
function useSurfaceTexture(active: boolean, surface: SurfaceName): Texture | null {
  const plain = useMemo(() => active ? scaleTexture(makeSurfaceTexture(PLAIN_WHITE), TEXTURE_TILE, TEXTURE_TILE) : null, [active])
  const [photo, setPhoto] = useState<{ name: SurfaceName; texture: Texture } | null>(null)
  useEffect(() => {
    if (!active || surface === 'Plain white') return
    let cancelled = false
    new TextureLoader().load(SLAB_SURFACES[surface].url, (texture) => {
      if (cancelled) { texture.dispose(); return }
      texture.colorSpace = SRGBColorSpace
      texture.wrapS = texture.wrapT = MirroredRepeatWrapping
      texture.anisotropy = 8
      setPhoto({ name: surface, texture: scaleTexture(texture, SLAB_MM.width * SCALE, SLAB_MM.height * SCALE) })
    })
    return () => { cancelled = true }
  }, [active, surface])
  useEffect(() => () => photo?.texture.dispose(), [photo])
  useEffect(() => () => plain?.dispose(), [plain])
  if (!active) return null
  return photo && photo.name === surface ? photo.texture : plain
}

function useMaterials(mode: RenderMode, surface: SurfaceName, finish: string): Materials {
  const texture = useSurfaceTexture(mode === 'realistic', surface)
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
  const { porcelain, side, metal, shadowGap } = materials
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
  // Inner walls sit under the deck; where a rim is only the porcelain thickness the outer panel is the basin wall.
  const hasInner = (rim: number) => rim > T + .0005
  const leftWallVertices = [
    basinLeftX - T, -T, basinBackZ, basinLeftX, -T, basinBackZ, basinLeftX, -T, basinFrontZ, basinLeftX - T, -T, basinFrontZ,
    basinLeftX - T, rearFloorY, basinBackZ, basinLeftX, rearFloorY, basinBackZ, basinLeftX, frontFloorY, basinFrontZ, basinLeftX - T, frontFloorY, basinFrontZ,
  ]
  const rightWallVertices = [
    basinRightX, -T, basinBackZ, basinRightX + T, -T, basinBackZ, basinRightX + T, -T, basinFrontZ, basinRightX, -T, basinFrontZ,
    basinRightX, rearFloorY, basinBackZ, basinRightX + T, rearFloorY, basinBackZ, basinRightX + T, frontFloorY, basinFrontZ, basinRightX, frontFloorY, basinFrontZ,
  ]
  const eachBasinW = g.basins[0].width
  // The concealed-drain lid always runs the full internal width of each basin.
  const coverWidth3d = eachBasinW * SCALE
  const deckHoles = g.basins.map((basin) => ({ x0: (basin.x - d.overallWidth / 2) * SCALE, x1: (basin.x + basin.width - d.overallWidth / 2) * SCALE, z0: basinBackZ, z1: basinFrontZ }))
  const drainXs = g.drains.map((drain) => (drain.x - d.overallWidth / 2) * SCALE)
  const drainZ = d.drainPosition === 'Rear' ? basinBackZ + d.drainOffsetBack * SCALE : (basinBackZ + basinFrontZ) / 2
  const drainFloorY = -g.bowlDepthDrain * SCALE
  const funnel = g.fallToDrain
  const deepest = Math.max(-rearFloorY, -frontFloorY, g.bowlDepthDrain * SCALE)
  const coverDepth3d = d.coverPlateDepth * SCALE
  const coverFrontZ = basinBackZ + coverDepth3d
  const coverJoinProgress = Math.min(1, Math.max(0, coverDepth3d / Math.max(.001, basinD)))
  const coverJoinY = rearFloorY + (frontFloorY - rearFloorY) * coverJoinProgress
  const upstandH = d.upstandEnabled ? d.backUpstandHeight * SCALE : 0
  const holesPerBasin = Math.max(1, Math.round(d.tapHoleCount))
  const spoutIndex = Math.floor((holesPerBasin - 1) / 2)
  const gap = .004
  const e = technical

  return <group>
    <DeckSlab width={W} depth={D} thickness={T} holes={deckHoles} material={porcelain} edges={e} />

    <Box size={[W, H - T, T]} position={[0, -T - (H - T) / 2, frontZ - T / 2]} material={side} edges={e} />
    <Box size={[T, H - T, D - T * 2]} position={[-W / 2 + T / 2, -T - (H - T) / 2, 0]} material={side} edges={e} />
    <Box size={[T, H - T, D - T * 2]} position={[W / 2 - T / 2, -T - (H - T) / 2, 0]} material={side} edges={e} />
    <Box size={[W, H - T, T]} position={[0, -T - (H - T) / 2, backZ + T / 2]} material={side} edges={e} />

    {funnel
      ? g.basins.map((basin, index) => <FunnelFloor key={`floor-${index}`} x0={(basin.x - d.overallWidth / 2) * SCALE} x1={(basin.x + basin.width - d.overallWidth / 2) * SCALE} z0={basinBackZ} z1={basinFrontZ}
        wallY={rearFloorY} drain={[drainXs[index], drainFloorY, drainZ]} thickness={T} material={porcelain} edges={e} />)
      : <SolidMesh vertices={floorVertices} material={porcelain} edges={e} />}
    {hasInner(leftRim) && <SolidMesh vertices={leftWallVertices} material={porcelain} edges={e} />}
    {hasInner(rightRim) && <SolidMesh vertices={rightWallVertices} material={porcelain} edges={e} />}
    {hasInner(rearRim) && <Box size={[basinW, Math.max(.001, -rearFloorY - T), T]} position={[(leftRim - rightRim) / 2, (rearFloorY - T) / 2, basinBackZ - T / 2]} material={porcelain} edges={e} />}
    {hasInner(frontRim) && <Box size={[basinW, Math.max(.001, -frontFloorY - T), T]} position={[(leftRim - rightRim) / 2, (frontFloorY - T) / 2, basinFrontZ + T / 2]} material={porcelain} edges={e} />}

    {upstandH > 0 && <Box size={[W, upstandH, T]} position={[0, upstandH / 2, backZ + T / 2]} material={porcelain} edges={e} />}

    {g.basins.slice(1).map((basin, index) => <Box key={`divider-${index}`} size={[g.dividerWidth * SCALE, Math.max(.001, deepest - T), basinD]} position={[(basin.x - g.dividerWidth / 2 - d.overallWidth / 2) * SCALE, -T - (deepest - T) / 2, (basinBackZ + basinFrontZ) / 2]} material={porcelain} edges={e} />)}

    {d.drainType === 'Concealed Linear' && drainXs.map((x, index) => <group key={`cover-${index}`}>
      <Box size={[coverWidth3d, T, coverDepth3d]} position={[x, coverJoinY - T / 2 + .003, basinBackZ + coverDepth3d / 2]} material={porcelain} edges={e} />
      {e
        ? <Line points={[[x - coverWidth3d / 2, coverJoinY + .008, coverFrontZ], [x + coverWidth3d / 2, coverJoinY + .008, coverFrontZ]]} color="#62635e" lineWidth={1} />
        : <Box size={[coverWidth3d, .006, gap * 1.5]} position={[x, coverJoinY - .002, coverFrontZ + gap]} material={shadowGap} />}
    </group>)}
    {e && d.baseType === 'Sloped Front to Back' && !funnel && <Line points={[[0, frontFloorY + .028, basinFrontZ - .08], [0, rearFloorY + .028, basinBackZ + .08]]} color="#73746e" lineWidth={1.4} />}
    {d.drainType === 'Linear' && drainXs.map((x, index) => <Box key={`linear-${index}`} size={[Math.min(d.drainLength, eachBasinW) * SCALE, .01, d.drainWidth * SCALE]} position={[x, drainFloorY + .004, drainZ + d.drainWidth * SCALE / 2]} material={e ? shadowGap : metal} />)}
    {d.drainType === 'Circular' && drainXs.map((x, index) => <group key={`round-${index}`} position={[x, drainFloorY + (funnel ? .012 : .006), drainZ]}>
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

    {d.drawersEnabled && <Vanity g={g} materials={materials} technical={e} />}
  </group>
}

/** Push-to-open, soft-close drawer: eases open or closed when clicked. */
function Drawer({ index, y, height, innerWidth, depth, frontZ, T, open, onToggle, materials, trayMaterials, technical }: {
  index: number; y: number; height: number; innerWidth: number; depth: number; frontZ: number; T: number; open: boolean
  onToggle: (index: number) => void; materials: Materials; trayMaterials: { bottom: Material; sides: Material }; technical: boolean
}) {
  const group = useRef<Group>(null)
  const { invalidate, gl } = useThree()
  const travel = Math.max(0, depth - T) * .72
  /** 3 mm shadow gap around each handle-less front. */
  const gap = 3 * SCALE
  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const target = open ? travel : 0
    const diff = target - g.position.z
    if (Math.abs(diff) < .0005) { g.position.z = target; return }
    // Soft-close style ease: fast start, gentle stop.
    g.position.z += diff * Math.min(1, delta * 7)
    invalidate()
  })
  useEffect(() => { invalidate() }, [open, invalidate])
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 4) return // ignore orbit drags
    onToggle(index)
  }
  const trayDepth = Math.max(.05, depth - T - .06)
  const trayH = Math.max(.04, height * .62)
  const trayW = innerWidth - .05
  const trayBottomY = y - height / 2 + .03
  const trayZ = frontZ - T - trayDepth / 2 - .005
  const wall = .012
  return <group ref={group} onClick={click}
    onPointerOver={(event) => { event.stopPropagation(); gl.domElement.style.cursor = 'pointer' }}
    onPointerOut={() => { gl.domElement.style.cursor = '' }}>
    <Box size={[innerWidth - gap * 2, height - gap, T]} position={[0, y, frontZ - T / 2]} material={materials.porcelain} edges={technical} />
    <Box size={[trayW, wall, trayDepth]} position={[0, trayBottomY, trayZ]} material={trayMaterials.bottom} />
    <Box size={[wall, trayH, trayDepth]} position={[-trayW / 2 + wall / 2, trayBottomY + trayH / 2, trayZ]} material={trayMaterials.sides} />
    <Box size={[wall, trayH, trayDepth]} position={[trayW / 2 - wall / 2, trayBottomY + trayH / 2, trayZ]} material={trayMaterials.sides} />
    <Box size={[trayW, trayH, wall]} position={[0, trayBottomY + trayH / 2, trayZ - trayDepth / 2 + wall / 2]} material={trayMaterials.sides} />
  </group>
}

/**
 * Wall-hung vanity: porcelain-clad sides and underside, handle-less
 * push-to-open drawers that open on click to show the drawer box.
 */
function Vanity({ g, materials, technical }: { g: SinkGeometry; materials: Materials; technical: boolean }) {
  const d = g.design
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const trayMaterials = useMemo(() => ({
    bottom: new MeshStandardMaterial({ color: '#d8d2c8', roughness: .7 }),
    sides: new MeshStandardMaterial({ color: '#8e8c88', roughness: .38, metalness: .7 }),
  }), [])
  useEffect(() => () => { trayMaterials.bottom.dispose(); trayMaterials.sides.dispose() }, [trayMaterials])
  const T = Math.max(.035, d.porcelainThickness * SCALE)
  const H = d.overallHeight * SCALE
  const D = d.overallDepth * SCALE
  const frontZ = D / 2
  const width = g.drawerWidth * SCALE
  const depth = Math.min(d.drawerDepth, d.overallDepth) * SCALE
  const heights = d.drawerHeights.slice(0, d.drawerCount).map((h) => h * SCALE)
  const topGap = d.drawerTopGap * SCALE
  const between = d.drawerGap * SCALE
  const bodyH = heights.reduce((sum, h) => sum + h, 0) + between * Math.max(0, heights.length - 1)
  const top = -H - topGap
  const centreY = top - bodyH / 2
  const backZ = frontZ - depth
  const innerWidth = width - T * 2
  let cursor = top
  const rows = heights.map((h) => { const y = cursor - h / 2; cursor -= h + between; return { y, h } })
  const clad = technical ? materials.carcass : materials.porcelain
  return <group>
    {/* Porcelain-clad sides run the full depth; the underside is clad as the unit is wall-hung. */}
    <Box size={[T, bodyH, depth]} position={[-width / 2 + T / 2, centreY, frontZ - depth / 2]} material={clad} edges={technical} />
    <Box size={[T, bodyH, depth]} position={[width / 2 - T / 2, centreY, frontZ - depth / 2]} material={clad} edges={technical} />
    <Box size={[width, T, depth]} position={[0, top - bodyH - T / 2, frontZ - depth / 2]} material={clad} edges={technical} />
    <Box size={[innerWidth, bodyH, T / 2]} position={[0, centreY, backZ + T / 4]} material={materials.carcass} />
    {topGap > 0 && <Box size={[width, topGap, depth]} position={[0, top + topGap / 2, frontZ - depth / 2]} material={materials.shadowGap} />}
    {rows.map((row, index) => <Drawer key={index} index={index} y={row.y} height={row.h} innerWidth={innerWidth} depth={depth} frontZ={frontZ} T={T}
      open={openIndex === index} onToggle={(i) => setOpenIndex((current) => current === i ? null : i)} materials={materials} trayMaterials={trayMaterials} technical={technical} />)}
  </group>
}

interface TileSpec {
  /** Tile size in mm. */
  tileW: number
  tileH: number
  base: string
  /** Per-tile brightness variation, 0–1. */
  variation: number
  vein: string
  grout: string
  seed: number
}

/** Procedural large-format porcelain tiling: 2 × 2 tiles per texture, with grout joints. */
function makeTileTexture(spec: TileSpec): CanvasTexture {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const rand = seeded(spec.seed)
  const cols = 2, rows = 2
  const tw = size / cols, th = size / rows
  const groutPx = Math.max(1.5, 2 / spec.tileW * tw)
  ctx.fillStyle = spec.grout
  ctx.fillRect(0, 0, size, size)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * tw, y = r * th
    ctx.save()
    ctx.beginPath(); ctx.rect(x + groutPx / 2, y + groutPx / 2, tw - groutPx, th - groutPx); ctx.clip()
    ctx.fillStyle = spec.base
    ctx.fillRect(x, y, tw, th)
    const shade = (rand() - .5) * spec.variation
    ctx.fillStyle = shade > 0 ? `rgba(255,255,255,${shade})` : `rgba(40,32,24,${-shade})`
    ctx.fillRect(x, y, tw, th)
    for (let i = 0; i < 70; i++) {
      const cx = x + rand() * tw, cy = y + rand() * th, rad = 20 + rand() * 90
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      gradient.addColorStop(0, rand() > .5 ? 'rgba(255,255,255,.05)' : 'rgba(60,50,40,.05)')
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
    }
    if (spec.vein) for (let v = 0; v < 2; v++) {
      ctx.strokeStyle = `rgba(${spec.vein},.12)`
      ctx.lineWidth = 1 + rand() * 1.5
      ctx.beginPath()
      let px = x - 10, py = y + rand() * th
      ctx.moveTo(px, py)
      while (px < x + tw + 10) { px += 8 + rand() * 8; py += (rand() - .5) * 10; ctx.lineTo(px, py) }
      ctx.stroke()
    }
    ctx.restore()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 8
  return texture
}

const WALL_TILE: TileSpec = { tileW: 1200, tileH: 600, base: '#d8d5cf', variation: .05, vein: '150,138,120', grout: '#b6b1a9', seed: 11 }
const FLOOR_TILE: TileSpec = { tileW: 1200, tileH: 1200, base: '#8b8378', variation: .08, vein: '70,62,54', grout: '#6c655c', seed: 29 }

/** Bathroom context: tiled back wall and floor, sized in world units (1 = 200 mm). */
function Room({ backZ, floorY }: { backZ: number; floorY: number }) {
  const wallW = 40, wallH = 16, floorD = 20
  const wall = useMemo(() => {
    const t = makeTileTexture(WALL_TILE)
    const periodX = WALL_TILE.tileW * 2 * SCALE, periodY = WALL_TILE.tileH * 2 * SCALE
    t.repeat.set(wallW / periodX, wallH / periodY)
    // Centre a tile on the sink and start the first course at the floor.
    t.offset.set(.25 - ((wallW / 2 / periodX) % .5), 0)
    return t
  }, [])
  const floor = useMemo(() => {
    const t = makeTileTexture(FLOOR_TILE)
    const period = FLOOR_TILE.tileW * 2 * SCALE
    t.repeat.set(wallW / period, floorD / period)
    t.offset.set(.25 - ((wallW / 2 / period) % .5), 0)
    return t
  }, [])
  useEffect(() => () => { wall.dispose(); floor.dispose() }, [wall, floor])
  return <group>
    <mesh position={[0, floorY + wallH / 2, backZ - .001]} receiveShadow>
      <planeGeometry args={[wallW, wallH]} />
      <meshPhysicalMaterial map={wall} roughness={.55} clearcoat={.1} clearcoatRoughness={.5} />
    </mesh>
    <mesh position={[0, floorY, backZ + floorD / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[wallW, floorD]} />
      <meshPhysicalMaterial map={floor} roughness={.42} clearcoat={.25} clearcoatRoughness={.35} />
    </mesh>
  </group>
}

export function ThreeDPreview({ g, onCanvas }: { g: SinkGeometry; onCanvas?: (canvas: HTMLCanvasElement) => void }) {
  const [preset, setPreset] = useState<ViewPreset>('perspective')
  const [mode, setMode] = useState<RenderMode>('realistic')
  const [surface, setSurfaceState] = useState<SurfaceName>(() => {
    try { const saved = localStorage.getItem(SURFACE_KEY) as SurfaceName | null; return saved && SURFACE_NAMES.includes(saved) ? saved : 'Statuario' } catch { return 'Statuario' }
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
  // Freestanding units stand on the floor (overall height is floor to rim); others hang at a typical rim height.
  const floorY = d.mountingType === 'Freestanding' ? -totalHeight - .0005 : -Math.max(RIM_HEIGHT_MM * SCALE, totalHeight + .02)
  const { fall: calculatedFall, to: fallDirection } = describeFall(g)
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
        <select value={surface} onChange={(event) => setSurface(event.target.value as SurfaceName)}>{SURFACE_GROUPS.map((group) => <optgroup key={group} label={group}>
          {(Object.keys(SLAB_SURFACES) as (keyof typeof SLAB_SURFACES)[]).filter((name) => SLAB_SURFACES[name].group === group).map((name) => <option key={name}>{name}</option>)}
        </optgroup>)}
        <option>Plain white</option></select>
      </label>}
    </div>
    <div className="view-3d-help">{realistic ? `Visual only · ${d.finish.toLowerCase()} finish · ` : ''}{d.drawersEnabled ? 'Click a drawer to open · ' : ''}Drag to rotate · Wheel to zoom</div>
    {d.baseType === 'Sloped Front to Back' && <div className="fall-3d-indicator"><span>Base fall</span><strong>{calculatedFall} mm {fallDirection === 'level' ? 'level' : `to ${fallDirection}`}</strong></div>}
    <Canvas shadows={{ type: PCFShadowMap }} dpr={[1, 2]} frameloop="demand" gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 32, near: .01, far: 120 }} onCreated={({ gl }) => onCanvas?.(gl.domElement)} fallback={<div className="webgl-fallback">3D preview is unavailable in this browser.</div>}>
      <color attach="background" args={[realistic ? '#cfc8bd' : '#f3f3ef']} />
      {realistic ? <>
        {/* Room-like reflections: soft ceiling light, a window to the left, warm bounce from the floor. */}
        <Environment resolution={512} environmentIntensity={1.15}>
          <color attach="background" args={['#a8a198']} />
          <Lightformer form="rect" intensity={2.2} position={[0, 7, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 5, 1]} />
          <Lightformer form="rect" intensity={5} color="#fffaf4" position={[-9, 3, 3]} rotation={[0, Math.PI / 2, 0]} scale={[5, 7, 1]} />
          <Lightformer form="rect" intensity={.9} position={[8, 2, 4]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 5, 1]} />
          <Lightformer form="rect" intensity={.6} color="#e6ddd1" position={[0, -4, 5]} rotation={[-Math.PI / 2, 0, 0]} scale={[12, 6, 1]} />
          <Lightformer form="rect" intensity={.7} position={[0, 2, 10]} rotation={[0, Math.PI, 0]} scale={[10, 5, 1]} />
        </Environment>
        <hemisphereLight args={['#fbf6ef', '#8a8176', .55]} />
        {/* Soft daylight from a window upper-left. */}
        <directionalLight position={[-5.5, 8, 5]} intensity={3.2} color="#fff8f1" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-.0003} shadow-normalBias={.02} shadow-radius={9} shadow-blurSamples={16}
          shadow-camera-left={-shadowSpan} shadow-camera-right={shadowSpan} shadow-camera-top={shadowSpan} shadow-camera-bottom={-shadowSpan} shadow-camera-near={.5} shadow-camera-far={40} />
        <Room backZ={backZ} floorY={floorY} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={.6} distanceFalloff={1} intensity={1.8} quality="medium" halfRes />
          <SMAA />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
          <Vignette offset={.4} darkness={.28} />
        </EffectComposer>
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
