/**
 * Inventory & Procurement demo domain (doc modules/04) — a typed, deterministic dataset shaped
 * like the future `@vela/contracts` inventory surface so the UI swaps to the live SDK without
 * restructuring. Quantities are base-UoM numbers; money is integer minor units (cents), matching
 * the kernel Money invariant. All timestamps are fixed relative to the seeded business date.
 */

export type StoreId = 'main' | 'banyan' | 'poolbar' | 'hk' | 'eng' | 'minibar';
export type Category = 'food' | 'beverage' | 'amenity' | 'linen' | 'engineering' | 'minibar';

export interface InvStore {
  id: StoreId;
  name: string;
  kind: 'central' | 'outlet' | 'department';
}

export interface ItemLevel {
  storeId: StoreId;
  onHand: number;
  par: number;
  reorderPoint: number;
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: Category;
  baseUom: string;
  /** purchase pack, e.g. "case of 24" — suggested orders round up to this */
  packSize: number;
  packUom: string;
  /** weighted-average cost per base UoM */
  unitCostMinor: number;
  perishable?: boolean;
  nextExpiry?: string;
  expiringQty?: number;
  preferredSupplierId: string;
  levels: ItemLevel[];
}

export type MovementType = 'receive' | 'transfer' | 'issue' | 'waste' | 'depletion' | 'adjust';

export interface Movement {
  id: string;
  ts: string;
  type: MovementType;
  itemId: string;
  qty: number;
  fromStore?: StoreId;
  toStore?: StoreId;
  valueMinor: number;
  ref: string;
  actor: string;
  reason?: string;
}

export interface Supplier {
  id: string;
  name: string;
  categories: Category[];
  leadDays: number;
  /** 0–100 score dimensions for the scorecard */
  scores: { price: number; delivery: number; quality: number };
  openPoMinor: number;
  priceListValidTo: string;
  /** last 8 deliveries: 1 = on time & complete, 0 = late/short */
  deliveryHistory: number[];
}

export interface SupplierQuote {
  itemId: string;
  supplierId: string;
  unitCostMinor: number;
}

export type RequisitionStatus = 'pending' | 'approved' | 'rejected';

export interface Requisition {
  id: string;
  number: string;
  storeId: StoreId;
  department: string;
  requestedBy: string;
  createdAt: string;
  lines: { itemId: string; qty: number }[];
  status: RequisitionStatus;
  note?: string;
}

export type PoStatus = 'sent' | 'acknowledged' | 'partial' | 'received' | 'matched' | 'exception';

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  status: PoStatus;
  createdAt: string;
  expected: string;
  exceptionNote?: string;
  lines: { itemId: string; qty: number; unitCostMinor: number; received: number }[];
}

export type CountStatus = 'scheduled' | 'in_progress' | 'review' | 'posted';

export interface CountSheet {
  id: string;
  storeId: StoreId;
  scheduled: string;
  type: 'full' | 'cycle';
  blind: boolean;
  status: CountStatus;
  lines: { itemId: string; theoretical: number; counted: number }[];
}

export interface RecipeIngredient {
  name: string;
  qty: number;
  uom: string;
  costMinor: number;
  subRecipe?: boolean;
}

export interface Recipe {
  id: string;
  menuItem: string;
  outlet: StoreId;
  priceMinor: number;
  costMinor: number;
  soldLast30: number;
  allergens: string[];
  ingredients: RecipeIngredient[];
}

/* ------------------------------------------------------------------ stores */

export const STORES: InvStore[] = [
  { id: 'main', name: 'Main store', kind: 'central' },
  { id: 'banyan', name: 'Banyan Restaurant', kind: 'outlet' },
  { id: 'poolbar', name: 'Pool Bar', kind: 'outlet' },
  { id: 'hk', name: 'Housekeeping pantry', kind: 'department' },
  { id: 'eng', name: 'Engineering store', kind: 'department' },
  { id: 'minibar', name: 'Minibar float', kind: 'department' },
];

export const STORE_NAME: Record<StoreId, string> = Object.fromEntries(
  STORES.map((s) => [s.id, s.name]),
) as Record<StoreId, string>;

/* ------------------------------------------------------------------- items */

const lv = (storeId: StoreId, onHand: number, par: number, reorderPoint: number): ItemLevel => ({
  storeId,
  onHand,
  par,
  reorderPoint,
});

