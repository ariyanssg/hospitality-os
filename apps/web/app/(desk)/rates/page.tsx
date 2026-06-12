'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  DoorOpen,
  FilePlus2,
  Filter,
  Globe2,
  Layers3,
  LockKeyhole,
  Megaphone,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { Badge, Button, Input, Skeleton, cn } from '@vela/ui';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

type WorkspaceTab = 'plans' | 'promotions' | 'rules' | 'taxes' | 'channels';
type PlanStatus = 'draft' | 'approval' | 'published' | 'paused';
type RateType = 'bar' | 'corporate' | 'package' | 'member' | 'wholesale' | 'promotional';
type PromotionType =
  | 'none'
  | 'promo_code'
  | 'early_booker'
  | 'last_minute'
  | 'los_discount'
  | 'free_night';
type PricingModel =
  | 'fixed'
  | 'derived_percent'
  | 'derived_amount'
  | 'occupancy'
  | 'los_tiered'
  | 'open_pricing';
type TaxMode = 'exclusive' | 'inclusive';
type ChargeBasis = 'percent' | 'per_night' | 'per_person_per_night' | 'flat';

interface ChargeRule {
  id: string;
  code: string;
  name: string;
  value: number;
  basis: ChargeBasis;
  mode: TaxMode;
  gl: string;
}

interface StayRule {
  id: string;
  label: string;
  value: string;
  tone: 'neutral' | 'positive' | 'caution' | 'critical' | 'info' | 'accent';
}

interface RateCell {
  date: string;
  roomType: string;
  amount: number;
  minStay?: number;
  maxStay?: number;
  cta?: boolean;
  ctd?: boolean;
  stopSell?: boolean;
}

interface RatePlanModel {
  id: string;
  code: string;
  name: string;
  status: PlanStatus;
  rateType: RateType;
  promotionType: PromotionType;
  promoCode: string;
  currency: string;
  sellStart: string;
  sellEnd: string;
  stayStart: string;
  stayEnd: string;
  mealPlan: string;
  pricingModel: PricingModel;
  derivedFrom: string;
  adjustment: number;
  minStay: number;
  maxStay: number;
  minAdvanceDays: number;
  maxAdvanceDays: number;
  roomTypes: string[];
  roomNumbers: string[];
  daysOfWeek: string[];
  channels: string[];
  serviceCharges: ChargeRule[];
  taxes: ChargeRule[];
  customRules: StayRule[];
  grid: RateCell[];
  pickup: number;
  adrDelta: number;
  approvalOwner: string;
}

