'use client';
import { useMemo, useRef } from 'react';
import { usePos } from '@/lib/pos-store';
import {
  buildCheckView,
  useActiveCheck,
  useNow,
  usePosChecks,
  usePosOutlets,
  usePosTables,
} from '@/lib/pos-api';
import { OUTLETS } from '@/lib/pos-data';
import { PosPulseStrip, PosTopBar } from '@/components/pos/pos-shell';
import { FloorBoard } from '@/components/pos/floor-board';
import { TabsBoard } from '@/components/pos/tabs-board';
import { QueueBoard } from '@/components/pos/queue-board';
import { OrderScreen } from '@/components/pos/order-screen';
import { SettlementDrawer } from '@/components/pos/settlement-drawer';
import { KdsScreen } from '@/components/pos/kds-screen';
import { ManagerScreen } from '@/components/pos/manager-screen';
import { PosToast } from '@/components/pos/pos-toast';

const NO_LINES: never[] = [];

/** Vela POS Terminal — Floor/Tabs/Queue · Order · Kitchen · Manager on one touch surface. */
export default function PosPage() {
  const s = usePos();
  const now = useNow(30_000);
  const { data: outlets } = usePosOutlets();

  const outlet = useMemo(
    () => outlets?.find((o) => o.code === s.outletCode) ?? outlets?.[0],
    [outlets, s.outletCode],
  );
  const vistaOutlet = outlets?.find((o) => o.code === 'VISTA');
  const lagoonOutlet = outlets?.find((o) => o.code === 'LAGOON');

  const { data: tables } = usePosTables(outlet?.id);
  const { data: vistaTables } = usePosTables(vistaOutlet?.id);
  const { data: lagoonTables } = usePosTables(lagoonOutlet?.id);
  const { data: checks } = usePosChecks(outlet?.id);

  const activeCheck = useActiveCheck(outlet?.id);
  const clientLines =
    usePos((st) => (activeCheck ? st.lines[activeCheck.id] : undefined)) ?? NO_LINES;
  const discount = usePos((st) => (activeCheck ? st.discounts[activeCheck.id] : undefined));
  const locallyClosed = usePos((st) => st.locallyClosed);

  const cfg = OUTLETS[s.outletCode] ?? OUTLETS.VISTA!;
  const quick = cfg.key !== 'vista';
  const view = useMemo(
    () => buildCheckView(activeCheck, clientLines, discount, quick),
    [activeCheck, clientLines, discount, quick],
  );

  // Keep the settling check mounted after close removes it from the open-checks query —
  // the posted confirmation (folio + GL) renders from this snapshot.
  const lastCheckRef = useRef(activeCheck);
  if (activeCheck) lastCheckRef.current = activeCheck;
  const settleCheck = activeCheck ?? lastCheckRef.current;

  const openChecks = (checks ?? []).filter((c) => !locallyClosed[c.id]);
  const e86Count = Object.values(usePos((st) => st.e86)).filter(Boolean).length;

  const tablesByOutlet = useMemo(() => {
    const m = new Map<string, typeof tables & object>();
    if (vistaOutlet && vistaTables) m.set(vistaOutlet.id, vistaTables);
    if (lagoonOutlet && lagoonTables) m.set(lagoonOutlet.id, lagoonTables);
    return m;
  }, [vistaOutlet, vistaTables, lagoonOutlet, lagoonTables]);

  if (!outlets || !outlet) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13.5px] text-[var(--ink-tertiary)]">
        Connecting to the outlet…
      </div>
    );
  }

  return (
    <>
      <PosTopBar outlets={outlets} />
      <PosPulseStrip openChecks={openChecks.length} e86Count={e86Count} />

      {s.screen === 'floor' && cfg.key === 'vista' && (
        <FloorBoard outlet={outlet} tables={tables ?? []} checks={openChecks} now={now} />
      )}
      {s.screen === 'floor' && cfg.key === 'lagoon' && (
        <TabsBoard outlet={outlet} tables={tables ?? []} checks={openChecks} />
      )}
      {s.screen === 'floor' && cfg.key === 'rs' && <QueueBoard />}

      {s.screen === 'order' && <OrderScreen check={activeCheck} tables={tables ?? []} />}

      {s.screen === 'kds' && <KdsScreen outlets={outlets} tablesByOutlet={tablesByOutlet} />}

      {s.screen === 'manager' && <ManagerScreen outlets={outlets} openChecks={openChecks.length} />}

      {s.payStep && settleCheck && (
        <SettlementDrawer check={settleCheck} tables={tables ?? []} view={view} />
      )}
      <PosToast />
    </>
  );
}
