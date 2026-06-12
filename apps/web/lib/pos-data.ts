import type { LucideIcon } from 'lucide-react';
import {
  Cake,
  ConciergeBell,
  Fish,
  Flame,
  GlassWater,
  LayoutGrid,
  ListChecks,
  Martini,
  Salad,
  Soup,
  Sun,
  Utensils,
  Wine,
} from 'lucide-react';

/**
 * POS terminal catalog + floor geometry (design: "Vela POS Terminal", claude.ai/design handoff).
 * The check lifecycle (open → items → fire → settle/room-charge) is live against the API; this
 * module is the presentation-layer richness the backend doesn't model yet: menu engineering,
 * modifiers, table geometry, and tonight's service context.
 */

export type OutletKey = 'vista' | 'lagoon' | 'rs';
export type Station = 'grill' | 'fry' | 'pantry' | 'bar';

export interface OutletConfig {
  key: OutletKey;
  icon: LucideIcon;
  floorLabel: string;
  floorIcon: LucideIcon;
  serviceWindow: string;
  daypartChip: string;
}

/** Outlet personality keyed by the seeded `pos_outlets.code`. */
export const OUTLETS: Record<string, OutletConfig> = {
  VISTA: {
    key: 'vista',
    icon: Utensils,
    floorLabel: 'Floor',
    floorIcon: LayoutGrid,
    serviceWindow: 'Dinner · 17:00–22:30 · auto-switched',
    daypartChip: 'Dinner menu — switched 17:00',
  },
  LAGOON: {
    key: 'lagoon',
    icon: Sun,
    floorLabel: 'Tabs',
    floorIcon: LayoutGrid,
    serviceWindow: 'All-day · 10:00–sunset',
    daypartChip: 'All-day menu',
  },
  RS: {
    key: 'rs',
    icon: ConciergeBell,
    floorLabel: 'Queue',
    floorIcon: ListChecks,
    serviceWindow: '24 hours · 28-min promise',
    daypartChip: 'In-room dining — 24h',
  },
};

