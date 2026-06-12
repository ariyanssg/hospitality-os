'use client';
import { useMemo, useState } from 'react';
import { Badge, Drawer } from '@vela/ui';
import { fmtMoney, STORE_NAME, type Recipe } from '@/lib/inventory-demo';
import { Card, CardHeader, TD, TD_NUM, TH, TH_NUM } from './shared';

type Quadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog';

const QUADRANT_META: Record<Quadrant, { label: string; color: string; tone: 'positive' | 'info' | 'caution' | 'critical'; advice: string }> = {
  star: { label: 'Star', color: 'var(--status-positive-ink)', tone: 'positive', advice: 'Protect: keep spec, watch portion drift' },
  plowhorse: { label: 'Plowhorse', color: 'var(--status-info-ink)', tone: 'info', advice: 'Re-engineer cost or nudge price' },
  puzzle: { label: 'Puzzle', color: 'var(--status-caution-ink)', tone: 'caution', advice: 'Promote: server push, menu placement' },
  dog: { label: 'Dog', color: 'var(--status-critical-ink)', tone: 'critical', advice: 'Replace or remove next menu cycle' },
};

interface Scored extends Recipe {
  marginMinor: number;
  costPct: number;
  quadrant: Quadrant;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function score(recipes: Recipe[]): Scored[] {
  const medianSold = median(recipes.map((r) => r.soldLast30));
  const medianMargin = median(recipes.map((r) => r.priceMinor - r.costMinor));
  return recipes.map((r) => {
    // integer minor units — ratio math for display only, the Money object owns real arithmetic
    const { priceMinor, costMinor } = r;
    const marginMinor = priceMinor - costMinor;
    const popular = r.soldLast30 >= medianSold;
    const profitable = marginMinor >= medianMargin;
    const quadrant: Quadrant = popular && profitable ? 'star' : popular ? 'plowhorse' : profitable ? 'puzzle' : 'dog';
    return { ...r, marginMinor, costPct: (costMinor / priceMinor) * 100, quadrant };
  });
}

/**
 * Recipes & F&B costing — theoretical cost per menu item and the menu-engineering matrix
 * (popularity × contribution margin → stars/plowhorses/puzzles/dogs, doc 04).
 */
export function RecipesSection({ recipes }: { recipes: Recipe[] }) {
  const [open, setOpen] = useState<Scored | null>(null);
  const scored = useMemo(() => score(recipes), [recipes]);

  // Scatter geometry — x: popularity, y: contribution margin
  const W = 640;
  const H = 360;
  const PAD = { l: 56, r: 20, t: 18, b: 40 };
  const maxSold = Math.max(...scored.map((r) => r.soldLast30)) * 1.1;
  const maxMargin = Math.max(...scored.map((r) => r.marginMinor)) * 1.12;
  const medianSold = median(scored.map((r) => r.soldLast30));
  const medianMargin = median(scored.map((r) => r.marginMinor));
  const x = (sold: number) => PAD.l + (sold / maxSold) * (W - PAD.l - PAD.r);
  const y = (margin: number) => H - PAD.b - (margin / maxMargin) * (H - PAD.t - PAD.b);

  return (
    <div className="space-y-[var(--space-4)]">
      <div className="grid gap-[var(--space-4)] xl:grid-cols-[1.2fr_1fr]">
        {/* Menu engineering quadrant */}
        <Card>
          <CardHeader
            title="Menu engineering — last 30 days"
            sub="Popularity × contribution margin · medians split the quadrants · dot size = revenue"
            right={
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(QUADRANT_META) as Quadrant[]).map((q) => (
                  <Badge key={q} tone={QUADRANT_META[q].tone} dot>
                    {QUADRANT_META[q].label}s
                  </Badge>
                ))}
              </div>
            }
          />
          <div className="p-[var(--space-3)]">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Menu engineering scatter">
              {/* Quadrant tint */}
              <rect
                x={x(medianSold)} y={PAD.t} width={W - PAD.r - x(medianSold)} height={y(medianMargin) - PAD.t}
                fill="var(--status-positive-bg)" opacity="0.35"
              />
              <rect
                x={PAD.l} y={y(medianMargin)} width={x(medianSold) - PAD.l} height={H - PAD.b - y(medianMargin)}
                fill="var(--status-critical-bg)" opacity="0.3"
              />
              {/* Median lines */}
              <line x1={x(medianSold)} y1={PAD.t} x2={x(medianSold)} y2={H - PAD.b} stroke="var(--ink-disabled)" strokeDasharray="4 4" strokeWidth="1" />
              <line x1={PAD.l} y1={y(medianMargin)} x2={W - PAD.r} y2={y(medianMargin)} stroke="var(--ink-disabled)" strokeDasharray="4 4" strokeWidth="1" />
              {/* Axes */}
              <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--line-hairline)" />
              <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--line-hairline)" />
              <text x={(PAD.l + W - PAD.r) / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--ink-tertiary)">
                Covers sold →
              </text>
              <text
                x={16} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" fontSize="11" fill="var(--ink-tertiary)"
                transform={`rotate(-90 16 ${(PAD.t + H - PAD.b) / 2})`}
              >
                Margin per cover →
              </text>
              {/* Quadrant captions */}
              <text x={W - PAD.r - 8} y={PAD.t + 16} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--status-positive-ink)">STARS</text>
              <text x={W - PAD.r - 8} y={H - PAD.b - 10} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--status-info-ink)">PLOWHORSES</text>
              <text x={PAD.l + 8} y={PAD.t + 16} fontSize="11" fontWeight="600" fill="var(--status-caution-ink)">PUZZLES</text>
              <text x={PAD.l + 8} y={H - PAD.b - 10} fontSize="11" fontWeight="600" fill="var(--status-critical-ink)">DOGS</text>
              {/* Dots */}
              {scored.map((r) => {
                const { soldLast30, priceMinor } = r;
                const revenue = soldLast30 * priceMinor;
                const radius = 5 + Math.sqrt(revenue) / 320;
                return (
                  <g key={r.id} className="cursor-pointer" onClick={() => setOpen(r)}>
                    <circle
                      cx={x(r.soldLast30)} cy={y(r.marginMinor)} r={radius}
                      fill={QUADRANT_META[r.quadrant].color} opacity="0.82"
                      stroke="var(--bg-surface)" strokeWidth="1.5"
                    />
                    <title>
                      {`${r.menuItem} — ${r.soldLast30} sold · ${fmtMoney(r.marginMinor)} margin · ${r.costPct.toFixed(0)}% cost`}
                    </title>
                  </g>
                );
              })}
            </svg>
          </div>
        </Card>

        {/* Quadrant action list */}
        <Card className="self-start">
          <CardHeader title="What to do about it" sub="Standard menu-engineering plays per quadrant" />
          <div>
            {(Object.keys(QUADRANT_META) as Quadrant[]).map((q, i) => {
              const inQuadrant = scored.filter((r) => r.quadrant === q);
              return (
                <div key={q} className={'px-[var(--space-4)] py-[var(--space-3)] ' + (i > 0 ? 'border-t border-[var(--line-hairline)]' : '')}>
                  <div className="flex items-center justify-between">
                    <Badge tone={QUADRANT_META[q].tone} dot>
                      {QUADRANT_META[q].label}s · {inQuadrant.length}
                    </Badge>
                    <span className="text-[11.5px] text-[var(--ink-tertiary)]">{QUADRANT_META[q].advice}</span>
                  </div>
                  <div className="mt-1.5 text-[12.5px] text-[var(--ink-secondary)]">
                    {inQuadrant.map((r) => r.menuItem).join(' · ') || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recipe register */}
      <Card>
        <CardHeader
          title="Recipe costing"
          sub="Theoretical cost recalculates when ingredient prices move; POS sales deplete the outlet store"
        />
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Menu item</th>
              <th className={TH}>Outlet</th>
              <th className={TH_NUM}>Price</th>
              <th className={TH_NUM}>Theoretical cost</th>
              <th className={TH_NUM}>Cost %</th>
              <th className={TH_NUM}>Sold (30d)</th>
              <th className={TH}>Class</th>
            </tr>
          </thead>
          <tbody>
            {[...scored]
              .sort((a, b) => b.soldLast30 * b.marginMinor - a.soldLast30 * a.marginMinor)
              .map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpen(r)}
                  className="cursor-pointer border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
                >
                  <td className={TD + ' font-medium'}>{r.menuItem}</td>
                  <td className={TD + ' text-[12.5px] text-[var(--ink-secondary)]'}>{STORE_NAME[r.outlet]}</td>
                  <td className={TD_NUM}>{fmtMoney(r.priceMinor)}</td>
                  <td className={TD_NUM + ' text-[var(--ink-secondary)]'}>{fmtMoney(r.costMinor)}</td>
                  <td
                    className={TD_NUM}
                    style={{ color: r.costPct > 38 ? 'var(--status-critical-ink)' : r.costPct > 32 ? 'var(--status-caution-ink)' : 'var(--fin-settled)' }}
                  >
                    {r.costPct.toFixed(1)}%
                  </td>
                  <td className={TD_NUM}>{r.soldLast30}</td>
                  <td className={TD}>
                    <Badge tone={QUADRANT_META[r.quadrant].tone} dot>{QUADRANT_META[r.quadrant].label}</Badge>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>

      {/* Recipe drawer */}
      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.menuItem ?? ''}
        description={
          open
            ? `${STORE_NAME[open.outlet]} · ${fmtMoney(open.priceMinor)} menu price · ${open.costPct.toFixed(1)}% theoretical cost`
            : undefined
        }
        width="md"
      >
        {open && (
          <div className="space-y-[var(--space-4)]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={QUADRANT_META[open.quadrant].tone} dot>{QUADRANT_META[open.quadrant].label}</Badge>
              <span className="text-[12.5px] text-[var(--ink-secondary)]">{QUADRANT_META[open.quadrant].advice}</span>
            </div>
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line-hairline)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Ingredient</th>
                    <th className={TH_NUM}>Qty</th>
                    <th className={TH_NUM}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {open.ingredients.map((ing) => (
                    <tr key={ing.name} className="border-b border-[var(--line-hairline)] last:border-0">
                      <td className={TD + ' text-[13px]'}>
                        {ing.name}
                        {ing.subRecipe && (
                          <Badge tone="accent" className="ml-2">Sub-recipe</Badge>
                        )}
                      </td>
                      <td className={TD_NUM + ' text-[var(--ink-secondary)]'}>
                        {ing.qty} {ing.uom}
                      </td>
                      <td className={TD_NUM}>{fmtMoney(ing.costMinor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--bg-raised)]">
                    <td className={TD + ' font-semibold'} colSpan={2}>Theoretical cost / cover</td>
                    <td className={TD_NUM + ' font-semibold'}>{fmtMoney(open.costMinor)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {open.allergens.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                  Allergens
                </span>
                {open.allergens.map((a) => (
                  <Badge key={a} tone="caution">{a}</Badge>
                ))}
                <span className="text-[11.5px] text-[var(--ink-tertiary)]">— propagates to menus & KDS</span>
              </div>
            )}
            <p className="text-[11.5px] text-[var(--ink-tertiary)]">
              Each POS sale theoretically depletes {STORE_NAME[open.outlet]}; period counts compare theoretical vs
              actual to surface shrinkage (doc 04).
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
