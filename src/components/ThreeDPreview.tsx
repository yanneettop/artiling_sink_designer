import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Edges, Grid, Line, OrbitControls } from '@react-three/drei'
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { SinkGeometry } from '../lib/sinkGeometry'

type Vec3 = [number, number, number]
type ViewPreset = 'perspective' | 'front' | 'top' | 'side'

const SCALE = 1 / 200
const porcelain = '#dedbd4'
const porcelainSide = '#c9c5bd'
const dark = '#292a27'

function Box({ size, position, rotation = [0, 0, 0], color = porcelain, roughness = .72 }: { size: Vec3; position: Vec3; rotation?: Vec3; color?: string; roughness?: number }) {
  return <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={roughness} metalness={.02} />
    <Edges threshold={15} color="#595a55" />
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

function SolidMesh({ vertices, color = porcelain, roughness = .72 }: { vertices: number[]; color?: string; roughness?: number }) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    result.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    result.setIndex(solidIndices)
    result.computeVertexNormals()
    return result
  }, [vertices])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} castShadow receiveShadow>
    <meshStandardMaterial color={color} roughness={roughness} metalness={.02} side={DoubleSide} />
    <Edges threshold={10} color="#595a55" />
  </mesh>
}

function CameraControls({ preset, extent, targetY }: { preset: ViewPreset; extent: number; targetY: number }) {
  const { camera } = useThree()
  const controls = useRef<OrbitControlsImpl>(null)
  useEffect(() => {
    const positions: Record<ViewPreset, Vec3> = {
      perspective: [extent * 1.35, extent * .95, extent * 1.5],
      front: [0, targetY, extent * 2.35],
      top: [0, extent * 2.4, .001],
      side: [extent * 2.35, targetY, 0],
    }
    camera.position.set(...positions[preset])
    camera.up.set(0, preset === 'top' ? 0 : 1, preset === 'top' ? -1 : 0)
    camera.lookAt(0, targetY, 0)
    controls.current?.target.set(0, targetY, 0)
    controls.current?.update()
  }, [camera, extent, preset, targetY])
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} minDistance={extent * .55} maxDistance={extent * 4} maxPolarAngle={Math.PI * .92} />
}

function SinkModel({ g }: { g: SinkGeometry }) {
  const d = g.design
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
  const finishRoughness = d.finish === 'Polished' ? .24 : d.finish === 'Textured' ? .9 : .68
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
  let drawerTop = -H - d.drawerTopGap * SCALE

  return <group>
    <Box size={[leftRim, T, D]} position={[-W / 2 + leftRim / 2, -T / 2, 0]} roughness={finishRoughness} />
    <Box size={[rightRim, T, D]} position={[W / 2 - rightRim / 2, -T / 2, 0]} roughness={finishRoughness} />
    <Box size={[basinW, T, rearRim]} position={[(leftRim - rightRim) / 2, -T / 2, backZ + rearRim / 2]} roughness={finishRoughness} />
    <Box size={[basinW, T, frontRim]} position={[(leftRim - rightRim) / 2, -T / 2, frontZ - frontRim / 2]} roughness={finishRoughness} />

    <Box size={[W, H, T]} position={[0, -H / 2, frontZ - T / 2]} color={porcelainSide} roughness={finishRoughness} />
    <Box size={[T, H, D]} position={[-W / 2 + T / 2, -H / 2, 0]} color={porcelainSide} roughness={finishRoughness} />
    <Box size={[T, H, D]} position={[W / 2 - T / 2, -H / 2, 0]} color={porcelainSide} roughness={finishRoughness} />
    <Box size={[W, H, T]} position={[0, -H / 2, backZ + T / 2]} color={porcelainSide} roughness={finishRoughness} />

    <SolidMesh vertices={floorVertices} roughness={finishRoughness} />
    <SolidMesh vertices={leftWallVertices} roughness={finishRoughness} />
    <SolidMesh vertices={rightWallVertices} roughness={finishRoughness} />
    <Box size={[basinW, Math.max(T, -rearFloorY), T]} position={[(leftRim - rightRim) / 2, rearFloorY / 2, basinBackZ - T / 2]} roughness={finishRoughness} />
    <Box size={[basinW, Math.max(T, -frontFloorY), T]} position={[(leftRim - rightRim) / 2, frontFloorY / 2, basinFrontZ + T / 2]} roughness={finishRoughness} />

    {g.basins.slice(1).map((basin, index) => <Box key={`divider-${index}`} size={[g.dividerWidth * SCALE, deepest, basinD]} position={[(basin.x - g.dividerWidth / 2 - d.overallWidth / 2) * SCALE, -deepest / 2, (basinBackZ + basinFrontZ) / 2]} roughness={finishRoughness} />)}
    {d.drainType === 'Concealed Linear' && drainXs.map((x, index) => <group key={`cover-${index}`}>
      <Box size={[coverWidth3d, T, coverDepth3d]} position={[x, coverJoinY - T / 2 + .003, basinBackZ + coverDepth3d / 2]} color="#ebe9e4" roughness={finishRoughness} />
      <Line points={[[x - coverWidth3d / 2, coverJoinY + .008, coverFrontZ], [x + coverWidth3d / 2, coverJoinY + .008, coverFrontZ]]} color="#62635e" lineWidth={1} />
    </group>)}
    {d.baseType === 'Sloped Front to Back' && <Line points={[[0, frontFloorY + .028, basinFrontZ - .08], [0, rearFloorY + .028, basinBackZ + .08]]} color="#73746e" lineWidth={1.4} />}
    {d.drainType === 'Linear' && drainXs.map((x, index) => <Box key={`linear-${index}`} size={[Math.min(d.drainLength, eachBasinW) * SCALE, .012, d.drainWidth * SCALE]} position={[x, drainFloorY + .005, drainZ + d.drainWidth * SCALE / 2]} color={dark} roughness={.95} />)}
    {d.drainType === 'Circular' && drainXs.map((x, index) => <mesh key={`round-${index}`} position={[x, drainFloorY + .012, drainZ]}>
      <cylinderGeometry args={[d.drainDiameter * SCALE / 2, d.drainDiameter * SCALE / 2, .016, 32]} /><meshStandardMaterial color={dark} roughness={.95} />
    </mesh>)}

    {d.tapType === 'Deck Mounted' && g.tapHoles.map((hole, index) => {
      const x = (hole.x - d.overallWidth / 2) * SCALE
      return <mesh key={index} position={[x, .006, backZ + hole.y * SCALE]}>
        <cylinderGeometry args={[d.tapHoleDiameter * SCALE / 2, d.tapHoleDiameter * SCALE / 2, .018, 28]} /><meshStandardMaterial color={dark} roughness={.95} />
      </mesh>
    })}

    {d.drawersEnabled && d.drawerHeights.slice(0, d.drawerCount).map((heightMm, index) => {
      const drawerH = heightMm * SCALE
      const y = drawerTop - drawerH / 2
      drawerTop -= drawerH + d.drawerGap * SCALE
      return <group key={index}>
        <Box size={[drawerWidth - T * 2, drawerH - T * .4, d.drawerDepth * SCALE]} position={[0, y, frontZ - d.drawerDepth * SCALE / 2]} color="#343531" roughness={.8} />
        <Box size={[drawerWidth, drawerH, T]} position={[0, y, frontZ + .006]} color={porcelain} roughness={finishRoughness} />
      </group>
    })}
  </group>
}

