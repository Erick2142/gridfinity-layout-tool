import { useState } from 'react';
import { useTranslation } from '@/i18n';
import { ToolSwitcher } from '@/shared/components/ToolSwitcher';
import { useResponsive } from '@/shared/hooks';
import { triggerDownload } from '@/shared/generation/exportUtils';
import {
  SIZE,
  HEIGHT_UNIT,
  CLEARANCE,
  FOOT_PROFILE,
  POCKET_PROFILE,
  PLATE_PROFILE_HEIGHT,
  SOCKET_HEIGHT,
} from '@/shared/generation/generatorConstants';
import { buildSTLBufferFromIndexed } from '@/features/generation/export/stlExporter';
import { spacerMesh, validSpacer, pocketHeight, type Spacer } from './mesh';

function SideSection({ width, lift, feet }: Spacer) {
  const h = lift + pocketHeight;
  return (
    <svg
      aria-hidden="true"
      viewBox={[-1, -1, width * SIZE + 2, h + 2].join(' ')}
      className="w-full max-h-80"
    >
      {Array.from({ length: width }, (_, i) =>
        [false, true].map((right) => {
          const edge = (!right && i === 0) || (right && i === width - 1) ? CLEARANCE / 2 : 0;
          const points = [
            [6, 0],
            ...(feet
              ? [...FOOT_PROFILE]
                  .reverse()
                  .map(([d, inset]) => [CLEARANCE / 2 + inset, SOCKET_HEIGHT - d])
              : []),
            [edge, feet ? SOCKET_HEIGHT : 0],
            [edge, h],
            ...POCKET_PROFILE.map(([d, inset]) => [
              d === 0 ? PLATE_PROFILE_HEIGHT - pocketHeight : inset,
              Math.min(h, lift + PLATE_PROFILE_HEIGHT - d),
            ]),
            [6, lift],
          ];
          return (
            <polygon
              key={i + '-' + right}
              fill="currentColor"
              points={points
                .map(([x, z]) => [i * SIZE + (right ? SIZE - x : x), h - z].join(','))
                .join(' ')}
            />
          );
        })
      )}
    </svg>
  );
}

export default function SpacersPage() {
  const t = useTranslation();
  const { isMobile } = useResponsive();
  const [width, setWidth] = useState('1'),
    [depth, setDepth] = useState('1');
  const [custom, setCustom] = useState(false),
    [height, setHeight] = useState('1');
  const [feet, setFeet] = useState(true);
  const spacer = {
    width: Number(width),
    depth: Number(depth),
    lift: Number(height) * (custom ? 1 : HEIGHT_UNIT),
    feet,
  };
  const valid = validSpacer(spacer) && (custom || Number.isInteger(Number(height)));
  function download() {
    if (!valid) return;
    const { vertices, indices } = spacerMesh(spacer);
    const name = `spacer-${width}x${depth}-${spacer.lift}mm-${feet ? 'feet' : 'flat'}`;
    triggerDownload(
      new Blob([buildSTLBufferFromIndexed(vertices, new Float32Array(), indices, name)], {
        type: 'model/stl',
      }),
      name + '.stl'
    );
  }
  const inputClass = 'block mt-1 rounded border border-stroke-subtle bg-surface px-3 py-2 w-full';
  return (
    <div className="flex h-dvh flex-col bg-surface text-content">
      <header className="border-b border-stroke-subtle p-2">
        <ToolSwitcher compact={isMobile} iconOnly={isMobile} />
      </header>
      <main className="overflow-auto p-5">
        <h2 className="mb-5 text-xl font-semibold">{t('spacers.title')}</h2>
        <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
          <div className="space-y-4">
            {(
              [
                [width, setWidth, 'spacers.width'],
                [depth, setDepth, 'spacers.depth'],
              ] as const
            ).map(([value, set, key]) => (
              <label key={key} className="block">
                {t(key)}
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={16}
                  step={1}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                />
              </label>
            ))}
            <label className="block">
              {t(custom ? 'spacers.mm' : 'spacers.units')}
              <input
                className={inputClass}
                type="number"
                min={custom ? HEIGHT_UNIT : 1}
                step={custom ? 'any' : 1}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={custom}
                onChange={(e) => {
                  const lift = Math.max(HEIGHT_UNIT, spacer.lift || HEIGHT_UNIT);
                  setHeight(String(e.target.checked ? lift : Math.ceil(lift / HEIGHT_UNIT)));
                  setCustom(e.target.checked);
                }}
              />
              {t('spacers.custom')}
            </label>
            <label className="block">
              {t('spacers.underside')}
              <select
                className={inputClass}
                value={feet ? 'feet' : 'flat'}
                onChange={(e) => setFeet(e.target.value === 'feet')}
              >
                <option value="feet">{t('spacers.feet')}</option>
                <option value="flat">{t('spacers.flat')}</option>
              </select>
            </label>
            <button
              className="rounded bg-surface-elevated border border-stroke-subtle px-4 py-2 disabled:opacity-50"
              disabled={!valid}
              onClick={download}
            >
              {t('spacers.download')}
            </button>
          </div>
          {valid ? (
            <figure className="my-auto max-w-3xl space-y-4">
              <figcaption>
                {t('spacers.section')} · {width} × {depth}
              </figcaption>
              <SideSection {...spacer} />
              <p>
                {t('spacers.mm')}: {spacer.lift} mm · {t('spacers.height')}:{' '}
                {Number((spacer.lift + pocketHeight).toFixed(4))} mm
              </p>
            </figure>
          ) : (
            <p role="alert">{t('spacers.invalid')}</p>
          )}
        </div>
      </main>
    </div>
  );
}
