import { FeatureToggle } from '@/shared/components/FeatureToggle';
import { HeaderSupportLinks } from '@/shared/components/HeaderSupportLinks';
import { Button, Stepper } from '@/design-system';
import { SpacerPreview } from './SpacerPreview';
import { useMemo, useState } from 'react';
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

function SideSection({ width, lift, feet, perimeter }: Spacer) {
  const h = lift + pocketHeight;
  return (
    <svg
      aria-hidden="true"
      viewBox={[-1, -1, width * SIZE + 2, h + 2].join(' ')}
      className="w-full max-h-80"
    >
      {Array.from({ length: width }, (_, i) =>
        [false, true].map((right) => {
          if (perimeter && (right ? i !== width - 1 : i !== 0)) return null;
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
  const { isMobile, isDesktop } = useResponsive();
  const [width, setWidth] = useState('1'),
    [depth, setDepth] = useState('1');
  const [custom, setCustom] = useState(false),
    [height, setHeight] = useState('1');
  const [feet, setFeet] = useState(true);
  const [perimeter, setPerimeter] = useState(false);
  const [undersideNotches, setUndersideNotches] = useState(false);
  const [topNotches, setTopNotches] = useState(false);
  const spacer = useMemo(
    () => ({
      width: Number(width),
      depth: Number(depth),
      lift: Number(height) * (custom ? 1 : HEIGHT_UNIT),
      feet,
      perimeter,
      undersideNotches,
      topNotches,
    }),
    [width, depth, height, custom, feet, perimeter, undersideNotches, topNotches]
  );
  const valid = validSpacer(spacer) && (custom || Number.isInteger(Number(height)));
  const mesh = useMemo(() => (valid ? spacerMesh(spacer) : null), [spacer, valid]);
  function download() {
    if (!mesh) return;
    const { vertices, indices } = mesh;
    const name = `spacer-${width}x${depth}-${spacer.lift}mm-${feet ? 'feet' : 'flat'}`;
    const profile = perimeter
      ? ['perimeter', undersideNotches ? 'underside-notches' : '', topNotches ? 'top-notches' : '']
          .filter(Boolean)
          .join('-')
      : '';
    triggerDownload(
      new Blob([buildSTLBufferFromIndexed(vertices, new Float32Array(), indices, name)], {
        type: 'model/stl',
      }),
      [name, profile].filter(Boolean).join('-') + '.stl'
    );
  }
  const inputClass = 'block mt-1 rounded border border-stroke-subtle bg-surface px-3 py-2 w-full';
  return (
    <div className="flex h-dvh flex-col bg-surface text-content">
      <header className="h-12 shrink-0 flex items-center justify-between px-4 bg-surface-secondary border-b border-stroke-subtle">
        <div className="flex min-w-0 items-center gap-2">
          <ToolSwitcher compact={isMobile} iconOnly={!isDesktop} labelsFromXl />
          <Button
            variant="ghost"
            aria-label={t('spacers.download')}
            disabled={!valid}
            onClick={download}
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v3h16v-3M12 3v12m-5-5 5 5 5-5"
              />
            </svg>
            <span className="hidden lg:inline">{t('spacers.download')}</span>
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <HeaderSupportLinks compact={!isDesktop} />
        </div>
      </header>
      <div className="flex flex-1 min-h-0 max-md:flex-col">
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-stroke-subtle bg-surface-secondary max-md:order-2 max-md:w-full max-md:flex-1">
          <h2 className="border-b border-stroke-subtle px-4 py-3 font-semibold">
            {t('spacers.title')}
          </h2>
          <div className="p-4 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  [width, setWidth, 'spacers.width'],
                  [depth, setDepth, 'spacers.depth'],
                ] as const
              ).map(([value, set, key]) => (
                <div key={key} className="min-w-0">
                  <span className="text-xs text-content-tertiary">{t(key)}</span>
                  <Stepper
                    fullWidth
                    aria-label={t(key)}
                    value={Number(value)}
                    min={1}
                    max={16}
                    onChange={(n) => set(String(Math.round(n)))}
                    onStep={(delta) =>
                      set(String(Math.max(1, Math.min(16, Number(value) + delta))))
                    }
                  />
                </div>
              ))}
            </div>
            <FeatureToggle
              label={t('spacers.custom')}
              checked={custom}
              onChange={() => {
                setHeight(String(custom ? Math.ceil(spacer.lift / HEIGHT_UNIT) : spacer.lift));
                setCustom(!custom);
              }}
            />
            <div>
              <span className="text-xs text-content-tertiary">
                {t(custom ? 'spacers.mm' : 'spacers.units')}
              </span>
              <Stepper
                key={String(custom)}
                fullWidth
                aria-label={t(custom ? 'spacers.mm' : 'spacers.units')}
                value={Number(height)}
                min={custom ? HEIGHT_UNIT : 1}
                max={Number.MAX_SAFE_INTEGER}
                inputDecimals={custom ? 6 : 0}
                step={custom ? 0.1 : 1}
                onChange={(n) => setHeight(String(custom ? n : Math.round(n)))}
                onStep={(delta) =>
                  setHeight(
                    String(
                      Math.max(
                        custom ? HEIGHT_UNIT : 1,
                        Number((Number(height) + delta * (custom ? 0.1 : 1)).toFixed(6))
                      )
                    )
                  )
                }
              />
            </div>
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

            <FeatureToggle
              label={t('spacers.perimeter')}
              checked={perimeter}
              onChange={() => setPerimeter(!perimeter)}
            />
            {perimeter && (
              <>
                <FeatureToggle
                  label={t('spacers.undersideNotches')}
                  checked={undersideNotches}
                  onChange={() => setUndersideNotches(!undersideNotches)}
                />
                <FeatureToggle
                  label={t('spacers.topNotches')}
                  checked={topNotches}
                  onChange={() => setTopNotches(!topNotches)}
                />
              </>
            )}
            {valid && (
              <details className="border-t border-stroke-subtle pt-3">
                <summary className="cursor-pointer">{t('spacers.section')}</summary>
                <SideSection {...spacer} />
              </details>
            )}
          </div>
        </aside>
        <main className="relative min-w-0 flex-1 overflow-hidden max-md:flex-none max-md:h-[44dvh]">
          {mesh ? (
            <>
              <SpacerPreview
                mesh={mesh}
                width={spacer.width}
                depth={spacer.depth}
                height={spacer.lift + pocketHeight}
              />
              <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-surface-secondary px-3 py-2 text-xs text-content-secondary shadow-sm">
                {t('spacers.mm')}: {spacer.lift} mm · {t('spacers.height')}:{' '}
                {Number((spacer.lift + pocketHeight).toFixed(4))} mm
              </p>
            </>
          ) : (
            <p role="alert" className="p-5">
              {t('spacers.invalid')}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
