'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PosCheck, PosCheckItem } from '@vela/contracts';
import { useSdk } from './sdk';
import { useSession } from './store';
import { usePos, type ClientLine } from './pos-store';
import {
  centsToMoney,
  courseTag,
  decodeItemName,
  encodeItemName,
  moneyToCents,
  parseCourseTag,
} from './pos-data';

/**
 * Server integration for the POS terminal. The invariant: client lines (seat/course/mods detail)
 * exist only between sync points — "fire" and "settle" push them as check items, so the database
 * check is the system of record the moment anything leaves the terminal.
 */

export function usePosOutlets() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  return useQuery({
    queryKey: ['pos', 'outlets', propertyId],
    queryFn: () => sdk.posOutlets(),
    enabled: !!propertyId,
  });
}

export function usePosTables(outletId: string | undefined) {
  const sdk = useSdk();
  return useQuery({
    queryKey: ['pos', 'tables', outletId],
    queryFn: () => sdk.posTables(outletId!),
    enabled: !!outletId,
    staleTime: 60_000,
  });
}

export function usePosChecks(outletId: string | undefined) {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const offline = usePos((s) => s.offline);
  return useQuery({
    queryKey: ['pos', 'checks', outletId, propertyId],
    queryFn: () => sdk.listPosChecks({ outletId, limit: 100 }),
    enabled: !!propertyId && !!outletId && !offline,
    refetchInterval: offline ? false : 15_000,
  });
}

export function useKdsItems() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const offline = usePos((s) => s.offline);
  return useQuery({
    queryKey: ['pos', 'kds', propertyId],
    queryFn: () => sdk.kds(),
    enabled: !!propertyId && !offline,
    refetchInterval: offline ? false : 5_000,
  });
}

/** A 1-second heartbeat for clocks and SLA timers. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs]);
  return now;
}

// ── Display model: merge server items with the client working layer ──

export interface DisplayLine {
  key: string;
  source: 'server' | 'client';
  uid?: number;
  itemId?: string;
  name: string;
  mods: string[];
  qty: number;
  /** Line total, minor units (0 for comps). */
  cents: number;
  seat: number;
  course: number;
  status: 'unsent' | 'held' | 'kitchen' | 'served';
  comp: boolean;
}

export interface CheckView {
  lines: DisplayLine[];
  /** Items subtotal (excl. adjustments/service), minor units. */
  sub: number;
  svc: number;
  disc: number;
  discLabel: string | null;
  total: number;
  unsentCount: number;
  courses: number[];
}

function isAdjItem(i: PosCheckItem): boolean {
  const tag = parseCourseTag(i.course);
  return tag.kind === 'adj' || tag.kind === 'svc';
}

export function buildCheckView(
  check: PosCheck | undefined,
  clientLines: ClientLine[],
  discount: { label: string; amt: number } | undefined,
  quick: boolean,
): CheckView {
  const lines: DisplayLine[] = [];
  let sub = 0;
  let svc = 0;
  let serverDisc = 0;

  for (const i of check?.items ?? []) {
    if (i.status === 'voided') continue;
    const tag = parseCourseTag(i.course);
    const cents = moneyToCents(i.lineTotal);
    if (tag.kind === 'svc') {
      svc += cents;
      continue;
    }
    if (tag.kind === 'adj') {
      serverDisc += -cents;
      continue;
    }
    const { name, mods } = decodeItemName(i.name);
    sub += cents;
    lines.push({
      key: i.id,
      source: 'server',
      name,
      mods,
      qty: i.quantity,
      cents,
      seat: tag.kind === 'course' ? tag.seat : 1,
      course: tag.kind === 'course' ? tag.course : 1,
      status: i.status === 'new' ? 'unsent' : i.status === 'fired' ? 'kitchen' : 'served',
      comp: cents === 0 && mods.some((m) => m.startsWith('Comp')),
    });
  }

  for (const l of clientLines) {
    const cents = l.comp ? 0 : (l.price + l.modDelta) * l.qty;
    sub += cents;
    lines.push({
      key: `c${l.uid}`,
      source: 'client',
      uid: l.uid,
      itemId: l.itemId,
      name: l.name,
      mods: l.mods,
      qty: l.qty,
      cents,
      seat: l.seat,
      course: quick ? 1 : l.course,
      status: l.status === 'held' ? 'held' : l.status === 'queued' ? 'kitchen' : 'unsent',
      comp: !!l.comp,
    });
  }

  const covers = check?.covers ?? 1;
  if (!svc && covers >= 6) svc = Math.round(sub * 0.2);
  const disc = serverDisc + (discount?.amt ?? 0);
  const unsentCount = lines.filter((l) => l.status === 'unsent').length;
  const courses = [...new Set(lines.map((l) => l.course))].sort((a, b) => a - b);
  return {
    lines,
    sub,
    svc,
    disc,
    discLabel: discount?.label ?? null,
    total: sub + svc - disc,
    unsentCount,
    courses,
  };
}

