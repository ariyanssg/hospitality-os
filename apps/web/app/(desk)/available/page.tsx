'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, DoorOpen } from 'lucide-react';
import { Badge, Input, RoomStatusChip, Skeleton, type RoomState } from '@vela/ui';
import type { AvailableRoom } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useSession } from '@/lib/store';

const TH =
  'sticky top-0 z-[2] h-10 whitespace-nowrap bg-[var(--bg-raised)] px-[var(--cell-px)] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-tertiary)] border-b border-[var(--line-hairline)]';
const TD = 'h-[var(--row-h)] whitespace-nowrap px-[var(--cell-px)] align-middle';

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function chipState(room: AvailableRoom): RoomState {
  if (room.occupancy === 'occupied') return 'occupied';
  if (room.hkStatus === 'inspected') return 'inspected';
  return room.hkStatus === 'clean' ? 'vacant-clean' : 'vacant-dirty';
}

export default function AvailableRoomsPage() {
  const sdk = useSdk();
  const propertyId = useSession((s) => s.activePropertyId);
  const [typeFilter, setTypeFilter] = useState('All');

  const { data: flash } = useQuery({
    queryKey: ['manager-flash', propertyId],
    queryFn: () => sdk.managerFlash(),
    enabled: !!propertyId,
  });
  const businessDate = flash?.businessDate;
  const [checkoutDate, setCheckoutDate] = useState('');
  const toDate = checkoutDate || (businessDate ? addDays(businessDate, 1) : '');

  const { data, isLoading } = useQuery({
    queryKey: ['available-rooms', propertyId, businessDate, toDate],
    queryFn: () => sdk.availableRooms({ from: businessDate!, to: toDate }),
    enabled: !!propertyId && !!businessDate && !!toDate && toDate > businessDate,
  });

  const roomTypes = useMemo(
    () => ['All', ...new Set((data ?? []).map((room) => room.roomTypeCode))],
    [data],
  );
  const rows = useMemo(
    () =>
      typeFilter === 'All'
        ? (data ?? [])
        : (data ?? []).filter((room) => room.roomTypeCode === typeFilter),
    [data, typeFilter],
  );

  return (
    <div className="mx-auto max-w-[980px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Available rooms
          </h1>
          <p className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Sellable room numbers for the selected stay window.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-medium text-[var(--ink-secondary)]">
          <CalendarDays className="size-4 text-[var(--ink-tertiary)]" />
          Checkout
          <Input
            type="date"
            value={toDate}
            min={businessDate ? addDays(businessDate, 1) : undefined}
            onChange={(event) => setCheckoutDate(event.target.value)}
            className="w-[160px]"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[3px]">
        {roomTypes.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={
              'rounded-[var(--radius-sm)] px-3 py-[5px] text-[12px] transition-colors ' +
              (typeFilter === type
                ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]')
            }
          >
            {type}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={TH}>Room</th>
              <th className={TH}>Type</th>
              <th className={TH}>Floor</th>
              <th className={TH}>Amenities</th>
              <th className={TH}>Readiness</th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 6 }, (_, index) => (
                <tr key={index} className="border-b border-[var(--line-hairline)] last:border-0">
                  <td className={TD} colSpan={5}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                </tr>
              ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className={TD + ' py-8 text-center text-[var(--ink-tertiary)]'} colSpan={5}>
                  No available rooms for this window.
                </td>
              </tr>
            )}
            {rows.map((room) => (
              <tr
                key={room.roomId}
                className="border-b border-[var(--line-hairline)] transition-colors last:border-0 hover:bg-[var(--bg-sunken)]"
              >
                <td className={TD}>
                  <span className="inline-flex items-center gap-2 font-mono font-semibold">
                    <DoorOpen className="size-[14px] text-[var(--ink-tertiary)]" />
                    {room.number}
                  </span>
                </td>
                <td className={TD}>
                  <span className="font-medium">{room.roomTypeCode}</span>{' '}
                  <span className="text-[12px] text-[var(--ink-tertiary)]">
                    {room.roomTypeName}
                  </span>
                </td>
                <td className={TD + ' text-[12.5px] text-[var(--ink-secondary)]'}>
                  {room.floor ?? '-'}
                </td>
                <td className={TD}>
                  <span className="flex flex-wrap gap-1">
                    {room.amenities.length === 0 ? (
                      <span className="text-[12px] text-[var(--ink-tertiary)]">-</span>
                    ) : (
                      room.amenities.map((amenity) => (
                        <Badge key={amenity.id} tone="accent">
                          {amenity.code}
                        </Badge>
                      ))
                    )}
                  </span>
                </td>
                <td className={TD}>
                  <RoomStatusChip state={chipState(room)} />
                  {room.hkStatus === 'dirty' && (
                    <Badge tone="caution" className="ml-2">
                      clean first
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
