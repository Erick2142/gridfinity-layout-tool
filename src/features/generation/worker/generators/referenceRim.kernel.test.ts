// @vitest-environment node
import { beforeAll, expect, it } from 'vitest';
import { initTestKernel } from '@/test/initTestKernel';
import { DEFAULT_BIN_PARAMS } from '@/shared/constants/bin';
import { boundingBox, verticalSolidSpans } from './__kernel-tests__/meshAssertions';

beforeAll(initTestKernel, 60000);

it.each(['thin', 'none'] as const)('exports the measured %s rim', async (rimProfile) => {
  const { generateBin } = await import('./binOrchestrator');
  const thin = rimProfile === 'thin';
  const mesh = generateBin(
    {
      ...DEFAULT_BIN_PARAMS,
      width: 1,
      depth: 1,
      height: 3,
      wallThickness: 1.2,
      extraWallHeightMm: thin ? 0.45 : 4.85,
      base: { ...DEFAULT_BIN_PARAMS.base, stackingLip: thin, rimProfile },
    },
    undefined,
    true
  );
  const bounds = boundingBox(mesh.vertices);
  expect(bounds.maxZ - bounds.minZ).toBeCloseTo(25.85, 2);
  // A vertical ray 1.6 mm inboard hits the thin shoulder, but passes
  // through air at the same location on the full-height plain wall.
  const spans = verticalSolidSpans(mesh, bounds.maxX - 1.6, 0.37);
  expect(spans.some(([lo, hi]) => lo < 23 && hi > 23)).toBe(thin);
});