export const ITEMS: StockItem[] = [
  // — Food
  {
    id: 'itm-chx', sku: 'F-0112', name: 'Chicken breast, free-range', category: 'food',
    baseUom: 'kg', packSize: 10, packUom: '10 kg box', unitCostMinor: 1240,
    perishable: true, nextExpiry: '2026-06-16', expiringQty: 6,
    preferredSupplierId: 'sup-pacific',
    levels: [lv('main', 18, 40, 16), lv('banyan', 7, 12, 5)],
  },
  {
    id: 'itm-beef', sku: 'F-0118', name: 'Beef tenderloin, grass-fed', category: 'food',
    baseUom: 'kg', packSize: 5, packUom: '5 kg cryovac', unitCostMinor: 4890,
    perishable: true, nextExpiry: '2026-06-19',
    preferredSupplierId: 'sup-pacific',
    levels: [lv('main', 11, 18, 8), lv('banyan', 4, 6, 2)],
  },
  {
    id: 'itm-salmon', sku: 'F-0131', name: 'Salmon fillet, Atlantic', category: 'food',
    baseUom: 'kg', packSize: 6, packUom: '6 kg case', unitCostMinor: 3150,
    perishable: true, nextExpiry: '2026-06-15', expiringQty: 4,
    preferredSupplierId: 'sup-island',
    levels: [lv('main', 5, 20, 8), lv('banyan', 3, 8, 3)],
  },
  {
    id: 'itm-rice', sku: 'F-0204', name: 'Basmati rice, aged', category: 'food',
    baseUom: 'kg', packSize: 20, packUom: '20 kg sack', unitCostMinor: 310,
    preferredSupplierId: 'sup-island',
    levels: [lv('main', 64, 80, 30), lv('banyan', 12, 15, 6)],
  },
  {
    id: 'itm-tomato', sku: 'F-0219', name: 'Roma tomatoes', category: 'food',
    baseUom: 'kg', packSize: 10, packUom: '10 kg crate', unitCostMinor: 280,
    perishable: true, nextExpiry: '2026-06-14', expiringQty: 9,
    preferredSupplierId: 'sup-island',
    levels: [lv('main', 14, 25, 10), lv('banyan', 6, 10, 4)],
  },
  {
    id: 'itm-mozz', sku: 'F-0227', name: 'Mozzarella di bufala', category: 'food',
    baseUom: 'kg', packSize: 4, packUom: '4 kg case', unitCostMinor: 1980,
    perishable: true, nextExpiry: '2026-06-18',
    preferredSupplierId: 'sup-pacific',
    levels: [lv('main', 6, 10, 4), lv('banyan', 2, 4, 2)],
  },
  {
    id: 'itm-oil', sku: 'F-0301', name: 'Olive oil, extra virgin', category: 'food',
    baseUom: 'L', packSize: 12, packUom: 'case of 12 × 1 L', unitCostMinor: 1150,
    preferredSupplierId: 'sup-pacific',
    levels: [lv('main', 28, 36, 14), lv('banyan', 5, 8, 3)],
  },
  {
    id: 'itm-truffle', sku: 'F-0309', name: 'Truffle oil, white', category: 'food',
    baseUom: 'btl 250ml', packSize: 6, packUom: 'case of 6', unitCostMinor: 2890,
    preferredSupplierId: 'sup-pacific',
    levels: [lv('main', 3, 8, 3), lv('banyan', 1, 2, 1)],
  },
  // — Beverage
  {
    id: 'itm-cab', sku: 'B-0405', name: 'Cabernet Sauvignon, house', category: 'beverage',
    baseUom: 'btl', packSize: 12, packUom: 'case of 12', unitCostMinor: 1450,
    preferredSupplierId: 'sup-coastal',
    levels: [lv('main', 60, 96, 36), lv('banyan', 18, 24, 10), lv('poolbar', 6, 12, 5)],
  },
  {
    id: 'itm-prosecco', sku: 'B-0411', name: 'Prosecco DOC', category: 'beverage',
    baseUom: 'btl', packSize: 6, packUom: 'case of 6', unitCostMinor: 1180,
    preferredSupplierId: 'sup-coastal',
    levels: [lv('main', 30, 48, 18), lv('poolbar', 8, 18, 8)],
  },
  {
    id: 'itm-gin', sku: 'B-0420', name: 'Gin, London dry 1 L', category: 'beverage',
    baseUom: 'btl', packSize: 6, packUom: 'case of 6', unitCostMinor: 2240,
    preferredSupplierId: 'sup-coastal',
    levels: [lv('main', 9, 18, 8), lv('poolbar', 2, 6, 3)],
  },
  {
    id: 'itm-espresso', sku: 'B-0502', name: 'Espresso beans, single origin', category: 'beverage',
    baseUom: 'kg', packSize: 8, packUom: '8 × 1 kg case', unitCostMinor: 2150,
    preferredSupplierId: 'sup-coastal',
    levels: [lv('main', 12, 24, 10), lv('banyan', 4, 6, 2)],
  },
  {
    id: 'itm-oj', sku: 'B-0510', name: 'Orange juice, cold-pressed', category: 'beverage',
    baseUom: 'L', packSize: 10, packUom: '10 L bag-in-box', unitCostMinor: 420,
    perishable: true, nextExpiry: '2026-06-17',
    preferredSupplierId: 'sup-island',
    levels: [lv('main', 22, 40, 16), lv('banyan', 8, 12, 5), lv('poolbar', 4, 10, 4)],
  },
  {
    id: 'itm-lime', sku: 'B-0518', name: 'Limes, fresh', category: 'beverage',
    baseUom: 'kg', packSize: 5, packUom: '5 kg crate', unitCostMinor: 380,
    perishable: true, nextExpiry: '2026-06-16',
    preferredSupplierId: 'sup-island',
    levels: [lv('main', 4, 12, 5), lv('poolbar', 2, 6, 3)],
  },
  // — Amenities
  {
    id: 'itm-shampoo', sku: 'A-0601', name: 'Shampoo 50 ml, signature', category: 'amenity',
    baseUom: 'ea', packSize: 240, packUom: 'carton of 240', unitCostMinor: 86,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 1840, 2400, 900), lv('hk', 310, 480, 180)],
  },
  {
    id: 'itm-conditioner', sku: 'A-0602', name: 'Conditioner 50 ml, signature', category: 'amenity',
    baseUom: 'ea', packSize: 240, packUom: 'carton of 240', unitCostMinor: 86,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 760, 2400, 900), lv('hk', 220, 480, 180)],
  },
  {
    id: 'itm-soap', sku: 'A-0605', name: 'Bath soap 40 g, vetiver', category: 'amenity',
    baseUom: 'ea', packSize: 300, packUom: 'carton of 300', unitCostMinor: 54,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 2100, 3000, 1200), lv('hk', 450, 600, 240)],
  },
  {
    id: 'itm-slippers', sku: 'A-0612', name: 'Slippers, waffle (pair)', category: 'amenity',
    baseUom: 'pr', packSize: 100, packUom: 'carton of 100', unitCostMinor: 240,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 380, 600, 220), lv('hk', 90, 150, 60)],
  },
  {
    id: 'itm-water', sku: 'A-0620', name: 'Still water 500 ml, glass', category: 'amenity',
    baseUom: 'btl', packSize: 24, packUom: 'case of 24', unitCostMinor: 95,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 540, 960, 380), lv('hk', 120, 240, 100), lv('minibar', 160, 220, 90)],
  },
  // — Linen
  {
    id: 'itm-towel', sku: 'L-0701', name: 'Bath towel 700 gsm', category: 'linen',
    baseUom: 'ea', packSize: 50, packUom: 'bale of 50', unitCostMinor: 1480,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 320, 450, 180), lv('hk', 140, 200, 80)],
  },
  {
    id: 'itm-pooltowel', sku: 'L-0705', name: 'Pool towel, striped', category: 'linen',
    baseUom: 'ea', packSize: 50, packUom: 'bale of 50', unitCostMinor: 1120,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 95, 300, 120), lv('hk', 60, 120, 50)],
  },
  {
    id: 'itm-sheets', sku: 'L-0710', name: 'King sheet set, 400 TC', category: 'linen',
    baseUom: 'set', packSize: 20, packUom: 'bale of 20', unitCostMinor: 3850,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 110, 160, 60), lv('hk', 48, 70, 30)],
  },
  // — Engineering
  {
    id: 'itm-hvac', sku: 'E-0801', name: 'HVAC filter, MERV-13', category: 'engineering',
    baseUom: 'ea', packSize: 12, packUom: 'box of 12', unitCostMinor: 1890,
    preferredSupplierId: 'sup-tecserve',
    levels: [lv('eng', 18, 36, 14)],
  },
  {
    id: 'itm-led', sku: 'E-0807', name: 'LED bulb, E27 dim-to-warm', category: 'engineering',
    baseUom: 'ea', packSize: 50, packUom: 'box of 50', unitCostMinor: 460,
    preferredSupplierId: 'sup-tecserve',
    levels: [lv('eng', 130, 200, 80)],
  },
  {
    id: 'itm-chlorine', sku: 'E-0812', name: 'Pool chlorine, granular', category: 'engineering',
    baseUom: 'kg', packSize: 25, packUom: '25 kg drum', unitCostMinor: 520,
    preferredSupplierId: 'sup-tecserve',
    levels: [lv('eng', 20, 75, 30)],
  },
  // — Minibar
  {
    id: 'itm-choc', sku: 'M-0901', name: 'Chocolate bar, single origin', category: 'minibar',
    baseUom: 'ea', packSize: 48, packUom: 'carton of 48', unitCostMinor: 310,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 210, 300, 120), lv('minibar', 88, 140, 60)],
  },
  {
    id: 'itm-nuts', sku: 'M-0905', name: 'Roasted nuts tin 80 g', category: 'minibar',
    baseUom: 'ea', packSize: 36, packUom: 'carton of 36', unitCostMinor: 425,
    preferredSupplierId: 'sup-essentials',
    levels: [lv('main', 96, 180, 70), lv('minibar', 42, 90, 36)],
  },
  {
    id: 'itm-sparkling', sku: 'M-0910', name: 'Sparkling water 330 ml', category: 'minibar',
    baseUom: 'btl', packSize: 24, packUom: 'case of 24', unitCostMinor: 130,
    preferredSupplierId: 'sup-coastal',
    levels: [lv('main', 180, 360, 140), lv('minibar', 75, 160, 64)],
  },
];

