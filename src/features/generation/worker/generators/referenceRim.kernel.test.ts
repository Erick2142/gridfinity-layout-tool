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
      extraWallHeightMm: 0.45,
      base: { ...DEFAULT_BIN_PARAMS.base, stackingLip: true, rimProfile },
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

it.each(['thin', 'none'] as const)('exports all four peak finishes on %s', async (rimProfile) => {
  const { generateBin } = await import('./binOrchestrator');
  const edgeHeights: number[] = [];
  for (const lipTip of ['sharp', 'round', 'chamfer', 'flat'] as const) {
    const mesh = generateBin(
      {
        ...DEFAULT_BIN_PARAMS,
        width: 1,
        depth: 1,
        height: 3,
        extraWallHeightMm: 0.45,
        wallThickness: 1.2,
        base: {
          ...DEFAULT_BIN_PARAMS.base,
          stackingLip: true,
          rimProfile,
          lipTip,
          lipNotches: true,
        },
      },
      undefined,
      true
    );
    const bounds = boundingBox(mesh.vertices);
    const spans = verticalSolidSpans(mesh, bounds.maxX - 0.1, 0.37);
    edgeHeights.push(Math.max(...spans.map(([, hi]) => hi)));
    expect(bounds.maxZ - bounds.minZ).toBeGreaterThan(25);
    if (lipTip === 'flat') expect(bounds.maxZ - bounds.minZ).toBeCloseTo(25.15, 2);
  }
  // At the same inset, the round edge rises above a straight chamfer.
  expect(edgeHeights[0]).toBeGreaterThan(edgeHeights[1]);
  expect(edgeHeights[1]).toBeGreaterThan(edgeHeights[2] + 0.05);
});

it.each(['sharp', 'round', 'chamfer', 'flat'] as const)(
  'continues the interior corner to the %s plain rim',
  async (lipTip) => {
    const { generateBin } = await import('./binOrchestrator');
    const mesh = generateBin(
      {
        ...DEFAULT_BIN_PARAMS,
        width: 1,
        depth: 1,
        height: 3,
        wallThickness: 1.2,
        extraWallHeightMm: 1.45,
        interiorFilletMm: 7,
        base: { ...DEFAULT_BIN_PARAMS.base, stackingLip: true, rimProfile: 'none', lipTip },
      },
      undefined,
      true
    );
    const bounds = boundingBox(mesh.vertices);
    // This column falls inside a 7 mm corner fillet, clear of the straight wall.
    const spans = verticalSolidSpans(mesh, bounds.maxX - 2.6, bounds.maxY - 2.55);
    expect(spans.some(([lo, hi]) => lo < 20 && hi > bounds.maxZ - 0.05)).toBe(true);
    const air = verticalSolidSpans(mesh, bounds.maxX - 4, bounds.maxY - 4);
    expect(air.some(([, hi]) => hi > 20)).toBe(false);
  }
);
