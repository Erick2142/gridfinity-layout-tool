import { getManifoldModule } from '@/features/generation/worker/manifoldRuntime';
import { magneticSpacerMesh, type Magnets } from './magnetPockets';
import type { Spacer } from './mesh';
self.onmessage = async ({ data }: { data: { spacer: Spacer; magnets: Magnets } }) => {
  try {
    const mesh = magneticSpacerMesh(await getManifoldModule(), data.spacer, data.magnets);
    self.postMessage(mesh, { transfer: [mesh.vertices.buffer, mesh.indices.buffer] });
  } catch {
    self.postMessage(null);
  }
};