/* --------------------------------------------------------------- suppliers */

export const SUPPLIERS: Supplier[] = [
  {
    id: 'sup-pacific', name: 'Pacific Provisions', categories: ['food'],
    leadDays: 2, scores: { price: 72, delivery: 94, quality: 96 },
    openPoMinor: 412_600, priceListValidTo: '2026-09-30',
    deliveryHistory: [1, 1, 1, 0, 1, 1, 1, 1],
  },
  {
    id: 'sup-island', name: 'Island Fresh Produce', categories: ['food', 'beverage'],
    leadDays: 1, scores: { price: 88, delivery: 81, quality: 90 },
    openPoMinor: 96_400, priceListValidTo: '2026-07-15',
    deliveryHistory: [1, 0, 1, 1, 0, 1, 1, 1],
  },
  {
    id: 'sup-coastal', name: 'Coastal Beverage Co.', categories: ['beverage', 'minibar'],
    leadDays: 3, scores: { price: 79, delivery: 97, quality: 93 },
    openPoMinor: 287_700, priceListValidTo: '2026-12-31',
    deliveryHistory: [1, 1, 1, 1, 1, 1, 0, 1],
  },
  {
    id: 'sup-essentials', name: 'Hotel Essentials Intl.', categories: ['amenity', 'linen', 'minibar'],
    leadDays: 7, scores: { price: 91, delivery: 76, quality: 88 },
    openPoMinor: 538_200, priceListValidTo: '2026-08-31',
    deliveryHistory: [1, 0, 1, 0, 1, 1, 0, 1],
  },
  {
    id: 'sup-tecserve', name: 'TecServe Parts', categories: ['engineering'],
    leadDays: 5, scores: { price: 83, delivery: 89, quality: 94 },
    openPoMinor: 64_900, priceListValidTo: '2026-10-31',
    deliveryHistory: [1, 1, 0, 1, 1, 1, 1, 1],
  },
];

