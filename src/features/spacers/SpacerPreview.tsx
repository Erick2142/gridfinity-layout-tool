import { Canvas } from '@react-three/fiber';
import { Bounds, OrbitControls } from '@react-three/drei';
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

export function SpacerPreview({ mesh, width, depth, height }: Props) {
  const color = useSettingsStore((s) => s.settings.baseplateFilamentColor);
  if (!detectWebGL().available) return <WebGLFallback />;
  return (
    <WebGLErrorBoundary>
      <Canvas frameloop="demand" camera={{ position: [100, -120, 95], up: [0, 0, 1], fov: 45 }}>
        <GradientBackground />
        <SceneLighting />
        <OrbitControls makeDefault enableDamping />
        <Bounds
          key={width + 'x' + depth + 'x' + height}
          fit
          clip
          observe
          margin={1.25}
          maxDuration={0}
        >
          <mesh position={[(-width * SIZE) / 2, (-depth * SIZE) / 2, 0]}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[mesh.vertices, 3]} />
              <bufferAttribute attach="index" args={[mesh.indices, 1]} />
            </bufferGeometry>
            <meshStandardMaterial color={color} flatShading roughness={0.7} />
          </mesh>
        </Bounds>
        <FootprintGrid width={width} depth={depth} />
      </Canvas>
    </WebGLErrorBoundary>
  );
}