const TABS: Array<[WorkspaceTab, string]> = [
  ['plans', 'Plans'],
  ['promotions', 'Promotions'],
  ['rules', 'Rules'],
  ['taxes', 'Taxes'],
  ['channels', 'Channels'],
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_ROOM_TYPES = ['KING', 'DLX', 'STD', 'FAM'];
const DEFAULT_ROOMS = ['101', '102', '108', '114', '201', '204', '311', '412'];
const CHANNELS = ['Direct', 'Booking engine', 'Booking.com', 'Expedia', 'GDS', 'Corporate'];

const SELECT_CLASS =
  'flex h-[var(--control-h)] w-full rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[var(--cell-px)] text-[var(--font-size-ui)] text-[var(--ink-primary)] focus-visible:border-[var(--line-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-focus)]';
const PANEL =
  'overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]';
const TH =
  'sticky top-0 z-[2] h-9 whitespace-nowrap border-b border-[var(--line-hairline)] bg-[var(--bg-raised)] px-3 text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)]';
const TD = 'h-12 whitespace-nowrap border-b border-[var(--line-hairline)] px-3 align-middle';

const SAMPLE_PLANS: RatePlanModel[] = [
  {
    id: 'bar-flex',
    code: 'BAR-FLEX',
    name: 'Best Flexible Rate',
    status: 'published',
    rateType: 'bar',
    promotionType: 'none',
    promoCode: '',
    currency: 'USD',
    sellStart: '2026-06-01',
    sellEnd: '2026-12-31',
    stayStart: '2026-06-01',
    stayEnd: '2027-01-03',
    mealPlan: 'Room only',
    pricingModel: 'open_pricing',
    derivedFrom: 'None',
    adjustment: 0,
    minStay: 1,
    maxStay: 21,
    minAdvanceDays: 0,
    maxAdvanceDays: 365,
    roomTypes: ['KING', 'DLX', 'STD'],
    roomNumbers: [],
    daysOfWeek: DAYS,
    channels: ['Direct', 'Booking engine', 'Booking.com', 'Expedia', 'GDS'],
    serviceCharges: [
      {
        id: 'svc-12',
        code: 'SVC',
        name: 'Service charge',
        value: 12,
        basis: 'percent',
        mode: 'exclusive',
        gl: '4200',
      },
    ],
    taxes: [
      {
        id: 'occ-10',
        code: 'OCC',
        name: 'Occupancy tax',
        value: 10,
        basis: 'percent',
        mode: 'exclusive',
        gl: '2100',
      },
      {
        id: 'city-3',
        code: 'CITY',
        name: 'City levy',
        value: 3,
        basis: 'per_person_per_night',
        mode: 'exclusive',
        gl: '2105',
      },
    ],
    customRules: [
      { id: 'floor', label: 'Rate floor', value: '>= 165 USD', tone: 'positive' },
      { id: 'arrival', label: 'CTA', value: 'Sat on event dates', tone: 'caution' },
      { id: 'override', label: 'Override', value: 'manager approval', tone: 'info' },
    ],
    grid: [
      { date: 'Jun 14', roomType: 'KING', amount: 258, minStay: 1 },
      { date: 'Jun 14', roomType: 'DLX', amount: 438, minStay: 2 },
      { date: 'Jun 14', roomType: 'STD', amount: 188, minStay: 1 },
      { date: 'Jun 15', roomType: 'KING', amount: 262, minStay: 1, cta: true },
      { date: 'Jun 15', roomType: 'DLX', amount: 452, minStay: 2 },
      { date: 'Jun 15', roomType: 'STD', amount: 192, minStay: 1 },
      { date: 'Jun 16', roomType: 'KING', amount: 276, minStay: 2 },
      { date: 'Jun 16', roomType: 'DLX', amount: 468, minStay: 2, stopSell: true },
      { date: 'Jun 16', roomType: 'STD', amount: 204, minStay: 1 },
    ],
    pickup: 42,
    adrDelta: 8,
    approvalOwner: 'Revenue manager',
  },
  {
    id: 'advance-bb',
    code: 'ADV-BB',
    name: 'Advance Breakfast Saver',
    status: 'approval',
    rateType: 'promotional',
    promotionType: 'early_booker',
    promoCode: 'EARLY30',
    currency: 'USD',
    sellStart: '2026-06-10',
    sellEnd: '2026-09-30',
    stayStart: '2026-07-01',
    stayEnd: '2026-10-31',
    mealPlan: 'Bed and breakfast',
    pricingModel: 'derived_percent',
    derivedFrom: 'BAR-FLEX',
    adjustment: -12,
    minStay: 2,
    maxStay: 14,
    minAdvanceDays: 30,
    maxAdvanceDays: 180,
    roomTypes: ['KING', 'DLX'],
    roomNumbers: ['108', '201', '204'],
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Sun'],
    channels: ['Direct', 'Booking engine'],
    serviceCharges: [
      {
        id: 'svc-10',
        code: 'SVC',
        name: 'Service charge',
        value: 10,
        basis: 'percent',
        mode: 'inclusive',
        gl: '4200',
      },
    ],
    taxes: [
      {
        id: 'vat-8',
        code: 'VAT',
        name: 'VAT',
        value: 8,
        basis: 'percent',
        mode: 'inclusive',
        gl: '2100',
      },
    ],
    customRules: [
      { id: 'book', label: 'Book by', value: '30 days prior', tone: 'accent' },
      { id: 'blackout', label: 'Blackout', value: 'Jul 3-5', tone: 'critical' },
      { id: 'package', label: 'Package', value: 'breakfast daily', tone: 'positive' },
    ],
    grid: [
      { date: 'Jun 14', roomType: 'KING', amount: 227, minStay: 2 },
      { date: 'Jun 14', roomType: 'DLX', amount: 385, minStay: 2 },
      { date: 'Jun 15', roomType: 'KING', amount: 231, minStay: 2 },
      { date: 'Jun 15', roomType: 'DLX', amount: 398, minStay: 2, ctd: true },
      { date: 'Jun 16', roomType: 'KING', amount: 243, minStay: 3 },
      { date: 'Jun 16', roomType: 'DLX', amount: 412, minStay: 3 },
    ],
    pickup: 18,
    adrDelta: -12,
    approvalOwner: 'Director of rooms',
  },
  {
    id: 'corp-net',
    code: 'CORP-NET',
    name: 'Corporate Net Rate',
    status: 'paused',
    rateType: 'corporate',
    promotionType: 'promo_code',
    promoCode: 'ACME26',
    currency: 'USD',
    sellStart: '2026-01-01',
    sellEnd: '2026-12-31',
    stayStart: '2026-01-01',
    stayEnd: '2026-12-31',
    mealPlan: 'Half board',
    pricingModel: 'derived_amount',
    derivedFrom: 'BAR-FLEX',
    adjustment: -35,
    minStay: 1,
    maxStay: 30,
    minAdvanceDays: 0,
    maxAdvanceDays: 365,
    roomTypes: ['KING', 'STD'],
    roomNumbers: [],
    daysOfWeek: DAYS,
    channels: ['Direct', 'Corporate', 'GDS'],
    serviceCharges: [],
    taxes: [
      {
        id: 'occ-10-corp',
        code: 'OCC',
        name: 'Occupancy tax',
        value: 10,
        basis: 'percent',
        mode: 'exclusive',
        gl: '2100',
      },
    ],
    customRules: [
      { id: 'profile', label: 'Profile gated', value: 'ACME only', tone: 'info' },
      { id: 'suppress', label: 'Suppressed', value: 'hide public price', tone: 'neutral' },
    ],
    grid: [
      { date: 'Jun 14', roomType: 'KING', amount: 223, minStay: 1 },
      { date: 'Jun 14', roomType: 'STD', amount: 153, minStay: 1 },
      { date: 'Jun 15', roomType: 'KING', amount: 227, minStay: 1 },
      { date: 'Jun 15', roomType: 'STD', amount: 157, minStay: 1 },
      { date: 'Jun 16', roomType: 'KING', amount: 241, minStay: 1 },
      { date: 'Jun 16', roomType: 'STD', amount: 169, minStay: 1 },
    ],
    pickup: 7,
    adrDelta: -5,
    approvalOwner: 'Sales director',
  },
];

function statusTone(status: PlanStatus): 'neutral' | 'positive' | 'caution' | 'info' {
  if (status === 'published') return 'positive';
  if (status === 'approval') return 'caution';
  if (status === 'paused') return 'neutral';
  return 'info';
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function uniq(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean);
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn('space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]', className)}
    >
      {label}
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={SELECT_CLASS}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ToggleChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-7 items-center justify-center rounded-[var(--radius-sm)] border px-2.5 text-[12px] transition-colors',
        active
          ? 'border-transparent bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
          : 'border-[var(--line-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]',
      )}
    >
      {children}
    </button>
  );
}