export const SUPPLIER_NAME: Record<string, string> = Object.fromEntries(
  SUPPLIERS.map((s) => [s.id, s.name]),
);

/** Multi-supplier quotes for the price-comparison view (doc 04: compare on PO creation). */
export const QUOTES: SupplierQuote[] = [
  { itemId: 'itm-chx', supplierId: 'sup-pacific', unitCostMinor: 1240 },
  { itemId: 'itm-chx', supplierId: 'sup-island', unitCostMinor: 1315 },
  { itemId: 'itm-salmon', supplierId: 'sup-island', unitCostMinor: 3150 },
  { itemId: 'itm-salmon', supplierId: 'sup-pacific', unitCostMinor: 3020 },
  { itemId: 'itm-tomato', supplierId: 'sup-island', unitCostMinor: 280 },
  { itemId: 'itm-tomato', supplierId: 'sup-pacific', unitCostMinor: 335 },
  { itemId: 'itm-cab', supplierId: 'sup-coastal', unitCostMinor: 1450 },
  { itemId: 'itm-oj', supplierId: 'sup-island', unitCostMinor: 420 },
  { itemId: 'itm-oj', supplierId: 'sup-coastal', unitCostMinor: 465 },
  { itemId: 'itm-shampoo', supplierId: 'sup-essentials', unitCostMinor: 86 },
  { itemId: 'itm-towel', supplierId: 'sup-essentials', unitCostMinor: 1480 },
  { itemId: 'itm-hvac', supplierId: 'sup-tecserve', unitCostMinor: 1890 },
];

/* --------------------------------------------------------------- movements */

