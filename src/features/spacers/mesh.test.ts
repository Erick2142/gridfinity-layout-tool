import { describe, it, expect } from 'vitest';
import { spacerMesh, pocketHeight, validSpacer } from './mesh';

describe('spacer mesh', () => {
  for (const feet of [false, true])
    for (const [width, depth, lift] of [
      [1, 1, 7],
      [2, 3, 12.5],
    ]) {
      it(`closes each edge for ${width}×${depth}, feet=${feet}`, () => {
        const { vertices, indices } = spacerMesh({ width, depth, lift, feet });
        const edges = new Map<string, number[]>();
        for (let i = 0; i < indices.length; i += 3)
          for (let k = 0; k < 3; k++) {
            const a = indices[i + k],
              b = indices[i + ((k + 1) % 3)],
              key = [Math.min(a, b), Math.max(a, b)].join(',');
            const count = edges.get(key) ?? [0, 0];
            count[Number(a > b)]++;
            edges.set(key, count);
          }
        expect([...edges.values()].filter(([a, b]) => a !== 1 || b !== 1)).toEqual([]);
        const zs = vertices.filter((_, i) => i % 3 === 2);
        expect(Math.min(...zs)).toBe(0);
        expect(zs.includes(lift)).toBe(true);
        expect(Math.max(...zs)).toBeCloseTo(lift + pocketHeight);
      });
    }
  it('requires at least one height unit', () =>
    expect(validSpacer({ width: 1, depth: 1, lift: 6.99, feet: true })).toBe(false));
});