function PlanList({
  plans,
  activeId,
  onSelect,
}: {
  plans: RatePlanModel[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className={PANEL}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line-hairline)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Layers3 className="size-4 text-[var(--ink-accent)]" />
          <h2 className="text-[var(--text-heading)] font-semibold">Portfolio</h2>
        </div>
        <Badge tone="neutral">{plans.length}</Badge>
      </div>
      <div className="divide-y divide-[var(--line-hairline)]">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className={cn(
              'grid w-full grid-cols-[1fr_auto] gap-3 px-4 py-3 text-left transition-colors',
              activeId === plan.id
                ? 'bg-[var(--interactive-selected)]'
                : 'hover:bg-[var(--bg-sunken)]',
            )}
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[12.5px] font-semibold text-[var(--ink-primary)]">
                  {plan.code}
                </span>
                <Badge tone={statusTone(plan.status)}>{plan.status}</Badge>
              </span>
              <span className="mt-1 block truncate text-[13px] font-medium">{plan.name}</span>
              <span className="mt-1 block truncate text-[11.5px] text-[var(--ink-tertiary)]">
                {plan.sellStart} to {plan.sellEnd}
              </span>
            </span>
            <span className="grid place-items-center text-[var(--ink-tertiary)]">
              <ChevronRight className="size-4" />
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function KpiStrip({ plans }: { plans: RatePlanModel[] }) {
  const published = plans.filter((plan) => plan.status === 'published').length;
  const promos = plans.filter((plan) => plan.promotionType !== 'none').length;
  const restricted = plans
    .flatMap((plan) => plan.grid)
    .filter((cell) => cell.cta || cell.ctd || cell.stopSell).length;
  const channelMaps = plans.reduce((total, plan) => total + plan.channels.length, 0);
  const tiles = [
    {
      label: 'Published plans',
      value: published,
      sub: `${plans.length} configured`,
      icon: ShieldCheck,
    },
    { label: 'Promotion rules', value: promos, sub: 'code, LOS, package', icon: BadgePercent },
    {
      label: 'Restricted nights',
      value: restricted,
      sub: 'CTA, CTD, stop sell',
      icon: LockKeyhole,
    },
    { label: 'Channel maps', value: channelMaps, sub: 'ready to distribute', icon: Globe2 },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div key={tile.label} className={cn(PANEL, 'px-4 py-3')}>
            <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink-tertiary)]">
              <Icon className="size-4 text-[var(--ink-accent)]" />
              {tile.label}
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-display text-[24px] font-semibold leading-none">
                {tile.value}
              </span>
              <span className="pb-0.5 text-[12px] text-[var(--ink-tertiary)]">{tile.sub}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RateMatrix({ plan }: { plan: RatePlanModel }) {
  const dates = uniq(plan.grid.map((cell) => cell.date));
  const roomTypes = uniq(plan.grid.map((cell) => cell.roomType));

  return (
    <div className={PANEL}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-hairline)] px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[var(--ink-accent)]" />
          <h2 className="text-[var(--text-heading)] font-semibold">Pricing matrix</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge tone="accent">{plan.pricingModel.replaceAll('_', ' ')}</Badge>
          <Badge tone="neutral">{plan.currency}</Badge>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="min-w-[620px] border-collapse">
          <thead>
            <tr>
              <th className={TH}>Room type</th>
              {dates.map((date) => (
                <th key={date} className={TH}>
                  {date}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roomTypes.map((roomType) => (
              <tr key={roomType} className="hover:bg-[var(--bg-sunken)]">
                <td className={TD}>
                  <span className="inline-flex items-center gap-2 font-mono font-semibold">
                    <DoorOpen className="size-3.5 text-[var(--ink-tertiary)]" />
                    {roomType}
                  </span>
                </td>
                {dates.map((date) => {
                  const cell = plan.grid.find(
                    (entry) => entry.date === date && entry.roomType === roomType,
                  );
                  return (
                    <td key={`${roomType}-${date}`} className={TD}>
                      {cell ? (
                        <div className="flex min-w-[128px] items-center justify-between gap-2">
                          <span className="font-mono text-[13px] font-semibold">
                            {money(cell.amount, plan.currency)}
                          </span>
                          <span className="flex gap-1">
                            {cell.minStay ? <Badge tone="info">{cell.minStay}N</Badge> : null}
                            {cell.cta ? <Badge tone="caution">CTA</Badge> : null}
                            {cell.ctd ? <Badge tone="caution">CTD</Badge> : null}
                            {cell.stopSell ? <Badge tone="critical">Stop</Badge> : null}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[var(--ink-tertiary)]">Not eligible</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RuleTimeline({ plan }: { plan: RatePlanModel }) {
  return (
    <div className={PANEL}>
      <div className="border-b border-[var(--line-hairline)] px-4 py-3">
        <h2 className="text-[var(--text-heading)] font-semibold">Rule stack</h2>
      </div>
      <div className="space-y-3 p-4">
        {plan.customRules.map((rule, index) => (
          <div key={rule.id} className="grid grid-cols-[24px_1fr] gap-3">
            <span className="grid size-6 place-items-center rounded-full bg-[var(--bg-sunken)] font-mono text-[11px] text-[var(--ink-tertiary)]">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold">{rule.label}</span>
                <Badge tone={rule.tone}>{rule.value}</Badge>
              </span>
              <span className="mt-1 block text-[12px] text-[var(--ink-tertiary)]">
                Applies after eligibility and before taxes.
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChargesTable({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof ReceiptText;
  rows: ChargeRule[];
}) {
  return (
    <div className={PANEL}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line-hairline)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-[var(--ink-accent)]" />
          <h2 className="text-[var(--text-heading)] font-semibold">{title}</h2>
        </div>
        <Badge tone="neutral">{rows.length}</Badge>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr>
              <th className={TH}>Code</th>
              <th className={TH}>Basis</th>
              <th className={TH}>Mode</th>
              <th className={TH}>GL</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={cn(TD, 'text-center text-[var(--ink-tertiary)]')} colSpan={4}>
                  No configured charges.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--bg-sunken)]">
                  <td className={TD}>
                    <span className="font-mono font-semibold">{row.code}</span>
                    <span className="ml-2 text-[12px] text-[var(--ink-tertiary)]">{row.name}</span>
                  </td>
                  <td className={TD}>
                    <span className="font-mono text-[12px]">
                      {row.value}
                      {row.basis === 'percent' ? '%' : ''}
                    </span>
                    <span className="ml-2 text-[12px] text-[var(--ink-tertiary)]">
                      {row.basis.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className={TD}>
                    <Badge tone={row.mode === 'inclusive' ? 'accent' : 'neutral'}>{row.mode}</Badge>
                  </td>
                  <td className={TD}>
                    <span className="font-mono text-[12px]">{row.gl}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChannelPanel({
  plan,
  onToggle,
}: {
  plan: RatePlanModel;
  onToggle: (channel: string) => void;
}) {
  return (
    <div className={PANEL}>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line-hairline)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Globe2 className="size-4 text-[var(--ink-accent)]" />
          <h2 className="text-[var(--text-heading)] font-semibold">Distribution</h2>
        </div>
        <Badge tone="positive">{plan.channels.length} enabled</Badge>
      </div>
      <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-3">
        {CHANNELS.map((channel) => {
          const active = plan.channels.includes(channel);
          return (
            <button
              key={channel}
              type="button"
              onClick={() => onToggle(channel)}
              className={cn(
                'flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors',
                active
                  ? 'border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] text-[var(--status-positive-ink)]'
                  : 'border-[var(--line-hairline)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]',
              )}
            >
              <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--bg-surface)]">
                {active ? <CheckCircle2 className="size-4" /> : <Globe2 className="size-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{channel}</span>
                <span className="block text-[11.5px] opacity-80">
                  {active ? 'Mapped and publishable' : 'Held out'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Inspector({
  plan,
  roomTypes,
  roomNumbers,
  canManage,
  onPatch,
  onToggleList,
  onAddRule,
}: {
  plan: RatePlanModel;
  roomTypes: string[];
  roomNumbers: string[];
  canManage: boolean;
  onPatch: (patch: Partial<RatePlanModel>) => void;
  onToggleList: (key: 'roomTypes' | 'roomNumbers' | 'daysOfWeek', value: string) => void;
  onAddRule: () => void;
}) {
  return (
    <aside className={PANEL}>
      <div className="flex items-start justify-between gap-3 border-b border-[var(--line-hairline)] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-[var(--ink-accent)]" />
            <h2 className="truncate text-[var(--text-heading)] font-semibold">{plan.code}</h2>
          </div>
          <p className="mt-1 truncate text-[12px] text-[var(--ink-tertiary)]">{plan.name}</p>
        </div>
        <Badge tone={statusTone(plan.status)}>{plan.status}</Badge>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code">
            <Input
              disabled={!canManage}
              value={plan.code}
              onChange={(event) => onPatch({ code: event.target.value })}
            />
          </Field>
          <SelectField
            label="Status"
            value={plan.status}
            options={['draft', 'approval', 'published', 'paused']}
            onChange={(value) => onPatch({ status: value as PlanStatus })}
          />
        </div>
        <Field label="Name">
          <Input
            disabled={!canManage}
            value={plan.name}
            onChange={(event) => onPatch({ name: event.target.value })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Rate type"
            value={plan.rateType}
            options={['bar', 'corporate', 'package', 'member', 'wholesale', 'promotional']}
            onChange={(value) => onPatch({ rateType: value as RateType })}
          />
          <SelectField
            label="Promotion type"
            value={plan.promotionType}
            options={[
              'none',
              'promo_code',
              'early_booker',
              'last_minute',
              'los_discount',
              'free_night',
            ]}
            onChange={(value) => onPatch({ promotionType: value as PromotionType })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sell start">
            <Input
              disabled={!canManage}
              type="date"
              value={plan.sellStart}
              onChange={(event) => onPatch({ sellStart: event.target.value })}
            />
          </Field>
          <Field label="Sell end">
            <Input
              disabled={!canManage}
              type="date"
              value={plan.sellEnd}
              onChange={(event) => onPatch({ sellEnd: event.target.value })}
            />
          </Field>
          <Field label="Stay start">
            <Input
              disabled={!canManage}
              type="date"
              value={plan.stayStart}
              onChange={(event) => onPatch({ stayStart: event.target.value })}
            />
          </Field>
          <Field label="Stay end">
            <Input
              disabled={!canManage}
              type="date"
              value={plan.stayEnd}
              onChange={(event) => onPatch({ stayEnd: event.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Pricing model"
            value={plan.pricingModel}
            options={[
              'fixed',
              'derived_percent',
              'derived_amount',
              'occupancy',
              'los_tiered',
              'open_pricing',
            ]}
            onChange={(value) => onPatch({ pricingModel: value as PricingModel })}
          />
          <SelectField
            label="Meal plan"
            value={plan.mealPlan}
            options={[
              'Room only',
              'Bed and breakfast',
              'Half board',
              'Full board',
              'All inclusive',
            ]}
            onChange={(value) => onPatch({ mealPlan: value })}
          />
          <Field label="Derived from">
            <Input
              disabled={!canManage}
              value={plan.derivedFrom}
              onChange={(event) => onPatch({ derivedFrom: event.target.value })}
            />
          </Field>
          <Field label="Adjustment">
            <Input
              disabled={!canManage}
              type="number"
              value={plan.adjustment}
              onChange={(event) => onPatch({ adjustment: Number(event.target.value) })}
            />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Min stay">
            <Input
              disabled={!canManage}
              type="number"
              min={1}
              value={plan.minStay}
              onChange={(event) => onPatch({ minStay: Number(event.target.value) })}
            />
          </Field>
          <Field label="Max stay">
            <Input
              disabled={!canManage}
              type="number"
              min={1}
              value={plan.maxStay}
              onChange={(event) => onPatch({ maxStay: Number(event.target.value) })}
            />
          </Field>
          <Field label="Min advance">
            <Input
              disabled={!canManage}
              type="number"
              min={0}
              value={plan.minAdvanceDays}
              onChange={(event) => onPatch({ minAdvanceDays: Number(event.target.value) })}
            />
          </Field>
          <Field label="Max advance">
            <Input
              disabled={!canManage}
              type="number"
              min={0}
              value={plan.maxAdvanceDays}
              onChange={(event) => onPatch({ maxAdvanceDays: Number(event.target.value) })}
            />
          </Field>
        </div>
        <Field label="Promo code">
          <Input
            disabled={!canManage || plan.promotionType === 'none'}
            value={plan.promoCode}
            placeholder="Optional"
            onChange={(event) => onPatch({ promoCode: event.target.value.toUpperCase() })}
          />
        </Field>

        <div className="space-y-2">
          <div className="text-[12px] font-medium text-[var(--ink-secondary)]">Room types</div>
          <div className="flex flex-wrap gap-1.5">
            {roomTypes.map((roomType) => (
              <ToggleChip
                key={roomType}
                active={plan.roomTypes.includes(roomType)}
                onClick={() => onToggleList('roomTypes', roomType)}
              >
                {roomType}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[12px] font-medium text-[var(--ink-secondary)]">Room numbers</div>
          <div className="flex flex-wrap gap-1.5">
            {roomNumbers.map((roomNumber) => (
              <ToggleChip
                key={roomNumber}
                active={plan.roomNumbers.includes(roomNumber)}
                onClick={() => onToggleList('roomNumbers', roomNumber)}
              >
                {roomNumber}
              </ToggleChip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[12px] font-medium text-[var(--ink-secondary)]">Stay days</div>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((day) => (
              <ToggleChip
                key={day}
                active={plan.daysOfWeek.includes(day)}
                onClick={() => onToggleList('daysOfWeek', day)}
              >
                {day}
              </ToggleChip>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={!canManage}
          onClick={onAddRule}
        >
          <Plus className="size-4" /> Add custom stay rule
        </Button>
      </div>
    </aside>
  );
}

export default function RatesPage() {
  const sdk = useSdk();
  const showToast = useToast((s) => s.show);
  const propertyId = useSession((s) => s.activePropertyId);
  const canManage = useCan('rate.manage') || useCan('promotion.manage');
  const [plans, setPlans] = useState<RatePlanModel[]>(SAMPLE_PLANS);
  const [activePlanId, setActivePlanId] = useState(SAMPLE_PLANS[0]!.id);
  const [tab, setTab] = useState<WorkspaceTab>('plans');

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['settings-catalog', propertyId],
    queryFn: () => sdk.settingsCatalog(),
    enabled: !!propertyId,
  });

  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? plans[0]!;
  const roomTypes = useMemo(
    () =>
      uniq([...(catalog?.roomTypes.map((roomType) => roomType.code) ?? []), ...DEFAULT_ROOM_TYPES]),
    [catalog],
  );
  const roomNumbers = useMemo(
    () =>
      uniq([...(catalog?.rooms.map((room) => room.number) ?? []), ...DEFAULT_ROOMS]).slice(0, 16),
    [catalog],
  );

  const patchPlan = (patch: Partial<RatePlanModel>) => {
    setPlans((current) =>
      current.map((plan) => (plan.id === activePlan.id ? { ...plan, ...patch } : plan)),
    );
  };

  const toggleList = (key: 'roomTypes' | 'roomNumbers' | 'daysOfWeek', value: string) => {
    setPlans((current) =>
      current.map((plan) => {
        if (plan.id !== activePlan.id) return plan;
        const values = plan[key];
        const next = values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value];
        return { ...plan, [key]: next };
      }),
    );
  };

  const toggleChannel = (channel: string) => {
    setPlans((current) =>
      current.map((plan) => {
        if (plan.id !== activePlan.id) return plan;
        const channels = plan.channels.includes(channel)
          ? plan.channels.filter((item) => item !== channel)
          : [...plan.channels, channel];
        return { ...plan, channels };
      }),
    );
  };

  const addRule = () => {
    setPlans((current) =>
      current.map((plan) =>
        plan.id === activePlan.id
          ? {
              ...plan,
              customRules: [
                ...plan.customRules,
                {
                  id: `rule-${Date.now()}`,
                  label: 'Custom stay rule',
                  value: 'manual review',
                  tone: 'info',
                },
              ],
            }
          : plan,
      ),
    );
    showToast({ tone: 'positive', text: 'Custom stay rule added' });
  };

  const duplicatePlan = () => {
    const copy: RatePlanModel = {
      ...activePlan,
      id: `${activePlan.id}-copy-${Date.now()}`,
      code: `${activePlan.code}-COPY`,
      name: `${activePlan.name} Copy`,
      status: 'draft',
    };
    setPlans((current) => [copy, ...current]);
    setActivePlanId(copy.id);
    showToast({ tone: 'positive', text: 'Rate plan duplicated' });
  };

  const publishPlan = () => {
    patchPlan({ status: 'published' });
    showToast({ tone: 'positive', text: `${activePlan.code} queued for publish` });
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Rate Plans & Promotions
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Plan eligibility, stay rules, pricing, taxes, and channel distribution in one publish
            flow.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={canManage ? 'positive' : 'neutral'}>
            {canManage ? 'Manage' : 'Read only'}
          </Badge>
          <Button type="button" variant="secondary" disabled={!canManage} onClick={duplicatePlan}>
            <Copy className="size-4" /> Duplicate
          </Button>
          <Button type="button" disabled={!canManage} onClick={publishPlan}>
            <Send className="size-4" /> Publish
          </Button>
        </div>
      </div>

      <KpiStrip plans={plans} />

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
        <PlanList plans={plans} activeId={activePlan.id} onSelect={setActivePlanId} />

        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[3px]">
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-[12px] transition-colors',
                    tab === key
                      ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                      : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] transition-colors hover:bg-[var(--bg-sunken)]">
                <Filter className="size-3.5" /> Segment
              </button>
              <button className="inline-flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 text-[12.5px] transition-colors hover:bg-[var(--bg-sunken)]">
                <Pencil className="size-3.5" /> Bulk edit
              </button>
            </div>
          </div>

          {catalogLoading ? (
            <div className={cn(PANEL, 'space-y-3 p-4')}>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-[260px] w-full" />
            </div>
          ) : tab === 'plans' ? (
            <>
              <RateMatrix plan={activePlan} />
              <RuleTimeline plan={activePlan} />
            </>
          ) : tab === 'promotions' ? (
            <div className={cn(PANEL, 'p-4')}>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-canvas)] p-3">
                  <Megaphone className="mb-2 size-4 text-[var(--ink-accent)]" />
                  <div className="text-[13px] font-semibold">Promo gate</div>
                  <div className="mt-1 font-mono text-[18px] font-semibold">
                    {activePlan.promoCode || 'OPEN'}
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--ink-tertiary)]">
                    {activePlan.promotionType.replaceAll('_', ' ')}
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-canvas)] p-3">
                  <Utensils className="mb-2 size-4 text-[var(--ink-accent)]" />
                  <div className="text-[13px] font-semibold">Meal plan</div>
                  <div className="mt-1 text-[18px] font-semibold">{activePlan.mealPlan}</div>
                  <div className="mt-1 text-[12px] text-[var(--ink-tertiary)]">
                    Posts through package rhythm
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-canvas)] p-3">
                  <Sparkles className="mb-2 size-4 text-[var(--ink-accent)]" />
                  <div className="text-[13px] font-semibold">Pickup</div>
                  <div className="mt-1 text-[18px] font-semibold">
                    {activePlan.pickup} room nights
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--ink-tertiary)]">
                    ADR delta {activePlan.adrDelta}%
                  </div>
                </div>
              </div>
            </div>
          ) : tab === 'rules' ? (
            <RuleTimeline plan={activePlan} />
          ) : tab === 'taxes' ? (
            <div className="grid gap-4 2xl:grid-cols-2">
              <ChargesTable title="Taxes" icon={ReceiptText} rows={activePlan.taxes} />
              <ChargesTable
                title="Service charges"
                icon={ClipboardCheck}
                rows={activePlan.serviceCharges}
              />
            </div>
          ) : (
            <ChannelPanel plan={activePlan} onToggle={toggleChannel} />
          )}
        </main>

        <Inspector
          plan={activePlan}
          roomTypes={roomTypes}
          roomNumbers={roomNumbers}
          canManage={canManage}
          onPatch={patchPlan}
          onToggleList={toggleList}
          onAddRule={addRule}
        />
      </div>

      <div className={cn(PANEL, 'flex flex-wrap items-center justify-between gap-3 px-4 py-3')}>
        <div className="flex min-w-0 items-center gap-2">
          <FilePlus2 className="size-4 text-[var(--ink-accent)]" />
          <span className="truncate text-[13px] font-medium">
            {activePlan.approvalOwner} reviews changes before rates become sellable.
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!canManage}
            onClick={() => showToast({ tone: 'info', text: 'Draft saved locally' })}
          >
            <Save className="size-3.5" /> Save draft
          </Button>
          <Button type="button" size="sm" disabled={!canManage} onClick={publishPlan}>
            <CheckCircle2 className="size-3.5" /> Approve & publish
          </Button>
        </div>
      </div>
    </div>
  );
}