export const MOVEMENTS: Movement[] = [
  { id: 'mv-118', ts: '2026-06-13T10:42:00Z', type: 'depletion', itemId: 'itm-cab', qty: -4, fromStore: 'banyan', valueMinor: -5800, ref: 'POS check 4811', actor: 'system' },
  { id: 'mv-117', ts: '2026-06-13T10:20:00Z', type: 'issue', itemId: 'itm-shampoo', qty: -120, fromStore: 'main', toStore: 'hk', valueMinor: -10320, ref: 'ISS-2231', actor: 'M. Reyes' },
  { id: 'mv-116', ts: '2026-06-13T09:55:00Z', type: 'receive', itemId: 'itm-prosecco', qty: 36, toStore: 'main', valueMinor: 42480, ref: 'GRN-0892 · PO-1041', actor: 'D. Okafor' },
  { id: 'mv-115', ts: '2026-06-13T09:31:00Z', type: 'waste', itemId: 'itm-salmon', qty: -2, fromStore: 'banyan', valueMinor: -6300, ref: 'WST-0312', actor: 'Chef Laurent', reason: 'Temperature breach' },
  { id: 'mv-114', ts: '2026-06-13T08:58:00Z', type: 'transfer', itemId: 'itm-gin', qty: 6, fromStore: 'main', toStore: 'poolbar', valueMinor: 13440, ref: 'TRF-1108', actor: 'D. Okafor' },
  { id: 'mv-113', ts: '2026-06-13T08:12:00Z', type: 'depletion', itemId: 'itm-espresso', qty: -1.4, fromStore: 'banyan', valueMinor: -3010, ref: 'POS day batch', actor: 'system' },
  { id: 'mv-112', ts: '2026-06-12T22:04:00Z', type: 'adjust', itemId: 'itm-nuts', qty: -3, fromStore: 'minibar', valueMinor: -1275, ref: 'CNT-077', actor: 'Night audit', reason: 'Count variance' },
  { id: 'mv-111', ts: '2026-06-12T18:40:00Z', type: 'issue', itemId: 'itm-towel', qty: -40, fromStore: 'main', toStore: 'hk', valueMinor: -59200, ref: 'ISS-2228', actor: 'M. Reyes' },
  { id: 'mv-110', ts: '2026-06-12T16:22:00Z', type: 'receive', itemId: 'itm-chx', qty: 20, toStore: 'main', valueMinor: 24800, ref: 'GRN-0890 · PO-1038', actor: 'D. Okafor' },
  { id: 'mv-109', ts: '2026-06-12T15:09:00Z', type: 'depletion', itemId: 'itm-lime', qty: -1.8, fromStore: 'poolbar', valueMinor: -684, ref: 'POS day batch', actor: 'system' },
  { id: 'mv-108', ts: '2026-06-12T11:47:00Z', type: 'transfer', itemId: 'itm-water', qty: 48, fromStore: 'main', toStore: 'minibar', valueMinor: 4560, ref: 'TRF-1104', actor: 'A. Beaumont' },
  { id: 'mv-107', ts: '2026-06-12T09:30:00Z', type: 'waste', itemId: 'itm-tomato', qty: -3, fromStore: 'main', valueMinor: -840, ref: 'WST-0309', actor: 'Chef Laurent', reason: 'Spoilage' },
  { id: 'mv-106', ts: '2026-06-11T17:15:00Z', type: 'receive', itemId: 'itm-sheets', qty: 40, toStore: 'main', valueMinor: 154000, ref: 'GRN-0886 · PO-1032', actor: 'D. Okafor' },
  { id: 'mv-105', ts: '2026-06-11T10:05:00Z', type: 'issue', itemId: 'itm-led', qty: -12, fromStore: 'eng', valueMinor: -5520, ref: 'WO-4471', actor: 'P. Silva' },
];

/* ------------------------------------------------------------- procurement */

