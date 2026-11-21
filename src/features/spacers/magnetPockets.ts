import type { Manifold, ManifoldToplevel } from 'manifold-3d';
import {
  CLEARANCE,
  SIZE,
  HOLE_OFFSET,
  MAGNET_FLOOR,
  FOOT_INSET_BOT,
  POCKET_INSET_BOT,
} from '@/shared/generation/generatorConstants';
import { spacerMesh, type Spacer } from './mesh';

export interface Pocket {
  enabled: boolean;
  diameter: number;
  thickness: number;
}
export interface Magnets {
  top: Pocket;
  bottom: Pocket;
}

export function clearanceError(s: Spacer, { top, bottom }: Magnets) {
  const inset = Math.max(POCKET_INSET_BOT, s.feet ? CLEARANCE / 2 + FOOT_INSET_BOT : CLEARANCE / 2);
  const maxDiameter = 2 * (SIZE / 2 - HOLE_OFFSET - inset - MAGNET_FLOOR);
  const active = [top, bottom].filter((p) => p.enabled);
  if (
    active.some((p) => !Number.isFinite(p.diameter) || p.diameter <= 0 || p.diameter > maxDiameter)
  )
    return 'spacers.magnetWall';
  if (
    active.some((p) => !Number.isFinite(p.thickness) || p.thickness <= 0) ||
    active.reduce((sum, p) => sum + p.thickness, 0) + MAGNET_FLOOR > s.lift
  )
    return 'spacers.magnetFloor';
  return null;
}

export function magneticSpacerMesh(module: ManifoldToplevel, s: Spacer, m: Magnets) {
  const error = clearanceError(s, m);
  if (error) throw new RangeError(error);
  const base = spacerMesh(s);
  if (!m.top.enabled && !m.bottom.enabled) return base;
  const solids: Manifold[] = [];
  const own = (solid: Manifold) => {
    solids.push(solid);
    return solid;
  };
  try {
    const shell = own(
      new module.Manifold(
        new module.Mesh({ numProp: 3, vertProperties: base.vertices, triVerts: base.indices })
      )
    );
    const pads = [shell],
      cuts: Manifold[] = [];
    const padRadius = Math.max(
      3,
      ...[m.top, m.bottom].filter((p) => p.enabled).map((p) => p.diameter / 2 + MAGNET_FLOOR)
    );
    const pad = own(module.Manifold.cylinder(s.lift, padRadius, padRadius, 64));
    const cutters = [m.top, m.bottom].map((p) =>
      p.enabled
        ? own(module.Manifold.cylinder(p.thickness + 0.1, p.diameter / 2, p.diameter / 2, 64))
        : null
    );
    for (let row = 0; row < s.depth; row++)
      for (let col = 0; col < s.width; col++)
        for (const sx of [-1, 1])
          for (const sy of [-1, 1]) {
            if (
              s.perimeter &&
              !(
                (sx < 0 ? col === 0 : col === s.width - 1) &&
                (sy < 0 ? row === 0 : row === s.depth - 1)
              )
            )
              continue;
            const x = (col + 0.5) * SIZE + sx * HOLE_OFFSET,
              y = (row + 0.5) * SIZE + sy * HOLE_OFFSET;
            pads.push(own(pad.translate([x, y, 0])));
            if (cutters[0]) cuts.push(own(cutters[0].translate([x, y, s.lift - m.top.thickness])));
            if (cutters[1]) cuts.push(own(cutters[1].translate([x, y, -0.1])));
          }
    const result = own(module.Manifold.difference([own(module.Manifold.union(pads)), ...cuts]));
    if (result.status() !== 'NoError' || result.isEmpty())
      throw new Error('Spacer magnet geometry failed');
    const mesh = result.getMesh();
    return {
      vertices: new Float32Array(mesh.vertProperties),
      indices: new Uint32Array(mesh.triVerts),
    };
  } finally {
    for (const solid of solids.reverse()) solid.delete();
  }
}
