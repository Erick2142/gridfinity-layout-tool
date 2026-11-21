import { useLayoutEffect, useState, useRef } from 'react';
import { Vector3, PerspectiveCamera, OrthographicCamera } from 'three';
import type { OrbitControls as Orbit } from 'three-stdlib';
import { useMeshGeometry } from '@/shared/components/preview/useMeshGeometry';
import {
  EDGE_MATERIAL_PROPS,
  MESH_MATERIAL_PROPS,
} from '@/features/baseplate/components/BaseplatePreview/materialProps';
import { frameSpacer } from './frameSpacer';
import { BaseplatePreviewControls } from '@/features/baseplate/components/BaseplatePreview/BaseplatePreviewControls';
import {
  CAMERA_PRESETS,
  type CameraPreset,
} from '@/features/baseplate/components/BaseplatePreview/cameraUtils';
import { CameraRig, type Projection } from '@/shared/components/preview/CameraRig';
import { useBaseplateKeyboard } from '@/features/baseplate/hooks/useBaseplateKeyboard';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSettingsStore } from '@/core/store';
import { GradientBackground } from '@/shared/components/preview/GradientBackground';
import { FootprintGrid } from '@/shared/components/preview/FootprintGrid';
import { SceneLighting } from '@/features/baseplate/components/BaseplatePreview/SceneLighting';
import { detectWebGL, WebGLFallback, WebGLErrorBoundary } from '@/shared/webgl';
import { SIZE } from '@/shared/generation/generatorConstants';
import type { spacerMesh } from './mesh';

interface Props {
  mesh: ReturnType<typeof spacerMesh> | null;
  width: number;
  depth: number;
  height: number;
}

function SpacerCamera({
  width,
  depth,
  height,
  request,
}: Omit<Props, 'mesh'> & { request: { preset: CameraPreset } }) {
  const { camera, controls, size, invalidate } = useThree();
  const previous = useRef<{
    request: typeof request;
    dimensions: string;
    camera: PerspectiveCamera | OrthographicCamera;
  } | null>(null);
  useLayoutEffect(() => {
    const orbit = controls as Orbit | null;
    if (
      !orbit ||
      orbit.object !== camera ||
      !(camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera) ||
      !size.width ||
      !size.height
    )
      return;
    const dimensions = [size.width, size.height].join(',');
    const last = previous.current;
    if (
      last?.request === request &&
      last.dimensions === dimensions &&
      (last.camera === camera || last.camera.type !== camera.type)
    ) {
      previous.current = { request, dimensions, camera };
      return;
    }
    const direction =
      previous.current?.request === request && previous.current.camera === camera
        ? camera.position.clone().sub(orbit.target)
        : new Vector3(...CAMERA_PRESETS[request.preset]);
    const target = frameSpacer(
      camera,
      [width * SIZE, depth * SIZE, height],
      direction,
      size.width / size.height
    );
    orbit.target.copy(target);
    orbit.update();
    previous.current = { request, dimensions, camera };
    invalidate();
  }, [camera, controls, size.width, size.height, width, depth, height, request, invalidate]);
  return null;
}
export function SpacerPreview({ mesh, width, depth, height }: Props) {
  const [initialTarget] = useState<[number, number, number]>(() => [0, 0, height / 2]);
  const color = useSettingsStore((s) => s.settings.baseplateFilamentColor);
  const [active, setActive] = useState<CameraPreset | null>('isometric');
  const [projection, setProjection] = useState<Projection>('perspective');
  const [xray, setXray] = useState(false);
  const [selectedColor, setColor] = useState(color);
  const [request, setRequest] = useState<{ preset: CameraPreset }>({ preset: 'isometric' });
  const { geometry, edgesGeometry } = useMeshGeometry({
    vertices: mesh?.vertices ?? null,
    indices: mesh?.indices ?? null,
    normals: null,
    edgeVertices: null,
  });
  function preset(view: CameraPreset) {
    setRequest({ preset: view });
    setActive(view);
  }
  const toggleProjection = () =>
    setProjection((p) => (p === 'perspective' ? 'orthographic' : 'perspective'));
  const toggleXray = () => setXray((v) => !v);
  useBaseplateKeyboard({ onToggleProjection: toggleProjection, onToggleXray: toggleXray });
  if (!detectWebGL().available) return <WebGLFallback />;
  return (
    <WebGLErrorBoundary>
      <Canvas frameloop="demand" camera={{ position: [100, -120, 95], up: [0, 0, 1], fov: 45 }}>
        <CameraRig
          projection={projection}
          initialPosition={[100, -120, 95]}
          target={initialTarget}
        />
        <GradientBackground />
        <SceneLighting />
        <OrbitControls
          target={initialTarget}
          makeDefault
          enableDamping
          onStart={() => setActive(null)}
        />
        <SpacerCamera width={width} depth={depth} height={height} request={request} />
        <group position={[(-width * SIZE) / 2, (-depth * SIZE) / 2, 0.1]}>
          {geometry && (
            <mesh geometry={geometry}>
              <meshStandardMaterial
                key={xray ? 'transparent' : 'solid'}
                {...MESH_MATERIAL_PROPS}
                color={selectedColor}
                emissive={selectedColor}
                flatShading
                transparent={xray}
                opacity={xray ? 0.3 : 1}
                depthWrite={!xray}
              />
            </mesh>
          )}
          {edgesGeometry && (
            <lineSegments geometry={edgesGeometry} renderOrder={1}>
              <lineBasicMaterial
                {...EDGE_MATERIAL_PROPS}
                transparent={xray}
                opacity={xray ? 0.65 : 1}
              />
            </lineSegments>
          )}
        </group>
        <FootprintGrid width={width} depth={depth} />
      </Canvas>
      <BaseplatePreviewControls
        activePreset={active}
        isSplit={false}
        splitViewMode="assembled"
        onViewModeChange={() => {}}
        filamentColor={selectedColor}
        projection={projection}
        xray={xray}
        onCameraPreset={preset}
        onResetView={() => preset('top')}
        onColorChange={setColor}
        onToggleProjection={toggleProjection}
        onToggleXray={toggleXray}
      />
    </WebGLErrorBoundary>
  );
}