export const REQUISITIONS: Requisition[] = [
  {
    id: 'req-1', number: 'RQ-0488', storeId: 'banyan', department: 'F&B — Kitchen',
    requestedBy: 'Chef Laurent', createdAt: '2026-06-13T07:10:00Z', status: 'pending',
    note: 'Weekend covers forecast +18% — Saturday tasting menu.',
    lines: [
      { itemId: 'itm-salmon', qty: 18 },
      { itemId: 'itm-beef', qty: 10 },
      { itemId: 'itm-mozz', qty: 8 },
      { itemId: 'itm-truffle', qty: 6 },
    ],
  },
  {
    id: 'req-2', number: 'RQ-0487', storeId: 'hk', department: 'Housekeeping',
    requestedBy: 'M. Reyes', createdAt: '2026-06-12T16:45:00Z', status: 'pending',
    note: 'Conditioner below reorder; pool towels for high season.',
    lines: [
      { itemId: 'itm-conditioner', qty: 1440 },
      { itemId: 'itm-pooltowel', qty: 200 },
    ],
  },
  {
    id: 'req-3', number: 'RQ-0486', storeId: 'eng', department: 'Engineering',
    requestedBy: 'P. Silva', createdAt: '2026-06-12T09:20:00Z', status: 'approved',
    lines: [
      { itemId: 'itm-chlorine', qty: 75 },
      { itemId: 'itm-hvac', qty: 24 },
    ],
  },
];

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1', number: 'PO-1044', supplierId: 'sup-pacific', status: 'sent',
    createdAt: '2026-06-13T08:00:00Z', expected: '2026-06-15',
    lines: [
      { itemId: 'itm-beef', qty: 15, unitCostMinor: 4890, received: 0 },
      { itemId: 'itm-mozz', qty: 8, unitCostMinor: 1980, received: 0 },
      { itemId: 'itm-truffle', qty: 6, unitCostMinor: 2890, received: 0 },
    ],
  },
  {
    id: 'po-2', number: 'PO-1043', supplierId: 'sup-essentials', status: 'acknowledged',
    createdAt: '2026-06-12T15:30:00Z', expected: '2026-06-19',
    lines: [
      { itemId: 'itm-conditioner', qty: 1440, unitCostMinor: 86, received: 0 },
      { itemId: 'itm-pooltowel', qty: 200, unitCostMinor: 1120, received: 0 },
      { itemId: 'itm-shampoo', qty: 960, unitCostMinor: 86, received: 0 },
    ],
  },
  {
    id: 'po-3', number: 'PO-1041', supplierId: 'sup-coastal', status: 'partial',
    createdAt: '2026-06-11T11:00:00Z', expected: '2026-06-13',
    lines: [
      { itemId: 'itm-prosecco', qty: 60, unitCostMinor: 1180, received: 36 },
      { itemId: 'itm-gin', qty: 18, unitCostMinor: 2240, received: 0 },
      { itemId: 'itm-sparkling', qty: 120, unitCostMinor: 130, received: 120 },
    ],
  },
  {
    id: 'po-4', number: 'PO-1038', supplierId: 'sup-pacific', status: 'exception',
    createdAt: '2026-06-10T09:00:00Z', expected: '2026-06-12',
    exceptionNote: '3-way match failed — invoice unit cost $13.10 vs PO $12.40 (+5.6%).',
    lines: [
      { itemId: 'itm-chx', qty: 20, unitCostMinor: 1240, received: 20 },
    ],
  },
  {
    id: 'po-5', number: 'PO-1032', supplierId: 'sup-essentials', status: 'matched',
    createdAt: '2026-06-08T10:00:00Z', expected: '2026-06-11',
    lines: [
      { itemId: 'itm-sheets', qty: 40, unitCostMinor: 3850, received: 40 },
      { itemId: 'itm-towel', qty: 100, unitCostMinor: 1480, received: 100 },
    ],
  },
];

/* ------------------------------------------------------------------ counts */

export const COUNTS: CountSheet[] = [
  {
    id: 'cnt-79', storeId: 'poolbar', scheduled: '2026-06-13', type: 'full', blind: true,
    status: 'review',
    lines: [
      { itemId: 'itm-cab', theoretical: 12, counted: 6 },
      { itemId: 'itm-prosecco', theoretical: 9, counted: 8 },
      { itemId: 'itm-gin', theoretical: 3, counted: 2 },
      { itemId: 'itm-oj', theoretical: 4, counted: 4 },
      { itemId: 'itm-lime', theoretical: 2.5, counted: 2 },
    ],
  },
  {
    id: 'cnt-80', storeId: 'main', scheduled: '2026-06-14', type: 'cycle', blind: true,
    status: 'scheduled',
    lines: [],
  },
  {
    id: 'cnt-78', storeId: 'minibar', scheduled: '2026-06-12', type: 'cycle', blind: false,
    status: 'posted',
    lines: [
      { itemId: 'itm-choc', theoretical: 90, counted: 88 },
      { itemId: 'itm-nuts', theoretical: 45, counted: 42 },
      { itemId: 'itm-sparkling', theoretical: 75, counted: 75 },
    ],
  },
  {
    id: 'cnt-77', storeId: 'banyan', scheduled: '2026-06-11', type: 'cycle', blind: true,
    status: 'posted',
    lines: [
      { itemId: 'itm-espresso', theoretical: 4.4, counted: 4 },
      { itemId: 'itm-oil', theoretical: 5.2, counted: 5 },
    ],
  },
];

