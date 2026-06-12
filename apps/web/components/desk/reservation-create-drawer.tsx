'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  CalendarDays,
  Check,
  DoorOpen,
  Minus,
  Plus,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Button, Drawer, Input, MoneyText, Skeleton } from '@vela/ui';
import type { AvailableRoom, GuestRef, Money } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useDeskIntent, useSession, useToast } from '@/lib/store';

type Step = 'stay' | 'guest';

const STEP_TABS: Array<[Step, LucideIcon, string]> = [
  ['stay', CalendarDays, 'Stay'],
  ['guest', UserRound, 'Guest'],
];

const SELECT_CLASS =
  'flex h-[var(--control-h)] w-full rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[var(--cell-px)] text-[var(--font-size-ui)] text-[var(--ink-primary)] focus-visible:border-[var(--line-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-focus)]';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function moneyTimes(value: Money | null | undefined, count: number): Money | null {
  if (!value || count <= 0) return null;
  return { amount: (Number(value.amount) * count).toFixed(2), currency: value.currency };
}

function moneySum(values: Array<Money | null | undefined>): Money | null {
  const usable = values.filter((value): value is Money => Boolean(value));
  if (!usable.length) return null;
  const currency = usable[0]!.currency;
  return {
    amount: usable
      .filter((value) => value.currency === currency)
      .reduce((sum, value) => sum + Number(value.amount), 0)
      .toFixed(2),
    currency,
  };
}