export function ThreeDPreview({ g, onCanvas }: { g: SinkGeometry; onCanvas?: (canvas: HTMLCanvasElement) => void }) {
  const [preset, setPreset] = useState<ViewPreset>('perspective')
  const d = g.design
  const totalDrawerHeight = d.drawersEnabled ? d.drawerTopGap + d.drawerHeights.slice(0, d.drawerCount).reduce((sum, height) => sum + height, 0) + Math.max(0, d.drawerCount - 1) * d.drawerGap : 0
  const totalHeight = (d.overallHeight + totalDrawerHeight) * SCALE
  const extent = useMemo(() => Math.max(d.overallWidth * SCALE, d.overallDepth * SCALE, totalHeight, 2.5), [d.overallDepth, d.overallWidth, totalHeight])
  const targetY = -totalHeight * .42
  const calculatedFall = Math.abs(g.bowlDepthRear - g.bowlDepthFront)
  const fallDirection = g.bowlDepthRear > g.bowlDepthFront ? 'rear' : g.bowlDepthFront > g.bowlDepthRear ? 'front' : 'level'
  return <div className="preview-3d">
    <div className="view-3d-controls" aria-label="3D camera views">
      {(['perspective', 'front', 'top', 'side'] as ViewPreset[]).map((view) => <button key={view} className={preset === view ? 'active' : ''} onClick={() => setPreset(view)}>{view}</button>)}
    </div>
    <div className="view-3d-help">Drag to rotate · Wheel to zoom</div>
    {d.baseType === 'Sloped Front to Back' && <div className="fall-3d-indicator"><span>Base fall</span><strong>{Math.round(calculatedFall)} mm {fallDirection === 'level' ? 'level' : `to ${fallDirection}`}</strong></div>}
    <Canvas shadows dpr={[1, 1.75]} frameloop="demand" gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 34, near: .01, far: 100 }} onCreated={({ gl }) => onCanvas?.(gl.domElement)} fallback={<div className="webgl-fallback">3D preview is unavailable in this browser.</div>}>
      <color attach="background" args={['#f3f3ef']} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[6, 9, 7]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 3, -4]} intensity={.7} />
      <SinkModel g={g} />
      <Grid position={[0, -totalHeight - .06, 0]} args={[extent * 2.6, extent * 2.6]} cellSize={.25} cellThickness={.35} cellColor="#b8b9b3" sectionSize={1} sectionThickness={.65} sectionColor="#8e8f89" fadeDistance={extent * 2.2} fadeStrength={1.4} infiniteGrid />
      <CameraControls preset={preset} extent={extent} targetY={targetY} />
    </Canvas>
  </div>
}