/* ----------------------------------------------------------------- recipes */

export const RECIPES: Recipe[] = [
  {
    id: 'rcp-1', menuItem: 'Grilled salmon, beurre blanc', outlet: 'banyan',
    priceMinor: 4200, costMinor: 1218, soldLast30: 412, allergens: ['fish', 'dairy'],
    ingredients: [
      { name: 'Salmon fillet', qty: 0.22, uom: 'kg', costMinor: 693 },
      { name: 'Beurre blanc (sub-recipe)', qty: 0.06, uom: 'L', costMinor: 310, subRecipe: true },
      { name: 'Seasonal vegetables', qty: 0.15, uom: 'kg', costMinor: 215 },
    ],
  },
  {
    id: 'rcp-2', menuItem: 'Beef tenderloin, truffle jus', outlet: 'banyan',
    priceMinor: 6800, costMinor: 2570, soldLast30: 188, allergens: [],
    ingredients: [
      { name: 'Beef tenderloin', qty: 0.25, uom: 'kg', costMinor: 1223 },
      { name: 'Truffle jus (sub-recipe)', qty: 0.08, uom: 'L', costMinor: 947, subRecipe: true },
      { name: 'Pommes purée (sub-recipe)', qty: 0.18, uom: 'kg', costMinor: 400, subRecipe: true },
    ],
  },
  {
    id: 'rcp-3', menuItem: 'Margherita, bufala', outlet: 'banyan',
    priceMinor: 2400, costMinor: 612, soldLast30: 521, allergens: ['gluten', 'dairy'],
    ingredients: [
      { name: 'Pizza dough (sub-recipe)', qty: 0.28, uom: 'kg', costMinor: 96, subRecipe: true },
      { name: 'Mozzarella di bufala', qty: 0.12, uom: 'kg', costMinor: 238 },
      { name: 'Roma tomatoes', qty: 0.18, uom: 'kg', costMinor: 50 },
      { name: 'Basil, olive oil', qty: 1, uom: 'svc', costMinor: 228 },
    ],
  },
  {
    id: 'rcp-4', menuItem: 'Chicken paillard', outlet: 'banyan',
    priceMinor: 2900, costMinor: 745, soldLast30: 347, allergens: [],
    ingredients: [
      { name: 'Chicken breast', qty: 0.24, uom: 'kg', costMinor: 298 },
      { name: 'Herb butter (sub-recipe)', qty: 0.04, uom: 'kg', costMinor: 187, subRecipe: true },
      { name: 'Rocket & parmesan', qty: 1, uom: 'svc', costMinor: 260 },
    ],
  },
  {
    id: 'rcp-5', menuItem: 'Truffle risotto', outlet: 'banyan',
    priceMinor: 3600, costMinor: 1690, soldLast30: 96, allergens: ['dairy'],
    ingredients: [
      { name: 'Carnaroli rice', qty: 0.11, uom: 'kg', costMinor: 84 },
      { name: 'Truffle oil', qty: 0.02, uom: 'btl', costMinor: 578 },
      { name: 'Parmesan, stock, butter', qty: 1, uom: 'svc', costMinor: 1028 },
    ],
  },
  {
    id: 'rcp-6', menuItem: 'Aperol spritz', outlet: 'poolbar',
    priceMinor: 1600, costMinor: 372, soldLast30: 689, allergens: [],
    ingredients: [
      { name: 'Prosecco DOC', qty: 0.09, uom: 'btl', costMinor: 106 },
      { name: 'Aperol', qty: 0.06, uom: 'L', costMinor: 168 },
      { name: 'Soda, orange, ice', qty: 1, uom: 'svc', costMinor: 98 },
    ],
  },
  {
    id: 'rcp-7', menuItem: 'Gin & tonic, garden', outlet: 'poolbar',
    priceMinor: 1800, costMinor: 414, soldLast30: 534, allergens: [],
    ingredients: [
      { name: 'Gin, London dry', qty: 0.05, uom: 'btl', costMinor: 112 },
      { name: 'Premium tonic', qty: 0.2, uom: 'L', costMinor: 196 },
      { name: 'Botanicals, ice', qty: 1, uom: 'svc', costMinor: 106 },
    ],
  },
  {
    id: 'rcp-8', menuItem: 'Lobster roll', outlet: 'poolbar',
    priceMinor: 3800, costMinor: 1976, soldLast30: 142, allergens: ['shellfish', 'gluten'],
    ingredients: [
      { name: 'Lobster meat', qty: 0.12, uom: 'kg', costMinor: 1512 },
      { name: 'Brioche roll', qty: 1, uom: 'ea', costMinor: 218 },
      { name: 'Citrus mayo (sub-recipe)', qty: 0.03, uom: 'kg', costMinor: 246, subRecipe: true },
    ],
  },
  {
    id: 'rcp-9', menuItem: 'Club sandwich', outlet: 'poolbar',
    priceMinor: 2200, costMinor: 1142, soldLast30: 298, allergens: ['gluten', 'egg'],
    ingredients: [
      { name: 'Chicken breast', qty: 0.14, uom: 'kg', costMinor: 174 },
      { name: 'Bacon, egg, tomato', qty: 1, uom: 'svc', costMinor: 562 },
      { name: 'Bread, fries', qty: 1, uom: 'svc', costMinor: 406 },
    ],
  },
  {
    id: 'rcp-10', menuItem: 'Espresso martini', outlet: 'poolbar',
    priceMinor: 1900, costMinor: 921, soldLast30: 117, allergens: [],
    ingredients: [
      { name: 'Vodka', qty: 0.05, uom: 'btl', costMinor: 98 },
      { name: 'Espresso, single origin', qty: 0.018, uom: 'kg', costMinor: 39 },
      { name: 'Coffee liqueur', qty: 0.03, uom: 'L', costMinor: 784 },
    ],
  },
];