export interface MenuCategory {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const CATS: Record<OutletKey, MenuCategory[]> = {
  vista: [
    { id: 'raw', label: 'Raw bar', icon: Fish },
    { id: 'starters', label: 'Starters', icon: Salad },
    { id: 'mains', label: 'Mains', icon: Utensils },
    { id: 'grill', label: 'Grill', icon: Flame },
    { id: 'sides', label: 'Sides', icon: Soup },
    { id: 'desserts', label: 'Desserts', icon: Cake },
    { id: 'wine', label: 'Wine', icon: Wine },
    { id: 'cocktails', label: 'Cocktails', icon: Martini },
    { id: 'zero', label: 'Zero proof', icon: GlassWater },
  ],
  lagoon: [
    { id: 'beach', label: 'Beach favorites', icon: Sun },
    { id: 'cocktails', label: 'Cocktails', icon: Martini },
    { id: 'zero', label: 'Zero proof', icon: GlassWater },
    { id: 'wine', label: 'Wine', icon: Wine },
    { id: 'sides', label: 'Snacks', icon: Soup },
  ],
  rs: [
    { id: 'ird', label: 'All-day dining', icon: ConciergeBell },
    { id: 'desserts', label: 'Desserts', icon: Cake },
    { id: 'wine', label: 'Wine', icon: Wine },
    { id: 'zero', label: 'Zero proof', icon: GlassWater },
  ],
};

export interface PosMenuItem {
  id: string;
  cat: string;
  name: string;
  /** Minor units (cents). */
  price: number;
  station: Station;
  allergen?: string;
  veg?: boolean;
  bev?: boolean;
  mods?: keyof typeof MODS;
  popular?: boolean;
}

export const MENU: PosMenuItem[] = [
  { id: 'hamachi', cat: 'raw', name: 'Hamachi crudo', price: 2200, station: 'pantry', allergen: 'Fish' },
  { id: 'oysters', cat: 'raw', name: 'Oysters · ½ dozen', price: 2400, station: 'pantry', allergen: 'Shellfish' },
  { id: 'tostada', cat: 'raw', name: 'Tuna tostada', price: 1900, station: 'pantry', allergen: 'Fish' },
  { id: 'scallop', cat: 'raw', name: 'Diver scallop ceviche', price: 2100, station: 'pantry', allergen: 'Shellfish' },
  { id: 'octopus', cat: 'starters', name: 'Crisped octopus', price: 2400, station: 'grill', allergen: 'Shellfish' },
  { id: 'burrata', cat: 'starters', name: 'Burrata & charred peach', price: 1800, station: 'pantry', allergen: 'Dairy' },
  { id: 'tartare', cat: 'starters', name: 'Heirloom tomato tartare', price: 1600, station: 'pantry', veg: true },
  { id: 'sope', cat: 'starters', name: 'Sope de maíz azul', price: 1400, station: 'pantry', veg: true },
  { id: 'snapper', cat: 'mains', name: 'Snapper a la talla', price: 3600, station: 'grill', allergen: 'Fish', mods: 'snapper', popular: true },
  { id: 'chicken', cat: 'mains', name: 'Half chicken al pastor', price: 2900, station: 'grill' },
  { id: 'shortrib', cat: 'mains', name: 'Short rib adobo', price: 4200, station: 'grill' },
  { id: 'tetela', cat: 'mains', name: 'Mushroom tetela', price: 2600, station: 'pantry', veg: true },
  { id: 'lobster', cat: 'mains', name: 'Lobster pasta', price: 4400, station: 'pantry', allergen: 'Shellfish' },
  { id: 'ribeye', cat: 'grill', name: 'Ribeye · 30-day', price: 6800, station: 'grill', mods: 'temp' },
  { id: 'lamb', cat: 'grill', name: 'Lamb barbacoa', price: 4600, station: 'grill' },
  { id: 'prawns', cat: 'grill', name: 'Prawns a la plancha', price: 3800, station: 'grill', allergen: 'Shellfish' },
  { id: 'papas', cat: 'sides', name: 'Papas bravas', price: 900, station: 'fry', veg: true },
  { id: 'esquites', cat: 'sides', name: 'Esquites', price: 1000, station: 'pantry', veg: true },
  { id: 'asparagus', cat: 'sides', name: 'Grilled asparagus', price: 1100, station: 'grill', veg: true },
  { id: 'arroz', cat: 'sides', name: 'Arroz verde', price: 800, station: 'pantry', veg: true },
  { id: 'churros', cat: 'desserts', name: 'Churros & cajeta', price: 1200, station: 'pantry' },
  { id: 'flan', cat: 'desserts', name: 'Flan de coco', price: 1100, station: 'pantry' },
  { id: 'tamal', cat: 'desserts', name: 'Chocolate tamal', price: 1300, station: 'pantry' },
  { id: 'albarino', cat: 'wine', name: 'Albariño · glass', price: 1100, station: 'bar', bev: true },
  { id: 'rioja', cat: 'wine', name: 'Rioja crianza · glass', price: 1300, station: 'bar', bev: true },
  { id: 'champagne', cat: 'wine', name: 'Champagne · glass', price: 2200, station: 'bar', bev: true },
  { id: 'petnat', cat: 'wine', name: 'Pét-nat · bottle', price: 6400, station: 'bar', bev: true },
  { id: 'paloma', cat: 'cocktails', name: 'Vela paloma', price: 1600, station: 'bar', bev: true, popular: true },
  { id: 'negroni', cat: 'cocktails', name: 'Mezcal negroni', price: 1700, station: 'bar', bev: true },
  { id: 'spritz', cat: 'cocktails', name: 'Pool spritz', price: 1500, station: 'bar', bev: true },
  { id: 'tepache', cat: 'zero', name: 'Citrus tepache', price: 900, station: 'bar', bev: true },
  { id: 'yuzu', cat: 'zero', name: 'Yuzu soda', price: 800, station: 'bar', bev: true },
  { id: 'tacos', cat: 'beach', name: 'Baja tacos', price: 1400, station: 'fry', popular: true },
  { id: 'burger', cat: 'beach', name: 'Smash burger', price: 1900, station: 'grill', mods: 'temp' },
  { id: 'cocofries', cat: 'beach', name: 'Coco fries', price: 900, station: 'fry', veg: true },
  { id: 'paletas', cat: 'beach', name: 'Mango paletas', price: 600, station: 'pantry', veg: true },
  { id: 'club', cat: 'ird', name: 'GVOC club sandwich', price: 2100, station: 'pantry' },
  { id: 'rsomelet', cat: 'ird', name: 'Three-egg omelet', price: 1700, station: 'grill' },
  { id: 'rssalad', cat: 'ird', name: 'Little gem caesar', price: 1500, station: 'pantry' },
];

export const MENU_BY_ID = new Map(MENU.map((m) => [m.id, m]));
const MENU_BY_NAME = new Map(MENU.map((m) => [m.name, m]));

export interface ModOption {
  id: string;
  label: string;
  /** Price delta, minor units. */
  delta: number;
  allergen?: string;
}
export interface ModGroup {
  id: string;
  label: string;
  req: boolean;
  multi: boolean;
  opts: ModOption[];
}

export const MODS = {
  snapper: [
    {
      id: 'prep', label: 'Preparation', req: true, multi: false,
      opts: [
        { id: 'grilled', label: 'Grilled', delta: 0 },
        { id: 'roasted', label: 'Wood-roasted', delta: 0 },
        { id: 'vera', label: 'Veracruzana', delta: 300 },
      ],
    },
    {
      id: 'side', label: 'Choice of side', req: true, multi: false,
      opts: [
        { id: 'arroz', label: 'Arroz verde', delta: 0 },
        { id: 'papas', label: 'Papas bravas', delta: 0 },
        { id: 'esq', label: 'Esquites', delta: 200 },
        { id: 'asp', label: 'Grilled asparagus', delta: 300 },
      ],
    },
    {
      id: 'add', label: 'Additions', req: false, multi: true,
      opts: [
        { id: 'prawn', label: 'Grilled prawns', delta: 1200, allergen: 'Shellfish' },
        { id: 'macha', label: 'Salsa macha', delta: 200 },
      ],
    },
  ],
  temp: [
    {
      id: 'temp', label: 'Temperature', req: true, multi: false,
      opts: [
        { id: 'rare', label: 'Rare', delta: 0 },
        { id: 'mr', label: 'Medium rare', delta: 0 },
        { id: 'med', label: 'Medium', delta: 0 },
        { id: 'mw', label: 'Medium well', delta: 0 },
        { id: 'well', label: 'Well done', delta: 0 },
      ],
    },
    {
      id: 'sauce', label: 'Sauce', req: false, multi: true,
      opts: [
        { id: 'chimi', label: 'Chimichurri', delta: 200 },
        { id: 'pepper', label: 'Green peppercorn', delta: 300 },
      ],
    },
  ],
} satisfies Record<string, ModGroup[]>;

// ── Floor geometry (percent x/y on the stage, px w/h) keyed by the seeded table label ──
export interface TableGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  round: boolean;
  seats: number;
}

