/**
 * Phase-1 smoke: drives every new endpoint against a seeded dev API (not a CI gate; the demo is).
 * Usage: tsx tooling/smoke/phase1.ts  (API on :4000, after `pnpm seed`)
 */
import { createClient } from '../../packages/contracts/src/sdk';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4000';

function assert(cond: unknown, label: string): void {
  if (!cond) {
    console.error(`✗ ${label}`);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

async function main(): Promise<void> {
  const signin = await fetch(`${BASE}/v1/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'greta@grand-vela.demo', password: 'demo-password' }),
  });
  const { token } = (await signin.json()) as { token: string };
  assert(token, 'signed in');

  let sdk = createClient({ baseUrl: BASE, token });
  const me = await sdk.me();
  const propertyId = me.properties[0]!.id;
  sdk = createClient({ baseUrl: BASE, token, propertyId });

  // ── Boards & search ──
  const arrivals = await sdk.arrivals();
  assert(arrivals.length > 0, `arrivals board (${arrivals.length})`);
  const rack = await sdk.roomRack({ from: '2026-06-11', to: '2026-06-18' });
  assert(rack.length > 0, `room rack (${rack.length} rooms)`);
  const listed = await sdk.listReservations({ status: 'confirmed', limit: 5 });
  assert(listed.length > 0, `reservation list/search (${listed.length})`);

  // ── Cashier session ──
  const session = await sdk.openCashierSession({ openingFloat: { amount: '100', currency: 'USD' } });
  assert(session.status === 'open', 'cashier session opened');

  // ── Deposit → check-in applies it ──
  const target = arrivals[0]!;
  await sdk.recordDeposit(target.id, { method: 'card', amount: { amount: '50', currency: 'USD' } });
  const deps = await sdk.listDeposits(target.id);
  assert(deps[0]?.status === 'held', 'deposit recorded (held)');

  const vacantRoom = rack.find((r) => r.occupancy === 'vacant' && r.stays.length === 0)!;
  const checked = await sdk.checkIn(target.id, { roomId: vacantRoom.roomId });
  assert(checked.status === 'checked_in', 'checked in with room');
  const depsAfter = await sdk.listDeposits(target.id);
  assert(depsAfter[0]?.status === 'applied', 'deposit auto-applied at check-in');
  const folio = await sdk.getFolio(checked.folioId!);
  assert(folio.balance.amount === '-50.0000', `folio shows applied deposit (${folio.balance.amount})`);

  // ── Modify another arrival (shorten stay) ──
  const second = arrivals[1]!;
  const before = await sdk.getReservation(second.id);
  const shorter = await sdk.modifyReservation(second.id, {
    departureDate: before.nights.length > 1 ? before.nights[before.nights.length - 1]!.stayDate : undefined,
    adults: 2,
  });
  assert(shorter.adults === 2, 'reservation modified');

  // ── No-show + reinstate ──
  const third = arrivals[2]!;
  const ns = await sdk.markNoShow(third.id, { reason: 'smoke' });
  assert(ns.status === 'no_show', 'manual no-show');
  const back = await sdk.reinstate(third.id, { reason: 'guest called' });
  assert(back.status === 'confirmed', 'reinstated');

  // ── Walk-in ──
  const kingType = rack.find((r) => r.occupancy === 'vacant' && r.stays.length === 0 && r.roomId !== vacantRoom.roomId)!;
  const avail = await sdk.availability({ from: '2026-06-11', to: '2026-06-13' });
  const rt = avail.find((a) => a.roomTypeCode === kingType.roomTypeCode)!;
  const walkin = await sdk.walkIn({
    guest: { firstName: 'Smoke', lastName: 'Walkin' },
    departureDate: '2026-06-13',
    roomTypeId: rt.roomTypeId,
    roomId: kingType.roomId,
    adults: 1,
    children: 0,
  });
  assert(walkin.status === 'checked_in', 'walk-in created and checked in');

  // ── Room move ──
  const moveTarget = rack.find(
    (r) =>
      r.occupancy === 'vacant' &&
      r.stays.length === 0 &&
      r.roomTypeCode === kingType.roomTypeCode &&
      r.roomId !== kingType.roomId &&
      r.roomId !== vacantRoom.roomId,
  );
  if (moveTarget) {
    await sdk.roomMove(walkin.id, { roomId: moveTarget.roomId, effectiveDate: '2026-06-11', reason: 'smoke' });
    console.log('✓ room move');
  }

  // ── Housekeeping ──
  const board = await sdk.hkBoard();
  assert(board.length > 0, `housekeeping board (${board.length})`);
  const dirty = board.find((r) => r.openTask);
  assert(dirty, 'departure-clean task exists after room move');
  await sdk.hkTaskAction(dirty!.openTask!.id, 'start');
  const done = await sdk.hkTaskAction(dirty!.openTask!.id, 'complete');
  assert(done.status === 'done', 'task start → complete flips room clean');

  const inspected = await sdk.updateRoomStatus(dirty!.roomId, { hkStatus: 'inspected' });
  assert(inspected.hkStatus === 'inspected', 'room status update → inspected');

  // ── Maintenance ──
  const ticket = await sdk.createMaintenanceTicket({
    roomId: dirty!.roomId,
    category: 'hvac',
    priority: 'high',
    title: 'AC not cooling',
  });
  await sdk.assignMaintenanceTicket(ticket.id, { assignedTo: me.userId });
  await sdk.completeMaintenanceTicket(ticket.id, { resolutionNotes: 'recharged' });
  const closed = await sdk.closeMaintenanceTicket(ticket.id);
  assert(closed.status === 'verified', 'maintenance ticket lifecycle');

  // ── Out of order ──
  const oooRoom = board.find((r) => r.occupancy === 'vacant' && !r.openTask && r.roomId !== dirty!.roomId)!;
  const ooo = await sdk.setOutOfOrder(oooRoom.roomId, {
    fromDate: '2026-06-20',
    toDate: '2026-06-22',
    kind: 'out_of_order',
    reason: 'smoke',
  });
  assert(ooo.id, 'out-of-order period set');

  // ── Folio ops: extra folio + transfer ──
  await sdk.postCharge(checked.folioId!, {
    chargeCode: 'ROOM',
    amount: { amount: '120', currency: 'USD' },
    description: 'smoke charge',
  });
  const extra = await sdk.createFolio({ reservationId: target.id, type: 'guest' });
  const src = await sdk.getFolio(checked.folioId!);
  const chargePosting = src.postings.find((p) => p.sourceType === 'manual' || p.sourceType === 'room')!;
  const afterTransfer = await sdk.transferPosting(checked.folioId!, {
    postingId: chargePosting.id,
    toFolioId: extra.id,
  });
  const extraAfter = await sdk.getFolio(extra.id);
  assert(
    extraAfter.balance.amount === chargePosting.amount.amount,
    `posting transferred (target balance ${extraAfter.balance.amount})`,
  );
  assert(afterTransfer.balance.amount !== src.balance.amount, 'source balance reduced');

  // ── Rates ──
  const plans = await sdk.ratePlans();
  assert(plans.length > 0, `rate plans (${plans.length})`);
  const grid = await sdk.ratePrices(plans[0]!.id, { from: '2026-06-11', to: '2026-06-15' });
  assert(grid.length > 0, `price grid (${grid.length} cells)`);
  const updated = await sdk.updateRatePrices(plans[0]!.id, {
    prices: [{ roomTypeId: grid[0]!.roomTypeId, stayDate: grid[0]!.stayDate, price: { amount: '199', currency: 'USD' } }],
  });
  assert(updated.some((p) => p.price.amount === '199.0000'), 'bulk price update');

  // ── Reports & guests ──
  const flash = await sdk.managerFlash();
  assert(flash.physicalRooms > 0 && Number(flash.occupancyPct) > 0, `manager flash (occ ${flash.occupancyPct}%)`);
  const found = await sdk.searchGuests({ q: 'Walkin' });
  assert(found.length === 1, 'guest search');
  const profile = await sdk.getGuest(found[0]!.id);
  assert(profile.reservations.length === 1, 'guest profile with stay history');
  const renamed = await sdk.updateGuest(found[0]!.id, { vipTier: 'gold' });
  assert(renamed.vipTier === 'gold', 'guest update');

  // ── Departures / in-house boards ──
  const inHouse = await sdk.inHouse();
  assert(inHouse.length >= 2, `in-house board (${inHouse.length})`);
  const departures = await sdk.departures();
  console.log(`✓ departures board (${departures.length})`);

  // ── Cashier close (cash payment lands in session) ──
  await sdk.recordPayment(extra.id, { method: 'cash', amount: { amount: '20', currency: 'USD' } });
  const closedSession = await sdk.closeCashierSession(session.id, {
    countedTotal: { amount: '120', currency: 'USD' },
  });
  assert(
    closedSession.status === 'closed' && closedSession.variance?.amount === '0.0000',
    `cashier close ties (expected ${closedSession.expectedTotal?.amount}, counted 120)`,
  );

  console.log('\n✔ Phase-1 smoke passed');
}

main().catch((e) => {
  console.error('✗ smoke failed:', e);
  process.exit(1);
});