/* ----------------------------------------------------------------- derived */

export type StockStatus = 'out' | 'reorder' | 'low' | 'ok';

export function totalOnHand(item: StockItem): number {
  return item.levels.reduce((s, l) => s + l.onHand, 0);
}

export function totalPar(item: StockItem): number {
  return item.levels.reduce((s, l) => s + l.par, 0);
}

export function totalReorder(item: StockItem): number {
  return item.levels.reduce((s, l) => s + l.reorderPoint, 0);
}

export function itemValueMinor(item: StockItem): number {
  return Math.round(totalOnHand(item) * item.unitCostMinor);
}

export function stockStatus(onHand: number, par: number, reorderPoint: number): StockStatus {
  if (onHand <= 0) return 'out';
  if (onHand <= reorderPoint) return 'reorder';
  if (onHand <= par * 0.55) return 'low';
  return 'ok';
}

export function itemStatus(item: StockItem): StockStatus {
  return stockStatus(totalOnHand(item), totalPar(item), totalReorder(item));
}

export interface SuggestedOrder {
  item: StockItem;
  /** par − on-hand, rounded up to the purchase pack */
  qty: number;
  valueMinor: number;
  driver: string;
}

/** Par/reorder-driven order suggestions, occupancy-linked (doc 04: amenities scale with arrivals). */
export function suggestedOrders(items: StockItem[]): SuggestedOrder[] {
  const out: SuggestedOrder[] = [];
  for (const item of items) {
    const onHand = totalOnHand(item);
    const status = itemStatus(item);
    if (status === 'ok') continue;
    const deficit = totalPar(item) - onHand;
    const qty = Math.ceil(deficit / item.packSize) * item.packSize;
    if (qty <= 0) continue;
    const driver =
      item.category === 'amenity' || item.category === 'linen'
        ? 'Par + 86% occupancy next 7 days'
        : item.category === 'food' || item.category === 'beverage'
          ? 'Par + covers forecast (+18% wknd)'
          : 'Below reorder point';
    out.push({ item, qty, valueMinor: qty * item.unitCostMinor, driver });
  }
  return out.sort((a, b) => b.valueMinor - a.valueMinor);
}

export function reqValueMinor(req: Requisition, items: StockItem[]): number {
  return req.lines.reduce((s, l) => {
    const item = items.find((i) => i.id === l.itemId);
    return s + (item ? l.qty * item.unitCostMinor : 0);
  }, 0);
}

export function poValueMinor(po: PurchaseOrder): number {
  return po.lines.reduce((s, l) => s + l.qty * l.unitCostMinor, 0);
}

export function countVarianceMinor(count: CountSheet, items: StockItem[]): number {
  return count.lines.reduce((s, l) => {
    const item = items.find((i) => i.id === l.itemId);
    return s + (item ? Math.round((l.counted - l.theoretical) * item.unitCostMinor) : 0);
  }, 0);
}

/* -------------------------------------------------------------- formatting */

export function fmtMoney(minor: number): string {
  const sign = minor < 0 ? '−' : '';
  return `${sign}$${(Math.abs(minor) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtMoneyCompact(minor: number): string {
  const abs = Math.abs(minor) / 100;
  const sign = minor < 0 ? '−' : '';
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function fmtQty(qty: number): string {
  return Number.isInteger(qty) ? qty.toLocaleString('en-US') : qty.toFixed(1);
}

export function fmtTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function fmtDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