export const VISTA_GEOMETRY: Record<string, TableGeometry> = {
  '1': { x: 5, y: 10, w: 96, h: 96, round: true, seats: 4 },
  '2': { x: 20, y: 10, w: 96, h: 96, round: true, seats: 4 },
  '3': { x: 37, y: 11, w: 150, h: 84, round: false, seats: 6 },
  '4': { x: 5.5, y: 40, w: 80, h: 80, round: true, seats: 2 },
  '5': { x: 20, y: 40, w: 80, h: 80, round: true, seats: 2 },
  '6': { x: 37, y: 38, w: 150, h: 84, round: false, seats: 6 },
  '7': { x: 5, y: 66, w: 96, h: 96, round: true, seats: 4 },
  '8': { x: 19.5, y: 63, w: 130, h: 130, round: true, seats: 8 },
  '9': { x: 37, y: 65, w: 134, h: 82, round: false, seats: 4 },
  '10': { x: 61, y: 11, w: 80, h: 80, round: true, seats: 2 },
  '11': { x: 74.5, y: 11, w: 80, h: 80, round: true, seats: 2 },
  '12': { x: 61, y: 33, w: 96, h: 96, round: true, seats: 4 },
  '14': { x: 75.5, y: 33, w: 96, h: 96, round: true, seats: 4 },
  B1: { x: 61, y: 69, w: 54, h: 54, round: true, seats: 0 },
  B2: { x: 67.8, y: 69, w: 54, h: 54, round: true, seats: 0 },
  B3: { x: 74.6, y: 69, w: 54, h: 54, round: true, seats: 0 },
  B4: { x: 81.4, y: 69, w: 54, h: 54, round: true, seats: 0 },
  B5: { x: 88.2, y: 69, w: 54, h: 54, round: true, seats: 0 },
};

export const VISTA_SECTIONS = [
  { label: 'Dining room', icon: Utensils, x: 1.5, y: 3.5, w: 55, h: 94 },
  { label: 'Terrace', icon: Sun, x: 58.5, y: 3.5, w: 40, h: 57 },
  { label: 'Bar rail', icon: Martini, x: 58.5, y: 65, w: 40, h: 32.5 },
];

