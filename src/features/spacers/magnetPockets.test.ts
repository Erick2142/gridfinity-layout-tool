import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import init, { type ManifoldToplevel } from 'manifold-3d';
import { clearanceError, magneticSpacerMesh } from './magnetPockets';
let module: ManifoldToplevel;
beforeAll(async () => {
  const binary = readFileSync('node_modules/manifold-3d/manifold.wasm');
  module = await init({ wasmBinary: binary } as unknown as Parameters<typeof init>[0]);
  module.setup();
});
const spacer = {
  width: 2,
  depth: 3,
  lift: 7,
  feet: true,
  topNotches: true,
  undersideNotches: true,
};
const top = { enabled: true, diameter: 6.5, thickness: 2 };
const bottom = { enabled: true, diameter: 5, thickness: 2.5 };
for (const perimeter of [false, true])
  for (const feet of [false, true]) {
    it(`measures independent pockets through the exported mesh, perimeter=${perimeter}, feet=${feet}`, () => {
      const mesh = magneticSpacerMesh(module, { ...spacer, perimeter, feet }, { top, bottom });
      const solid = new module.Manifold(
        new module.Mesh({ numProp: 3, vertProperties: mesh.vertices, triVerts: mesh.indices })
      );
      try {
        expect(solid.status()).toBe('NoError');
        const heights = (x: number, y: number) =>
          solid.rayCast([x, y, -1], [x, y, 12]).map((h) => h.position[2]);
        expect(heights(8.1, 8.1)).toEqual([2.5, 5]);
        expect(heights(10.8, 8.1)).toEqual([0, 5]);
        // Inside the reinforced pad, over 1 mm beyond the top bore radius.
        expect(heights(11.2, 11.2)).toEqual([0, 7]);
        if (perimeter) expect(heights(42, 42)).toEqual([]);
      } finally {
        solid.delete();
      }
    });
  }
it('rejects insufficient floor and wall thickness', () => {
  expect(clearanceError(spacer, { top, bottom: { ...bottom, thickness: 4.6 } })).toBe(
    'spacers.magnetFloor'
  );
  expect(clearanceError(spacer, { top: { ...top, diameter: 15 }, bottom })).toBe(
    'spacers.magnetWall'
  );
});
