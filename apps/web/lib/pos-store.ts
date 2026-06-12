'use client';
import { create } from 'zustand';
import type { PosRoomChargeCandidate } from '@vela/contracts';
import type { Station } from './pos-data';

/**
 * POS terminal state (design: "Vela POS Terminal"). Server truth = the check lifecycle
 * (open → items → fire → close) via the SDK; this store holds the working layer between sync
 * points: unsent/held lines with seat/course/modifier detail, plus screen, settlement, KDS and
 * offline-queue state.
 */

export type PosScreen = 'floor' | 'order' | 'kds' | 'manager';
export type PayStep = 'summary' | 'room' | 'verify' | 'posted' | 'queued' | 'card' | 'cash';
export type SplitMode = 'none' | 'seat' | 'item' | 'even';

export interface ClientLine {
  uid: number;
  itemId: string;
  name: string;
  qty: number;
  /** Minor units, base price. */
  price: number;
  bev: boolean;
  seat: number;
  course: number;
  /** `queued` = fired into the offline op log; renders as "in kitchen" until replay clears it. */
  status: 'new' | 'held' | 'queued';
  mods: string[];
  modDelta: number;
  station: Station;
  comp?: boolean;
}

export interface PosToastState {
  id: number;
  text: string;
  action?: string;
  onAction?: () => void;
}

export interface AuditRow {
  t: string;
  type: 'Void' | 'Comp' | 'Discount';
  item: string;
  /** Minor units. */
  amt: number;
  reason: string;
  by: string;
  appr: string;
}

export interface QueuedOp {
  key: string;
  label: string;
  run: () => Promise<void>;
}

export interface CheckDiscount {
  kind: 'hh' | 'mgr' | 'emp';
  label: string;
  /** Minor units. */
  amt: number;
}

interface PosState {
  screen: PosScreen;
  outletCode: string;
  activeCheckId: string | null;
  selSeat: number;
  selCourse: number;
  selLine: number | string | null;
  voidOpen: boolean;
  cat: string;
  q: string;
  mfilter: 'all' | 'popular' | 'veg';
  upsellDismissed: boolean;
  // modifier sheet
  modItemId: string | null;
  modSel: Record<string, Record<string, boolean>>;
  modQty: number;
  // settlement
  payStep: PayStep | null;
  payQ: string;
  payGuest: PosRoomChargeCandidate | null;
  signed: boolean;
  cardState: 'wait' | 'approved' | 'offline';
  tip: number;
  cashTender: number;
  split: SplitMode;
  // working lines + adjustments, keyed by checkId
  lines: Record<string, ClientLine[]>;
  discounts: Record<string, CheckDiscount | undefined>;
  // KDS
  station: string;
  bumped: Record<string, boolean>;
  lastBump: string | null;
  kdone: Record<string, boolean>;
  // manager
  e86: Record<string, boolean>;
  audits: AuditRow[];
  drawerCounted: boolean;
  dayClosed: boolean;
  // floor overlays mutated at runtime
  dirtyTables: Record<string, boolean>;
  resetTables: Record<string, boolean>;
  waitlistSeated: Record<string, boolean>;
  rsAdv: Record<string, number>;
  // connectivity simulation
  offline: boolean;
  opQueue: QueuedOp[];
  /** Checks closed while offline — hidden from boards until the op log replays. */
  locallyClosed: Record<string, boolean>;
  toast: PosToastState | null;

  set: (patch: Partial<PosState>) => void;
  showToast: (text: string, action?: string, onAction?: () => void) => void;
  dismissToast: () => void;
  addLine: (checkId: string, line: Omit<ClientLine, 'uid'>) => void;
  updateLines: (checkId: string, lines: ClientLine[]) => void;
  clearLines: (checkId: string, uids: number[]) => void;
  addAudit: (row: Omit<AuditRow, 't'>) => void;
  enqueueOp: (op: QueuedOp) => void;
  drainQueue: () => QueuedOp[];
  openCheckScreen: (checkId: string) => void;
  resetPay: () => void;
}

let uidSeq = 1000;
let toastSeq = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const usePos = create<PosState>()((set, get) => ({
  screen: 'floor',
  outletCode: 'VISTA',
  activeCheckId: null,
  selSeat: 1,
  selCourse: 2,
  selLine: null,
  voidOpen: false,
  cat: 'raw',
  q: '',
  mfilter: 'all',
  upsellDismissed: false,
  modItemId: null,
  modSel: {},
  modQty: 1,
  payStep: null,
  payQ: '',
  payGuest: null,
  signed: false,
  cardState: 'wait',
  tip: 20,
  cashTender: 0,
  split: 'none',
  lines: {},
  discounts: {},
  station: 'expo',
  bumped: {},
  lastBump: null,
  kdone: {},
  e86: { scallop: true },
  audits: [
    {
      t: '19:21',
      type: 'Comp',
      item: 'Burrata & charred peach',
      amt: 1800,
      reason: 'Guest recovery',
      by: 'F. Doyle',
      appr: 'M. Ramos',
    },
    {
      t: '18:54',
      type: 'Void',
      item: 'Mezcal negroni',
      amt: 1700,
      reason: 'Server error',
      by: 'A. Lopez',
      appr: 'M. Ramos',
    },
    {
      t: '18:12',
      type: 'Discount',
      item: 'Check 1031 — happy hour, beverages',
      amt: 1240,
      reason: 'Scheduled promo',
      by: 'System',
      appr: '—',
    },
  ],
  drawerCounted: false,
  dayClosed: false,
  dirtyTables: {},
  resetTables: {},
  waitlistSeated: {},
  rsAdv: {},
  offline: false,
  opQueue: [],
  locallyClosed: {},
  toast: null,

  set: (patch) => set(patch),

  showToast: (text, action, onAction) => {
    clearTimeout(toastTimer);
    set({ toast: { id: ++toastSeq, text, action, onAction } });
    toastTimer = setTimeout(() => set({ toast: null }), 6000);
  },
  dismissToast: () => {
    clearTimeout(toastTimer);
    set({ toast: null });
  },

  addLine: (checkId, line) =>
    set((s) => ({
      lines: { ...s.lines, [checkId]: [...(s.lines[checkId] ?? []), { ...line, uid: ++uidSeq }] },
    })),
  updateLines: (checkId, lines) => set((s) => ({ lines: { ...s.lines, [checkId]: lines } })),
  clearLines: (checkId, uids) =>
    set((s) => ({
      lines: {
        ...s.lines,
        [checkId]: (s.lines[checkId] ?? []).filter((l) => !uids.includes(l.uid)),
      },
    })),

  addAudit: (row) => {
    const d = new Date();
    const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    set((s) => ({ audits: [{ ...row, t }, ...s.audits] }));
  },

  enqueueOp: (op) => set((s) => ({ opQueue: [...s.opQueue, op] })),
  drainQueue: () => {
    const ops = get().opQueue;
    set({ opQueue: [] });
    return ops;
  },

  openCheckScreen: (checkId) =>
    set({ activeCheckId: checkId, screen: 'order', selLine: null, voidOpen: false, selSeat: 1 }),

  resetPay: () =>
    set({
      payStep: null,
      payQ: '',
      payGuest: null,
      signed: false,
      cardState: 'wait',
      tip: 20,
      cashTender: 0,
      split: 'none',
    }),
}));

export function nextLineUid(): number {
  return ++uidSeq;
}