function idempotencyKey(prefix: string, index: number): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}-${index}`;
}

function roomStatusTone(room: AvailableRoom): 'positive' | 'caution' | 'neutral' {
  if (room.hkStatus === 'inspected') return 'positive';
  if (room.hkStatus === 'clean') return 'neutral';
  return 'caution';
}

export function ReservationCreateDrawer() {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const propertyId = useSession((s) => s.activePropertyId);
  const mode = useDeskIntent((s) => s.reservationCreateMode);
  const close = useDeskIntent((s) => s.closeReservationCreate);
  const open = mode !== null;

  const { data: flash } = useQuery({
    queryKey: ['manager-flash', propertyId],
    queryFn: () => sdk.managerFlash(),
    enabled: open && !!propertyId,
  });
  const businessDate = flash?.businessDate ?? todayIso();

  const [step, setStep] = useState<Step>('stay');
  const [arrivalDate, setArrivalDate] = useState(businessDate);
  const [departureDate, setDepartureDate] = useState(addDays(businessDate, 1));
  const [walkOutDate, setWalkOutDate] = useState(addDays(businessDate, 1));
  const [ratePlanId, setRatePlanId] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [selectedRooms, setSelectedRooms] = useState<Record<string, AvailableRoom>>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const { data: ratePlans } = useQuery({
    queryKey: ['rate-plans', propertyId],
    queryFn: () => sdk.ratePlans(),
    enabled: open && !!propertyId,
  });

  useEffect(() => {
    if (!open) return;
    setStep('stay');
    setArrivalDate(businessDate);
    setDepartureDate(addDays(businessDate, 1));
    setWalkOutDate(addDays(businessDate, 1));
    setAdults(1);
    setChildren(0);
    setTypeCounts({});
    setSelectedRooms({});
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setNotes('');
  }, [open, mode]);

  useEffect(() => {
    if (ratePlanId || !ratePlans?.length) return;
    setRatePlanId(ratePlans.find((plan) => plan.isActive)?.id ?? ratePlans[0]!.id);
  }, [ratePlanId, ratePlans]);

  const from = mode === 'walk_in' ? businessDate : arrivalDate;
  const to = mode === 'walk_in' ? walkOutDate : departureDate;
  const validRange = Boolean(from && to && to > from);
  const selectedRatePlan = ratePlans?.find((plan) => plan.id === ratePlanId);

  const { data: availability, isFetching: availabilityLoading } = useQuery({
    queryKey: ['availability', propertyId, from, to, ratePlanId, adults, children],
    queryFn: () =>
      sdk.availability({
        from,
        to,
        ratePlanId: ratePlanId || undefined,
        adults,
        children,
      }),
    enabled: open && validRange && !!propertyId,
  });

  const { data: availableRooms, isFetching: roomsLoading } = useQuery({
    queryKey: ['available-rooms', propertyId, businessDate, walkOutDate],
    queryFn: () => sdk.availableRooms({ from: businessDate, to: walkOutDate }),
    enabled: open && mode === 'walk_in' && validRange && !!propertyId,
  });

  useEffect(() => {
    setTypeCounts({});
    setSelectedRooms({});
  }, [mode, from, to, ratePlanId, adults, children]);

  const availabilityByType = useMemo(
    () => new Map((availability ?? []).map((row) => [row.roomTypeId, row])),
    [availability],
  );

  const roomsByType = useMemo(() => {
    const groups = new Map<string, AvailableRoom[]>();
    for (const room of availableRooms ?? []) {
      const key = room.roomTypeId;
      groups.set(key, [...(groups.get(key) ?? []), room]);
    }
    return [...groups.entries()].map(([roomTypeId, rooms]) => ({
      roomTypeId,
      roomTypeCode: rooms[0]!.roomTypeCode,
      roomTypeName: rooms[0]!.roomTypeName,
      rooms,
    }));
  }, [availableRooms]);

  const selectedTypeCount = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
  const selectedRoomList = Object.values(selectedRooms).sort((a, b) =>
    a.number.localeCompare(b.number),
  );
  const selectedCount = mode === 'walk_in' ? selectedRoomList.length : selectedTypeCount;
  const selectedTotal = useMemo(() => {
    if (mode === 'walk_in') {
      return moneySum(
        selectedRoomList.map((room) => availabilityByType.get(room.roomTypeId)?.totalPrice),
      );
    }
    return moneySum(
      Object.entries(typeCounts).map(([roomTypeId, count]) =>
        moneyTimes(availabilityByType.get(roomTypeId)?.totalPrice, count),
      ),
    );
  }, [availabilityByType, mode, selectedRoomList, typeCounts]);

  const guestValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  const create = useMutation({
    mutationFn: async () => {
      if (!mode) throw new Error('Choose a creation mode');
      if (!ratePlanId) throw new Error('Choose a rate plan');
      const initialGuest: GuestRef = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };
      let guest: GuestRef = initialGuest;

      if (mode === 'walk_in') {
        const created = [];
        for (const [index, room] of selectedRoomList.entries()) {
          const reservation = await sdk.walkIn(
            {
              guest,
              departureDate: walkOutDate,
              roomTypeId: room.roomTypeId,
              roomId: room.roomId,
              ratePlanId,
              adults,
              children,
            },
            { idempotencyKey: idempotencyKey('walk-in', index) },
          );
          guest = { id: reservation.guestId };
          created.push(reservation);
        }
        return created;
      }

      const roomTypeIds = Object.entries(typeCounts).flatMap(([roomTypeId, count]) =>
        Array.from({ length: count }, () => roomTypeId),
      );
      const created = [];
      for (const [index, roomTypeId] of roomTypeIds.entries()) {
        const reservation = await sdk.createReservation(
          {
            guest,
            arrivalDate,
            departureDate,
            roomTypeId,
            ratePlanId,
            adults,
            children,
            notes: notes.trim() || undefined,
            source: { channel: 'direct' },
          },
          { idempotencyKey: idempotencyKey('reservation', index) },
        );
        guest = { id: reservation.guestId };
        created.push(reservation);
      }
      return created;
    },
    onSuccess: (created) => {
      for (const key of [
        'arrivals',
        'departures',
        'in-house',
        'room-rack',
        'available-rooms',
        'manager-flash',
        'reservations',
        'hk-board',
      ]) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      showToast({
        tone: 'positive',
        text: `${created.length} ${mode === 'walk_in' ? 'walk-in' : 'reservation'}${created.length === 1 ? '' : 's'} created`,
      });
      close();
    },
    onError: (error: Error) => {
      showToast({ tone: 'critical', text: error.message });
    },
  });

  const incrementType = (roomTypeId: string, available: number, delta: 1 | -1) => {
    setTypeCounts((current) => {
      const nextCount = Math.max(0, Math.min(available, (current[roomTypeId] ?? 0) + delta));
      const next = { ...current };
      if (nextCount === 0) delete next[roomTypeId];
      else next[roomTypeId] = nextCount;
      return next;
    });
  };

  const toggleRoom = (room: AvailableRoom) => {
    setSelectedRooms((current) => {
      const next = { ...current };
      if (next[room.roomId]) delete next[room.roomId];
      else next[room.roomId] = room;
      return next;
    });
  };

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
        <span className="font-medium text-[var(--ink-secondary)]">
          {step === 'stay' ? '1. Stay and inventory' : '2. Guest information'}
        </span>
        {selectedCount > 0 && (
          <>
            {' '}
            - {selectedCount} unit{selectedCount === 1 ? '' : 's'}
            {selectedTotal ? (
              <>
                {' '}
                - <MoneyText value={selectedTotal} className="text-[12px]" />
              </>
            ) : null}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {step === 'guest' && (
          <Button
            variant="secondary"
            onClick={() => setStep('stay')}
            disabled={create.isPending}
            data-testid="golden-walkin-back"
          >
            Back
          </Button>
        )}
        {step === 'stay' ? (
          <Button
            onClick={() => setStep('guest')}
            disabled={!validRange || !ratePlanId || selectedCount === 0}
            data-testid="golden-walkin-continue"
          >
            Continue
          </Button>
        ) : (
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            disabled={!guestValid || selectedCount === 0}
            data-testid="golden-walkin-create"
          >
            Create {mode === 'walk_in' ? 'walk-in' : 'reservation'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={close}
      width="lg"
      title={mode === 'walk_in' ? 'New walk-in' : 'New reservation'}
      description={
        mode === 'walk_in'
          ? `Arrives ${businessDate} - choose checkout and room numbers`
          : 'Choose dates, rate plan, and room-type quantities'
      }
      footer={footer}
      testId={mode === 'walk_in' ? 'golden-walkin-drawer' : 'golden-reservation-drawer'}
    >
      <div
        className="space-y-[var(--space-5)]"
        data-flow={mode === 'walk_in' ? 'desk-walkin' : 'desk-reservation-create'}
        data-flow-step={step}
      >
        <div className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-sunken)] p-1">
          {STEP_TABS.map(([key, Icon, label]) => (
            <button
              key={key}
              data-testid={`golden-walkin-step-${key}`}
              onClick={() => {
                if (key === 'guest' && selectedCount === 0) return;
                setStep(key);
              }}
              className={
                'flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-[12.5px] transition-colors ' +
                (step === key
                  ? 'bg-[var(--bg-surface)] font-medium text-[var(--ink-primary)] shadow-[var(--shadow-e1)]'
                  : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]')
              }
            >
              <Icon className="mr-1.5 inline size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {step === 'stay' ? (
          <div className="space-y-[var(--space-5)]">
            <section className="grid gap-3 sm:grid-cols-2">
              {mode === 'reservation' ? (
                <>
                  <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                    Check-in
                    <Input
                      type="date"
                      value={arrivalDate}
                      data-testid="golden-reservation-arrival-date"
                      onChange={(event) => {
                        const next = event.target.value;
                        setArrivalDate(next);
                        if (departureDate <= next) setDepartureDate(addDays(next, 1));
                      }}
                    />
                  </label>
                  <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                    Check-out
                    <Input
                      type="date"
                      value={departureDate}
                      min={addDays(arrivalDate, 1)}
                      data-testid="golden-reservation-departure-date"
                      onChange={(event) => setDepartureDate(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                    Check-in
                    <Input
                      type="date"
                      value={businessDate}
                      disabled
                      data-testid="golden-walkin-arrival-date"
                    />
                  </label>
                  <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                    Check-out
                    <Input
                      type="date"
                      value={walkOutDate}
                      min={addDays(businessDate, 1)}
                      data-testid="golden-walkin-departure-date"
                      onChange={(event) => setWalkOutDate(event.target.value)}
                    />
                  </label>
                </>
              )}
              <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                Rate plan
                <select
                  value={ratePlanId}
                  onChange={(event) => setRatePlanId(event.target.value)}
                  className={SELECT_CLASS}
                  data-testid="golden-walkin-rate-plan"
                >
                  <option value="" disabled>
                    Select rate plan
                  </option>
                  {(ratePlans ?? []).map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.code} - {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                  Adults
                  <Input
                    type="number"
                    min={1}
                    value={adults}
                    data-testid="golden-walkin-adults"
                    onChange={(event) => setAdults(Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>
                <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                  Children
                  <Input
                    type="number"
                    min={0}
                    value={children}
                    data-testid="golden-walkin-children"
                    onChange={(event) => setChildren(Math.max(0, Number(event.target.value) || 0))}
                  />
                </label>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                  {mode === 'walk_in' ? 'Available rooms' : 'Room types'}
                </h3>
                {selectedRatePlan && <Badge tone="accent">{selectedRatePlan.code}</Badge>}
              </div>

              {mode === 'reservation' ? (
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)]">
                  {availabilityLoading &&
                    Array.from({ length: 3 }, (_, index) => (
                      <div
                        key={index}
                        className="border-b border-[var(--line-hairline)] p-4 last:border-0"
                      >
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  {!availabilityLoading && (availability ?? []).length === 0 && (
                    <div className="p-4 text-center text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                      No room types available for this stay.
                    </div>
                  )}
                  {(availability ?? []).map((row) => {
                    const count = typeCounts[row.roomTypeId] ?? 0;
                    return (
                      <div
                        key={row.roomTypeId}
                        className="flex flex-wrap items-center gap-3 border-b border-[var(--line-hairline)] px-4 py-3 last:border-0"
                      >
                        <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--interactive-selected)] text-[var(--ink-accent)]">
                          <BedDouble className="size-4" />
                        </span>
                        <span className="min-w-[160px] flex-1">
                          <span className="block font-medium">{row.roomTypeCode}</span>
                          <span className="block text-[12px] text-[var(--ink-tertiary)]">
                            {row.roomTypeName}
                          </span>
                        </span>
                        <Badge tone={row.minAvailable > 0 ? 'positive' : 'critical'}>
                          {row.minAvailable} available
                        </Badge>
                        {row.totalPrice && (
                          <MoneyText value={row.totalPrice} className="text-[13px]" />
                        )}
                        <span className="inline-flex items-center gap-1">
                          <button
                            aria-label={`Remove ${row.roomTypeCode}`}
                            onClick={() => incrementType(row.roomTypeId, row.minAvailable, -1)}
                            disabled={count === 0}
                            className="grid size-7 place-items-center rounded-[var(--radius-md)] border border-[var(--line-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] disabled:opacity-40"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono text-[13px] tabular-nums">
                            {count}
                          </span>
                          <button
                            aria-label={`Add ${row.roomTypeCode}`}
                            onClick={() => incrementType(row.roomTypeId, row.minAvailable, 1)}
                            disabled={count >= row.minAvailable}
                            className="grid size-7 place-items-center rounded-[var(--radius-md)] border border-[var(--line-hairline)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] disabled:opacity-40"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {roomsLoading &&
                    Array.from({ length: 3 }, (_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  {!roomsLoading && roomsByType.length === 0 && (
                    <div className="rounded-[var(--radius-lg)] border border-[var(--line-hairline)] p-4 text-center text-[var(--text-caption)] text-[var(--ink-tertiary)]">
                      No room numbers are available for this stay.
                    </div>
                  )}
                  {roomsByType.map((group) => (
                    <div
                      key={group.roomTypeId}
                      className="rounded-[var(--radius-lg)] border border-[var(--line-hairline)] p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{group.roomTypeCode}</div>
                          <div className="text-[12px] text-[var(--ink-tertiary)]">
                            {group.roomTypeName}
                          </div>
                        </div>
                        {availabilityByType.get(group.roomTypeId)?.totalPrice && (
                          <MoneyText
                            value={availabilityByType.get(group.roomTypeId)!.totalPrice!}
                            className="text-[13px]"
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.rooms.map((room) => {
                          const selected = Boolean(selectedRooms[room.roomId]);
                          return (
                            <button
                              key={room.roomId}
                              onClick={() => toggleRoom(room)}
                              data-testid="golden-walkin-room-choice"
                              aria-pressed={selected}
                              className={
                                'inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border px-2.5 text-[12.5px] transition-colors ' +
                                (selected
                                  ? 'border-[var(--interactive-default)] bg-[var(--interactive-selected)] text-[var(--ink-accent)]'
                                  : 'border-[var(--line-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)]')
                              }
                            >
                              {selected ? (
                                <Check className="size-3.5" />
                              ) : (
                                <DoorOpen className="size-3.5" />
                              )}
                              <span className="font-mono font-semibold">{room.number}</span>
                              <Badge tone={roomStatusTone(room)}>{room.hkStatus}</Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-[var(--space-5)]">
            <section className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                First name
                <Input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoFocus
                  data-testid="golden-walkin-first-name"
                />
              </label>
              <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                Last name
                <Input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  data-testid="golden-walkin-last-name"
                />
              </label>
              <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                Email
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  data-testid="golden-walkin-email"
                />
              </label>
              <label className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
                Phone
                <Input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  data-testid="golden-walkin-phone"
                />
              </label>
            </section>
            <label className="block space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[var(--cell-px)] py-2 text-[var(--font-size-ui)] text-[var(--ink-primary)] focus-visible:border-[var(--line-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-focus)]"
              />
            </label>
            <section className="rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] p-4">
              <div className="mb-2 text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                Selection summary
              </div>
              <div className="space-y-1.5 text-[13px] text-[var(--ink-secondary)]">
                <div>
                  {from} to {to} - {selectedRatePlan?.code ?? 'rate plan'} - {adults}+{children} pax
                </div>
                {mode === 'walk_in' ? (
                  <div>
                    Rooms:{' '}
                    {selectedRoomList
                      .map((room) => `${room.number} (${room.roomTypeCode})`)
                      .join(', ') || 'none'}
                  </div>
                ) : (
                  <div>
                    Room types:{' '}
                    {Object.entries(typeCounts)
                      .map(([roomTypeId, count]) => {
                        const row = availabilityByType.get(roomTypeId);
                        return `${count} ${row?.roomTypeCode ?? 'room'}`;
                      })
                      .join(', ') || 'none'}
                  </div>
                )}
                {selectedTotal && (
                  <div>
                    Estimated room total <MoneyText value={selectedTotal} className="text-[13px]" />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </Drawer>
  );
}