// ── Operations (fire / settle / void) with offline queueing ──

export function usePosOps() {
  const sdk = useSdk();
  const queryClient = useQueryClient();
  const pos = usePos;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['pos'] });
  }, [queryClient]);

  /** Push a batch of client lines as check items. Returns the latest server check. */
  const pushLines = useCallback(
    async (checkId: string, lines: ClientLine[]): Promise<PosCheck | null> => {
      let latest: PosCheck | null = null;
      for (const l of lines) {
        latest = await sdk.addPosItem(
          checkId,
          {
            name: encodeItemName(l.name, l.comp ? [...l.mods, 'Comp — guest recovery'] : l.mods),
            course: l.course > 0 ? courseTag(l.course, l.seat) : 'QS',
            quantity: l.qty,
            unitPrice: centsToMoney(l.comp ? 0 : l.price + l.modDelta),
          },
          { idempotencyKey: `pos-line-${checkId}-${l.uid}` },
        );
      }
      return latest;
    },
    [sdk],
  );

  /** Fire specific client lines (a course, or everything unsent). Queues when offline. */
  const fireLines = useCallback(
    async (checkId: string, lines: ClientLine[], hasServerUnsent: boolean) => {
      const s = pos.getState();
      const uids = lines.map((l) => l.uid);
      const run = async () => {
        await pushLines(checkId, lines);
        if (lines.length || hasServerUnsent) {
          await sdk.firePosCheck(checkId, {
            idempotencyKey: `pos-fire-${checkId}-${uids.join('.')}`,
          });
        }
        pos.getState().clearLines(checkId, uids);
        invalidate();
      };
      if (s.offline) {
        // Render as "in kitchen" immediately; the op log delivers it on reconnect.
        s.updateLines(
          checkId,
          (s.lines[checkId] ?? []).map((l) =>
            uids.includes(l.uid) ? { ...l, status: 'queued' } : l,
          ),
        );
        s.enqueueOp({ key: `fire-${checkId}-${Date.now()}`, label: 'Fire to kitchen', run });
        return 'queued' as const;
      }
      await run();
      return 'done' as const;
    },
    [invalidate, pos, pushLines, sdk],
  );

  /**
   * Make the server check match the terminal before settlement: push every working line, the
   * reason-coded discount, and the auto-gratuity. Returns the authoritative check.
   */
  const syncForSettlement = useCallback(
    async (checkId: string): Promise<PosCheck> => {
      const s = pos.getState();
      const clientLines = s.lines[checkId] ?? [];
      let check = await pushLines(checkId, clientLines);
      check = check ?? (await sdk.getPosCheck(checkId));
      s.clearLines(
        checkId,
        clientLines.map((l) => l.uid),
      );

      const discount = s.discounts[checkId];
      const hasAdj = check.items.some((i) => parseCourseTag(i.course).kind === 'adj');
      if (discount && !hasAdj) {
        check = await sdk.addPosItem(
          checkId,
          {
            name: `Discount — ${discount.label}`,
            course: 'ADJ',
            quantity: 1,
            unitPrice: centsToMoney(-discount.amt),
          },
          { idempotencyKey: `pos-disc-${checkId}-${discount.kind}` },
        );
      }
      const hasSvc = check.items.some((i) => parseCourseTag(i.course).kind === 'svc');
      if (!hasSvc && check.covers >= 6) {
        const itemsSub = check.items
          .filter((i) => i.status !== 'voided' && !isAdjItem(i))
          .reduce((acc, i) => acc + moneyToCents(i.lineTotal), 0);
        check = await sdk.addPosItem(
          checkId,
          {
            name: 'Auto-gratuity 20% — party of 6+',
            course: 'SVC',
            quantity: 1,
            unitPrice: centsToMoney(Math.round(itemsSub * 0.2)),
          },
          { idempotencyKey: `pos-svc-${checkId}` },
        );
      }
      invalidate();
      return check;
    },
    [invalidate, pos, pushLines, sdk],
  );

  /** Close with payments equal to the server total, or as a room charge to a folio. */
  const closeCheck = useCallback(
    async (
      checkId: string,
      settle:
        | {
            kind: 'payment';
            method: 'card' | 'cash' | 'ar_transfer' | 'voucher';
            reference?: string;
          }
        | { kind: 'room'; folioId: string },
    ): Promise<PosCheck> => {
      const synced = await syncForSettlement(checkId);
      const closed =
        settle.kind === 'room'
          ? await sdk.closePosCheck(
              checkId,
              { payments: [], roomFolioId: settle.folioId },
              { idempotencyKey: `pos-close-${checkId}` },
            )
          : await sdk.closePosCheck(
              checkId,
              {
                payments: [
                  { method: settle.method, amount: synced.total, reference: settle.reference },
                ],
              },
              { idempotencyKey: `pos-close-${checkId}` },
            );
      invalidate();
      return closed;
    },
    [invalidate, sdk, syncForSettlement],
  );

  /** Void a line that's already with the kitchen: a reason-coded negative adjustment. */
  const voidServerLine = useCallback(
    async (checkId: string, line: { name: string; cents: number }, reason: string) => {
      const s = pos.getState();
      const run = async () => {
        await sdk.addPosItem(
          checkId,
          {
            name: `Void — ${line.name} · ${reason}`,
            course: 'ADJ',
            quantity: 1,
            unitPrice: centsToMoney(-line.cents),
          },
          { idempotencyKey: `pos-void-${checkId}-${line.name}-${Date.now()}` },
        );
        invalidate();
      };
      if (s.offline) {
        s.enqueueOp({ key: `void-${checkId}-${Date.now()}`, label: 'Void item', run });
        return 'queued' as const;
      }
      await run();
      return 'done' as const;
    },
    [invalidate, pos, sdk],
  );

  /** Replay the local op log after connectivity returns. */
  const replayQueue = useCallback(async (): Promise<number> => {
    const ops = pos.getState().drainQueue();
    for (const op of ops) {
      await op.run();
    }
    if (ops.length) invalidate();
    return ops.length;
  }, [invalidate, pos]);

  return {
    pushLines,
    fireLines,
    syncForSettlement,
    closeCheck,
    voidServerLine,
    replayQueue,
    invalidate,
  };
}

/** Stable per-device id for idempotent offline ops (design: append-only op log). */
export function deviceId(): string {
  if (typeof localStorage === 'undefined') return 'T-03';
  let id = localStorage.getItem('vela-pos-device');
  if (!id) {
    id = `T-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('vela-pos-device', id);
  }
  return id;
}

export function useActiveCheck(outletId: string | undefined) {
  const { data: checks } = usePosChecks(outletId);
  const activeCheckId = usePos((s) => s.activeCheckId);
  return useMemo(() => checks?.find((c) => c.id === activeCheckId), [checks, activeCheckId]);
}