/** Tonight's service overlay (not backend-modeled): reservations, bar tabs on other terminals, flags. */
export interface TableOverlay {
  reserved?: { at: string; name: string };
  dirty?: boolean;
  /** Tab owned by another terminal — money shown, tap explains. */
  barBusy?: number;
  attention?: boolean;
  /** In-house hotel guest linked to the table (matches the seeded checked-in stays). */
  guest?: { name: string; room: string };
  /** The check is at the "check dropped" stage. */
  checkDropped?: boolean;
}

export const VISTA_OVERLAYS: Record<string, TableOverlay> = {
  '2': { checkDropped: true },
  '4': { attention: true },
  '6': { guest: { name: 'Nakamura, A.', room: '114' } },
  '7': { reserved: { at: '19:45', name: 'Vega ×4' } },
  '9': { dirty: true },
  '14': { guest: { name: 'Patel, P.', room: '105' } },
  B2: { barBusy: 3100 },
  B3: { barBusy: 5850 },
};

export const LAGOON_TAB_META: Record<string, { sub: string; guest?: { name: string; room: string } }> = {
  'Cabana 3': { sub: 'Visa •4242 — pre-auth $150' },
  'Swim-up 2': { sub: 'Nakamura — Room 114', guest: { name: 'Nakamura, A.', room: '114' } },
  'Walk-up': { sub: 'Card on file' },
};

export const TONIGHT_RESERVATIONS = [
  { time: '19:45', name: 'Vega, Marisol ×4', note: 'Table 7 held · tasting menu', chip: 'VIP' as const },
  { time: '20:15', name: 'Chen–Albright ×2', note: 'Anniversary — dessert card ready', chip: null },
  { time: '20:30', name: 'Nakamura, Akira ×3', note: 'Dinner on guest itinerary', chip: 'In-house · 114' as const },
  { time: '21:00', name: 'Brandt ×6', note: 'Auto-gratuity applies at 6+', chip: null },
];

export const WAITLIST_SEED = [
  { id: 'foster', name: 'Foster ×2', quoted: '15 min' },
  { id: 'iqbal', name: 'Iqbal ×5', quoted: '25 min' },
];

/** Room-service delivery queue (client demo — delivery tracking isn't backend-modeled yet). */
export const RS_SEED = [
  { id: 'RS-1031', room: '115', guest: 'Okafor, D.', items: 'GVOC club sandwich · Papas bravas · Yuzu soda', total: 3890, due: '20:05', step: 1, src: 'QR order & pay' },
  { id: 'RS-1030', room: '105', guest: 'Patel, P.', items: 'Champagne · Chocolate tamal', total: 3780, due: '19:55', step: 2, src: 'Phone' },
  { id: 'RS-1029', room: '108', guest: 'Vega, M. — VIP', items: 'Lobster pasta · Pét-nat bottle', total: 10800, due: '19:45', step: 3, src: 'Guest app' },
  { id: 'RS-1027', room: '114', guest: 'Nakamura, A.', items: 'Flan de coco', total: 1100, due: '19:20', step: 4, src: 'QR' },
];

/** Allergy flags from the PMS guest profile, surfaced on kitchen tickets — keyed by check number. */
export const TICKET_ALLERGIES: Record<string, string> = {
  '1041': 'Shellfish allergy — seat 2 · from PMS guest profile',
};

export const VIP_CHECKS = new Set(['1038']);

// ── Money + course-tag helpers ──

