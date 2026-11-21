import { useLayoutEffect, useState, useRef } from 'react';
import { Vector3 } from 'three';
import { BaseplatePreviewControls } from '@/features/baseplate/components/BaseplatePreview/BaseplatePreviewControls';
import {
  CAMERA_PRESETS,
  type CameraPreset,
} from '@/features/baseplate/components/BaseplatePreview/cameraUtils';
import { CameraRig, type Projection } from '@/shared/components/preview/CameraRig';
import { useBaseplateKeyboard } from '@/features/baseplate/hooks/useBaseplateKeyboard';
import { Canvas, useThree } from '@react-three/fiber';
import { Bounds, OrbitControls, useBounds } from '@react-three/drei';
import { useSettingsStore } from '@/core/store';
import { GradientBackground } from '@/shared/components/preview/GradientBackground';
import { FootprintGrid } from '@/shared/components/preview/FootprintGrid';
import { SceneLighting } from '@/features/baseplate/components/BaseplatePreview/SceneLighting';
import { detectWebGL, WebGLFallback, WebGLErrorBoundary } from '@/shared/webgl';
import { SIZE } from '@/shared/generation/generatorConstants';
import type { spacerMesh } from './mesh';

interface Props {
  mesh: ReturnType<typeof spacerMesh>;
  width: number;
  depth: number;
  height: number;
}

function PresetController({
  apply,
}: {
  apply: React.RefObject<((preset: CameraPreset) => void) | null>;
}) {
  const bounds = useBounds();
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    apply.current = (preset) => {
      const { center, distance } = bounds.refresh().getSize();
      const eye = new Vector3(...CAMERA_PRESETS[preset])
        .normalize()
        .multiplyScalar(distance)
        .add(center);
      bounds.moveTo(eye).lookAt({ target: center });
      if (camera.type === 'OrthographicCamera') bounds.fit();
    };
    return () => {
      apply.current = null;
    };
  }, [apply, bounds, camera]);
  return null;
}
export function SpacerPreview({ mesh, width, depth, height }: Props) {
  const color = useSettingsStore((s) => s.settings.baseplateFilamentColor);
  const [active, setActive] = useState<CameraPreset | null>(null);
  const [projection, setProjection] = useState<Projection>('perspective');
  const [xray, setXray] = useState(false);
  const [selectedColor, setColor] = useState(color);
  const apply = useRef<((preset: CameraPreset) => void) | null>(null);
  function preset(view: CameraPreset) {
    apply.current?.(view);
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
          target={[0, 0, height / 2]}
        />
        <GradientBackground />
        <SceneLighting />
        <OrbitControls makeDefault enableDamping onStart={() => setActive(null)} />
        <Bounds
          key={width + 'x' + depth + 'x' + height}
          fit
          clip
          observe
          margin={1.25}
          maxDuration={0}
        >
          <PresetController apply={apply} />
          <mesh position={[(-width * SIZE) / 2, (-depth * SIZE) / 2, 0]}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[mesh.vertices, 3]} />
              <bufferAttribute attach="index" args={[mesh.indices, 1]} />
            </bufferGeometry>
            <meshStandardMaterial
              color={selectedColor}
              transparent={xray}
              opacity={xray ? 0.32 : 1}
              depthWrite={!xray}
              flatShading
              roughness={0.7}
            />
          </mesh>
        </Bounds>
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
