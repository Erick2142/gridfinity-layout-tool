import { it, expect } from 'vitest';
import { PerspectiveCamera, OrthographicCamera, Vector3 } from 'three';
import {
  CAMERA_PRESETS,
  FRAME_FILL,
} from '@/features/baseplate/components/BaseplatePreview/cameraUtils';
import { frameSpacer } from './frameSpacer';

it('frames the entire spacer from each preset in narrow and wide viewports', () => {
  for (const aspect of [0.5, 2])
    for (const spans of [
      [42, 42, 10.8],
      [672, 42, 10.8],
      [42, 84, 250],
    ])
      for (const direction of Object.values(CAMERA_PRESETS)) {
        for (const camera of [
          new PerspectiveCamera(45, aspect, 0.1, 2000),
          new OrthographicCamera(-200 * aspect, 200 * aspect, 200, -200, 0.1, 2000),
        ]) {
          camera.up.set(0, 0, 1);
          frameSpacer(camera, spans, new Vector3(...direction), aspect);
          camera.updateMatrixWorld();
          let extent = 0;
          for (const x of [-0.5, 0.5])
            for (const y of [-0.5, 0.5])
              for (const z of [0, 1]) {
                const p = new Vector3(x * spans[0], y * spans[1], z * spans[2]).project(camera);
                expect(Math.abs(p.z)).toBeLessThan(1);
                extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y));
              }
          expect(extent).toBeCloseTo(FRAME_FILL, 5);
        }
      }
});