/** Format minor units: $1,234.50 (refunds get a true minus). */
export function fm(cents: number): string {
  const sign = cents < 0 ? '−' : '';
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Parse a contract MoneyJSON decimal string ("36.0000") to minor units. */
export function moneyToCents(m: { amount: string }): number {
  return Math.round(Number(m.amount) * 100);
}

export function centsToMoney(cents: number): { amount: string; currency: string } {
  return { amount: (cents / 100).toFixed(2), currency: 'USD' };
}

/**
 * Course tags ride in the item's `course` column: `C2·S1` (course 2, seat 1), `QS` (quick service),
 * `ADJ` (discount/comp adjustment line), `SVC` (service charge). The terminal renders from these.
 */
export function courseTag(course: number, seat: number): string {
  return `C${course}·S${seat}`;
}

export function parseCourseTag(tag: string | null): { kind: 'course'; course: number; seat: number } | { kind: 'qs' } | { kind: 'adj' } | { kind: 'svc' } {
  if (tag === 'ADJ') return { kind: 'adj' };
  if (tag === 'SVC') return { kind: 'svc' };
  const m = /^C(\d+)·S(\d+)$/.exec(tag ?? '');
  if (m) return { kind: 'course', course: Number(m[1]), seat: Number(m[2]) };
  return { kind: 'qs' };
}

/** Item names carry chosen modifiers after an em-dash: "Ribeye · 30-day — Medium rare". */
export function encodeItemName(name: string, mods: string[]): string {
  return mods.length ? `${name} — ${mods.join(' · ')}` : name;
}

export function decodeItemName(encoded: string): { name: string; mods: string[] } {
  const idx = encoded.indexOf(' — ');
  if (idx < 0) return { name: encoded, mods: [] };
  return { name: encoded.slice(0, idx), mods: encoded.slice(idx + 3).split(' · ') };
}

export function stationFor(encodedName: string): Station {
  const { name } = decodeItemName(encodedName);
  return MENU_BY_NAME.get(name)?.station ?? 'pantry';
}

export function menuItemFor(encodedName: string): PosMenuItem | undefined {
  return MENU_BY_NAME.get(decodeItemName(encodedName).name);
}

export function clockOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function mmss(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function hmm(totalMin: number): string {
  const m = Math.max(0, Math.floor(totalMin));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

// ── Manager analytics (preview surface — the live numbers come from closed checks) ──

export const MIX_BARS = [
  { label: 'Food', amt: '$5,634', pct: '58%', width: 58 },
  { label: 'Beverage', amt: '$2,137', pct: '22%', width: 22 },
  { label: 'Wine', amt: '$1,360', pct: '14%', width: 14 },
  { label: 'Dessert', amt: '$583', pct: '6%', width: 6 },
];

export const HOURLY = [
  { label: '17:00', v: 840, kind: 'past' as const },
  { label: '18:00', v: 1920, kind: 'past' as const },
  { label: '19:00', v: 2610, kind: 'now' as const },
  { label: '20:00', v: 2480, kind: 'fc' as const },
  { label: '21:00', v: 1640, kind: 'fc' as const },
  { label: '22:00', v: 890, kind: 'fc' as const },
];

export const MOVERS = [
  { name: 'Snapper a la talla', qty: 14, trend: '+40%', up: true },
  { name: 'Vela paloma', qty: 22, trend: '+8%', up: true },
  { name: 'Ribeye · 30-day', qty: 9, trend: '+12%', up: true },
  { name: 'Lobster pasta', qty: 8, trend: '−5%', up: false },
];

export const LEADERS = [
  { ini: 'FD', name: 'Frankie Doyle', meta: '9 checks · Vista', sales: 2140, tips: 212 },
  { ini: 'MR', name: 'Marco Ruiz', meta: '7 checks · Vista', sales: 1860, tips: 188 },
  { ini: 'AL', name: 'Ana Lopez', meta: '8 checks · Vista', sales: 1654, tips: 142 },
  { ini: 'SK', name: 'Sam Kealoha', meta: '11 tabs · Lagoon', sales: 1230, tips: 96 },
];

export const INSIGHTS = [
  {
    title: 'Terrace pacing +18% vs forecast',
    body: 'Covers are running ahead of the demand model. One more runner 20:00–21:30 holds ticket times under 6 minutes.',
    cta: 'Open scheduling',
    toast: 'Sent to scheduling — labor module picks it up as a shift suggestion.',
  },
  {
    title: 'Snapper trending 1.4× last Friday',
    body: 'Six portions left at the current pace — projected out by 20:40. Prep more now, or auto-86 at 2 left.',
    cta: 'Send to prep',
    toast: 'Prep note sent to the grill station — inventory depletion updated.',
  },
];

export const BOARD_86: Array<{ id: string; hint86?: string; hint?: string; quick?: boolean }> = [
  { id: 'scallop', hint86: "86'd 18:22 · Chef Ramos" },
  { id: 'lobster', hint: 'AI — ~4 left · out by 20:40', quick: true },
  { id: 'snapper', hint: 'AI — trending 1.4× · prep flagged' },
  { id: 'oysters' },
  { id: 'ribeye' },
  { id: 'churros' },
];
