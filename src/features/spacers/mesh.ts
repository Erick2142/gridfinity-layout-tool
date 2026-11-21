import {
  SIZE,
  CLEARANCE,
  BOX_CORNER_RADIUS,
  CORNER_RADIUS,
  HEIGHT_UNIT,
  FOOT_PROFILE,
  POCKET_PROFILE,
  SOCKET_HEIGHT,
  PLATE_PROFILE_HEIGHT,
} from '@/shared/generation/generatorConstants';

export interface Spacer {
  width: number;
  depth: number;
  lift: number;
  feet: boolean;
  perimeter?: boolean;
  undersideNotches?: boolean;
  topNotches?: boolean;
}

// End the pocket taper slightly below the nominal plate top to leave a printable ridge.
const rimTrim = 0.85;
export const pocketHeight = PLATE_PROFILE_HEIGHT - rimTrim;
type Point = [number, number, number];

export function validSpacer(s: Spacer): boolean {
  return (
    [s.width, s.depth].every((n) => Number.isInteger(n) && n >= 1 && n <= 16) &&
    Number.isFinite(s.lift) &&
    s.lift >= HEIGHT_UNIT
  );
}

export function spacerMesh(s: Spacer) {
  if (!validSpacer(s)) throw new RangeError('Invalid spacer dimensions');
  const positions: number[] = [];
  const triangles: number[] = [];
  const lookup = new Map<string, number>();
  const vertex = (p: Point) => {
    const coords = p.map((v) => Math.round(v * 1e5) / 1e5);
    const key = coords.join(',');
    const found = lookup.get(key);
    if (found !== undefined) return found;
    const index = positions.length / 3;
    positions.push(...coords);
    lookup.set(key, index);
    return index;
  };
  const face = (a: number, b: number, c: number) => {
    if (a !== b && a !== c && b !== c) triangles.push(a, b, c);
  };
  if (s.perimeter) {
    // Sweep one annular rail around the footprint. Matching stations on every
    // profile ring keep the side transitions closed even at the divider cuts.
    const halfX = (s.width * SIZE) / 2,
      halfY = (s.depth * SIZE) / 2;
    type Station = (inset: number, radius: number) => [number, number];
    const stations: { point: Station; seam: number }[] = [];
    const corners = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ] as const;
    for (const [corner, [sx, sy]] of corners.entries()) {
      for (let i = 0; i <= 8; i++) {
        const angle = ((corner + i / 8) * Math.PI) / 2;
        stations.push({
          seam: Infinity,
          point: (d, r) => [
            halfX + sx * (halfX - d - r) + r * Math.cos(angle),
            halfY + sy * (halfY - d - r) + r * Math.sin(angle),
          ],
        });
      }
      const horizontal = corner % 2 === 0;
      const cells = horizontal ? s.width : s.depth;
      for (let cell = 1; cell < cells; cell++) {
        for (const offset of [-9, -7, -4, -3, -2, -1, -0.25, 0, 0.25, 1, 2, 3, 4, 7, 9]) {
          const along = cell * SIZE + offset;
          stations.push({
            seam: Math.abs(offset),
            point: (d) =>
              horizontal
                ? [sx === 1 ? 2 * halfX - along : along, halfY + sy * (halfY - d)]
                : [halfX + sx * (halfX - d), sy === 1 ? 2 * halfY - along : along],
          });
        }
      }
    }
    const bore = 6;
    const ring = (z: number, inset: number, radius: number, side: 'bottom' | 'pocket' | 'plain') =>
      stations.map(({ point, seam }) => {
        let d = inset;
        if (side === 'pocket' && s.topNotches && seam < CORNER_RADIUS) {
          // Trace the rounded corner of the adjacent cell pocket, stopping
          // at the inner edge of the rail to leave the center open.
          const run = Math.max(0, radius * radius - (CORNER_RADIUS - seam) ** 2);
          d = Math.min(
            bore - 0.1,
            CORNER_RADIUS - Math.sqrt(run) + (seam < inset ? inset - seam : 0)
          );
        }
        const clearance =
          side === 'bottom' && s.undersideNotches
            ? SOCKET_HEIGHT * Math.min(1, Math.max(0, (9 - seam) / 2))
            : 0;
        return vertex([...point(d, radius), Math.max(z, clearance)]);
      });
    const rings = [ring(0, bore, 2, 'bottom')];
    if (s.feet)
      for (const [depth, inset] of [...FOOT_PROFILE].reverse())
        rings.push(
          ring(SOCKET_HEIGHT - depth, CLEARANCE / 2 + inset, BOX_CORNER_RADIUS - inset, 'bottom')
        );
    rings.push(
      ring(s.feet ? SOCKET_HEIGHT : 0, CLEARANCE / 2, BOX_CORNER_RADIUS, 'bottom'),
      ring(s.lift + pocketHeight, CLEARANCE / 2, BOX_CORNER_RADIUS, 'plain')
    );
    for (const [depth, inset] of POCKET_PROFILE) {
      const d = depth === 0 ? rimTrim : inset;
      rings.push(
        ring(
          s.lift + PLATE_PROFILE_HEIGHT - Math.max(depth, rimTrim),
          d,
          CORNER_RADIUS - d,
          'pocket'
        )
      );
    }
    rings.push(ring(s.lift, bore, 2, 'plain'));
    for (let k = 0; k < rings.length; k++) {
      const a = rings[k],
        b = rings[(k + 1) % rings.length];
      for (let i = 0; i < a.length; i++) {
        const j = (i + 1) % a.length;
        face(a[i], a[j], b[i]);
        face(a[j], b[j], b[i]);
      }
    }
    return { vertices: new Float32Array(positions), indices: new Uint32Array(triangles) };
  }
  const corners = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ] as const;
  for (let y = 0; y < s.depth; y++)
    for (let x = 0; x < s.width; x++) {
      // At shared cell boundaries the frame runs straight through. Only its
      // four external corners have the bin's outside radius and clearance.
      const ring = (z: number, inset: number, radius: number, frame = false) => {
        const ids: number[] = [];
        corners.forEach(([sx, sy], corner) => {
          const outerX = sx === 1 ? x === s.width - 1 : x === 0;
          const outerY = sy === 1 ? y === s.depth - 1 : y === 0;
          const r = frame && !(outerX && outerY) ? 0 : radius;
          const dx = frame && !outerX ? 0 : inset;
          const dy = frame && !outerY ? 0 : inset;
          for (let step = 0; step <= 8; step++) {
            const angle = ((corner + step / 8) * Math.PI) / 2;
            ids.push(
              vertex([
                (x + 0.5) * SIZE + sx * (SIZE / 2 - dx - r) + r * Math.cos(angle),
                (y + 0.5) * SIZE + sy * (SIZE / 2 - dy - r) + r * Math.sin(angle),
                z,
              ])
            );
          }
        });
        return ids;
      };
      const strip = (a: number[], b: number[], exteriorOnly = false) => {
        for (let i = 0; i < a.length; i++) {
          // Straight sides after each corner run north, west, south, east.
          if (
            exteriorOnly &&
            i % 9 === 8 &&
            [y < s.depth - 1, x > 0, y > 0, x < s.width - 1][Math.floor(i / 9)]
          )
            continue;
          const j = (i + 1) % a.length;
          face(a[i], a[j], b[i]);
          face(a[j], b[j], b[i]);
        }
      };
      const bore = (z: number) => ring(z, 6, 2);
      let previous = bore(0);
      if (s.feet) {
        for (const [depth, inset] of [...FOOT_PROFILE].reverse()) {
          const next = ring(
            SOCKET_HEIGHT - depth,
            CLEARANCE / 2 + inset,
            BOX_CORNER_RADIUS - inset
          );
          strip(previous, next);
          previous = next;
        }
      }
      const bottom = ring(s.feet ? SOCKET_HEIGHT : 0, CLEARANCE / 2, BOX_CORNER_RADIUS, true);
      strip(previous, bottom);
      const top = ring(s.lift + pocketHeight, CLEARANCE / 2, BOX_CORNER_RADIUS, true);
      strip(bottom, top, true);
      previous = top;
      for (const [depth, inset] of POCKET_PROFILE) {
        const d = Math.max(depth, rimTrim);
        const offset = depth === 0 ? rimTrim : inset;
        const next = ring(s.lift + PLATE_PROFILE_HEIGHT - d, offset, CORNER_RADIUS - offset);
        strip(previous, next);
        previous = next;
      }
      // The annular seat at z=lift supports the flat underside of the bin foot.
      strip(previous, bore(s.lift));
      strip(bore(s.lift), bore(0));
    }
  return { vertices: new Float32Array(positions), indices: new Uint32Array(triangles) };
}
