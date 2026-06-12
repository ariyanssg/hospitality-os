'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BedDouble,
  CreditCard,
  DoorOpen,
  Hotel,
  Layers3,
  Pencil,
  Plus,
  ReceiptText,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Badge, Button, Input, Skeleton, cn } from '@vela/ui';
import type { SettingsCatalog } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useCan, useSession, useToast } from '@/lib/store';

type Section = 'rooms' | 'roomTypes' | 'floors' | 'amenities' | 'charges' | 'payments';

const SECTIONS: Array<[Section, string, LucideIcon]> = [
  ['rooms', 'Rooms', DoorOpen],
  ['roomTypes', 'Room types', BedDouble],
  ['floors', 'Floors', Layers3],
  ['amenities', 'Amenities', Sparkles],
  ['charges', 'Charges', ReceiptText],
  ['payments', 'Payments', CreditCard],
];

const SELECT_CLASS =
  'flex h-[var(--control-h)] w-full rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[var(--cell-px)] text-[var(--font-size-ui)] text-[var(--ink-primary)] focus-visible:border-[var(--line-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-focus)]';
const CARD =
  'rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]';
const LABEL = 'space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]';
const ICON_BUTTON =
  'grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)] hover:text-[var(--ink-primary)] disabled:cursor-not-allowed disabled:opacity-40';

function idempotencyKey(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

function emptyCatalog(): SettingsCatalog {
  return {
    floors: [],
    amenities: [],
    roomTypes: [],
    rooms: [],
    chargeTypes: [],
    paymentMethods: [],
  };
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--line-hairline)] px-4 py-3">
      <h2 className="m-0 font-display text-[16px] font-semibold">{title}</h2>
      <Badge tone="neutral">{count}</Badge>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-[var(--line-hairline)] px-4 py-3 last:border-0 md:grid-cols-[180px_1fr_auto]">
      {children}
    </div>
  );
}

function RowActions({
  disabled,
  onEdit,
  onRemove,
}: {
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <span className="flex justify-start gap-1 md:justify-end">
      <button
        type="button"
        className={ICON_BUTTON}
        onClick={onEdit}
        disabled={disabled}
        title="Edit"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        type="button"
        className={ICON_BUTTON}
        onClick={onRemove}
        disabled={disabled}
        title="Remove"
      >
        <Trash2 className="size-3.5" />
      </button>
    </span>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className={CARD}>
      <SectionHeader title="Settings" count={0} />
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function FloorsPanel({
  catalog,
  disabled,
  refresh,
}: {
  catalog: SettingsCatalog;
  disabled: boolean;
  refresh: () => void;
}) {
  const sdk = useSdk();
  const showToast = useToast((s) => s.show);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const create = useMutation({
    mutationFn: () =>
      sdk.createFloor(
        { code, name, sortOrder: Number(sortOrder) || 0 },
        { idempotencyKey: idempotencyKey('floor') },
      ),
    onSuccess: () => {
      setCode('');
      setName('');
      setSortOrder('0');
      refresh();
      showToast({ tone: 'positive', text: 'Floor saved' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const update = useMutation({
    mutationFn: (floor: SettingsCatalog['floors'][number]) =>
      sdk.updateFloor(floor.id, {
        code: window.prompt('Floor code', floor.code) ?? floor.code,
        name: window.prompt('Floor name', floor.name) ?? floor.name,
        sortOrder: Number(window.prompt('Sort order', String(floor.sortOrder)) ?? floor.sortOrder),
      }),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Floor updated' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const remove = useMutation({
    mutationFn: (floor: SettingsCatalog['floors'][number]) => sdk.removeFloor(floor.id),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Floor removed' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <div className={CARD}>
      <SectionHeader title="Floors" count={catalog.floors.length} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="grid gap-3 border-b border-[var(--line-hairline)] p-4 md:grid-cols-[120px_1fr_100px_auto]"
      >
        <label className={LABEL}>
          Code
          <Input value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Order
          <Input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          loading={create.isPending}
          disabled={disabled || !code.trim() || !name.trim()}
          className="self-end"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </form>
      {catalog.floors.map((floor) => (
        <Row key={floor.id}>
          <span className="font-mono font-semibold">{floor.code}</span>
          <span>{floor.name}</span>
          <span className="flex items-center justify-between gap-2 md:justify-end">
            <Badge tone={floor.isActive ? 'positive' : 'neutral'}>{floor.sortOrder}</Badge>
            <RowActions
              disabled={disabled}
              onEdit={() => update.mutate(floor)}
              onRemove={() => {
                if (window.confirm(`Remove ${floor.name}?`)) remove.mutate(floor);
              }}
            />
          </span>
        </Row>
      ))}
    </div>
  );
}

function RoomTypesPanel({
  catalog,
  disabled,
  refresh,
}: {
  catalog: SettingsCatalog;
  disabled: boolean;
  refresh: () => void;
}) {
  const sdk = useSdk();
  const showToast = useToast((s) => s.show);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [maxOccupancy, setMaxOccupancy] = useState('2');
  const [defaultOccupancy, setDefaultOccupancy] = useState('2');

  const create = useMutation({
    mutationFn: () =>
      sdk.createRoomType(
        {
          code,
          name,
          maxOccupancy: Number(maxOccupancy) || 2,
          defaultOccupancy: Number(defaultOccupancy) || 2,
          sortOrder: 0,
        },
        { idempotencyKey: idempotencyKey('room-type') },
      ),
    onSuccess: () => {
      setCode('');
      setName('');
      setMaxOccupancy('2');
      setDefaultOccupancy('2');
      refresh();
      showToast({ tone: 'positive', text: 'Room type saved' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const update = useMutation({
    mutationFn: (roomType: SettingsCatalog['roomTypes'][number]) =>
      sdk.updateRoomType(roomType.id, {
        code: window.prompt('Room type code', roomType.code) ?? roomType.code,
        name: window.prompt('Room type name', roomType.name) ?? roomType.name,
        defaultOccupancy: Number(
          window.prompt('Default occupancy', String(roomType.defaultOccupancy)) ??
            roomType.defaultOccupancy,
        ),
        maxOccupancy: Number(
          window.prompt('Max occupancy', String(roomType.maxOccupancy)) ?? roomType.maxOccupancy,
        ),
        sortOrder: roomType.sortOrder,
      }),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Room type updated' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const remove = useMutation({
    mutationFn: (roomType: SettingsCatalog['roomTypes'][number]) => sdk.removeRoomType(roomType.id),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Room type removed' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <div className={CARD}>
      <SectionHeader title="Room Types" count={catalog.roomTypes.length} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="grid gap-3 border-b border-[var(--line-hairline)] p-4 md:grid-cols-[120px_1fr_120px_120px_auto]"
      >
        <label className={LABEL}>
          Code
          <Input value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Default
          <Input
            type="number"
            min={1}
            value={defaultOccupancy}
            onChange={(event) => setDefaultOccupancy(event.target.value)}
          />
        </label>
        <label className={LABEL}>
          Max
          <Input
            type="number"
            min={1}
            value={maxOccupancy}
            onChange={(event) => setMaxOccupancy(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          loading={create.isPending}
          disabled={disabled || !code.trim() || !name.trim()}
          className="self-end"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </form>
      {catalog.roomTypes.map((roomType) => (
        <Row key={roomType.id}>
          <span className="font-mono font-semibold">{roomType.code}</span>
          <span>{roomType.name}</span>
          <span className="flex flex-wrap justify-start gap-2 md:justify-end">
            <Badge tone="neutral">
              {roomType.defaultOccupancy}/{roomType.maxOccupancy}
            </Badge>
            <Badge tone="accent">{roomType.roomCount} rooms</Badge>
            <RowActions
              disabled={disabled}
              onEdit={() => update.mutate(roomType)}
              onRemove={() => {
                if (window.confirm(`Remove ${roomType.name}?`)) remove.mutate(roomType);
              }}
            />
          </span>
        </Row>
      ))}
    </div>
  );
}

function AmenitiesPanel({
  catalog,
  disabled,
  refresh,
}: {
  catalog: SettingsCatalog;
  disabled: boolean;
  refresh: () => void;
}) {
  const sdk = useSdk();
  const showToast = useToast((s) => s.show);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');

  const create = useMutation({
    mutationFn: () =>
      sdk.createRoomAmenity(
        { code, name, category: category.trim() || undefined },
        { idempotencyKey: idempotencyKey('amenity') },
      ),
    onSuccess: () => {
      setCode('');
      setName('');
      setCategory('');
      refresh();
      showToast({ tone: 'positive', text: 'Amenity saved' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const update = useMutation({
    mutationFn: (amenity: SettingsCatalog['amenities'][number]) =>
      sdk.updateRoomAmenity(amenity.id, {
        code: window.prompt('Amenity code', amenity.code) ?? amenity.code,
        name: window.prompt('Amenity name', amenity.name) ?? amenity.name,
        category:
          window.prompt('Category', amenity.category ?? '') ?? amenity.category ?? undefined,
      }),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Amenity updated' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const remove = useMutation({
    mutationFn: (amenity: SettingsCatalog['amenities'][number]) =>
      sdk.removeRoomAmenity(amenity.id),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Amenity removed' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <div className={CARD}>
      <SectionHeader title="Amenities" count={catalog.amenities.length} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="grid gap-3 border-b border-[var(--line-hairline)] p-4 md:grid-cols-[120px_1fr_160px_auto]"
      >
        <label className={LABEL}>
          Code
          <Input value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Category
          <Input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <Button
          type="submit"
          loading={create.isPending}
          disabled={disabled || !code.trim() || !name.trim()}
          className="self-end"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </form>
      {catalog.amenities.map((amenity) => (
        <Row key={amenity.id}>
          <span className="font-mono font-semibold">{amenity.code}</span>
          <span>{amenity.name}</span>
          <span className="flex items-center justify-between gap-2 md:justify-end">
            <Badge tone={amenity.isActive ? 'positive' : 'neutral'}>
              {amenity.category ?? 'general'}
            </Badge>
            <RowActions
              disabled={disabled}
              onEdit={() => update.mutate(amenity)}
              onRemove={() => {
                if (window.confirm(`Remove ${amenity.name}?`)) remove.mutate(amenity);
              }}
            />
          </span>
        </Row>
      ))}
    </div>
  );
}

function RoomsPanel({
  catalog,
  disabled,
  refresh,
}: {
  catalog: SettingsCatalog;
  disabled: boolean;
  refresh: () => void;
}) {
  const sdk = useSdk();
  const showToast = useToast((s) => s.show);
  const [number, setNumber] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [floorId, setFloorId] = useState('');
  const [amenityIds, setAmenityIds] = useState<Set<string>>(new Set());
  const activeFloors = catalog.floors.filter((floor) => floor.isActive);
  const activeAmenities = catalog.amenities.filter((amenity) => amenity.isActive);

  useEffect(() => {
    if (!roomTypeId && catalog.roomTypes[0]) setRoomTypeId(catalog.roomTypes[0].id);
    if (!floorId && activeFloors[0]) setFloorId(activeFloors[0].id);
  }, [activeFloors, catalog.roomTypes, floorId, roomTypeId]);

  const create = useMutation({
    mutationFn: () =>
      sdk.createRoom(
        {
          number,
          roomTypeId,
          floorId: floorId || undefined,
          amenityIds: [...amenityIds],
        },
        { idempotencyKey: idempotencyKey('room') },
      ),
    onSuccess: () => {
      setNumber('');
      setAmenityIds(new Set());
      refresh();
      showToast({ tone: 'positive', text: 'Room saved' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const update = useMutation({
    mutationFn: (room: SettingsCatalog['rooms'][number]) =>
      sdk.updateRoom(room.id, {
        number: window.prompt('Room number', room.number) ?? room.number,
        roomTypeId: room.roomTypeId,
        floorId: room.floorId ?? undefined,
        amenityIds: room.amenities.map((amenity) => amenity.id),
      }),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Room updated' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const remove = useMutation({
    mutationFn: (room: SettingsCatalog['rooms'][number]) => sdk.removeRoom(room.id),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Room removed' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  const toggleAmenity = (id: string) => {
    setAmenityIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={CARD}>
      <SectionHeader title="Rooms" count={catalog.rooms.length} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="grid gap-3 border-b border-[var(--line-hairline)] p-4 lg:grid-cols-[120px_180px_160px_1fr_auto]"
      >
        <label className={LABEL}>
          Number
          <Input value={number} onChange={(event) => setNumber(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Type
          <select
            value={roomTypeId}
            onChange={(event) => setRoomTypeId(event.target.value)}
            className={SELECT_CLASS}
          >
            {catalog.roomTypes.map((roomType) => (
              <option key={roomType.id} value={roomType.id}>
                {roomType.code} - {roomType.name}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Floor
          <select
            value={floorId}
            onChange={(event) => setFloorId(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">None</option>
            {activeFloors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.code} - {floor.name}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]">
          Amenities
          <div className="flex min-h-[var(--control-h)] flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] p-1">
            {activeAmenities.map((amenity) => (
              <button
                key={amenity.id}
                type="button"
                onClick={() => toggleAmenity(amenity.id)}
                aria-pressed={amenityIds.has(amenity.id)}
                className={cn(
                  'rounded-[var(--radius-sm)] px-2 py-1 text-[11.5px] transition-colors',
                  amenityIds.has(amenity.id)
                    ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                    : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-sunken)]',
                )}
              >
                {amenity.code}
              </button>
            ))}
          </div>
        </div>
        <Button
          type="submit"
          loading={create.isPending}
          disabled={disabled || !number.trim() || !roomTypeId}
          className="self-end"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </form>
      {catalog.rooms.map((room) => (
        <Row key={room.id}>
          <span className="inline-flex items-center gap-2 font-mono font-semibold">
            <Hotel className="size-3.5 text-[var(--ink-tertiary)]" /> {room.number}
          </span>
          <span>
            {room.roomTypeCode}
            {room.floorCode ? (
              <span className="text-[var(--ink-tertiary)]"> · floor {room.floorCode}</span>
            ) : null}
          </span>
          <span className="flex flex-wrap justify-start gap-1 md:justify-end">
            {room.amenities.length === 0 ? (
              <Badge tone="neutral">No tags</Badge>
            ) : (
              room.amenities.map((amenity) => (
                <Badge key={amenity.id} tone="accent">
                  {amenity.code}
                </Badge>
              ))
            )}
            <RowActions
              disabled={disabled}
              onEdit={() => update.mutate(room)}
              onRemove={() => {
                if (window.confirm(`Remove room ${room.number}?`)) remove.mutate(room);
              }}
            />
          </span>
        </Row>
      ))}
    </div>
  );
}

function ChargesPanel({
  catalog,
  disabled,
  refresh,
}: {
  catalog: SettingsCatalog;
  disabled: boolean;
  refresh: () => void;
}) {
  const sdk = useSdk();
  const showToast = useToast((s) => s.show);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('misc');
  const [glAccountCode, setGlAccountCode] = useState('');

  const create = useMutation({
    mutationFn: () =>
      sdk.createChargeType(
        { code, name, category, glAccountCode: glAccountCode.trim() || undefined },
        { idempotencyKey: idempotencyKey('charge-type') },
      ),
    onSuccess: () => {
      setCode('');
      setName('');
      setCategory('misc');
      setGlAccountCode('');
      refresh();
      showToast({ tone: 'positive', text: 'Charge type saved' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const update = useMutation({
    mutationFn: (charge: SettingsCatalog['chargeTypes'][number]) =>
      sdk.updateChargeType(charge.id, {
        code: window.prompt('Charge code', charge.code) ?? charge.code,
        name: window.prompt('Charge name', charge.name) ?? charge.name,
        category: window.prompt('Category', charge.category) ?? charge.category,
        glAccountCode:
          window.prompt('GL account', charge.glAccountCode ?? '') ??
          charge.glAccountCode ??
          undefined,
      }),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Charge type updated' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const remove = useMutation({
    mutationFn: (charge: SettingsCatalog['chargeTypes'][number]) => sdk.removeChargeType(charge.id),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Charge type removed' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <div className={CARD}>
      <SectionHeader title="Charges" count={catalog.chargeTypes.length} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="grid gap-3 border-b border-[var(--line-hairline)] p-4 md:grid-cols-[120px_1fr_140px_140px_auto]"
      >
        <label className={LABEL}>
          Code
          <Input value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Category
          <Input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label className={LABEL}>
          GL
          <Input value={glAccountCode} onChange={(event) => setGlAccountCode(event.target.value)} />
        </label>
        <Button
          type="submit"
          loading={create.isPending}
          disabled={disabled || !code.trim() || !name.trim()}
          className="self-end"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </form>
      {catalog.chargeTypes.map((charge) => (
        <Row key={charge.id}>
          <span className="font-mono font-semibold">{charge.code}</span>
          <span>{charge.name}</span>
          <span className="flex flex-wrap justify-start gap-2 md:justify-end">
            <Badge tone={charge.isActive ? 'positive' : 'neutral'}>{charge.category}</Badge>
            {charge.glAccountCode ? <Badge tone="neutral">{charge.glAccountCode}</Badge> : null}
            <RowActions
              disabled={disabled}
              onEdit={() => update.mutate(charge)}
              onRemove={() => {
                if (window.confirm(`Remove ${charge.name}?`)) remove.mutate(charge);
              }}
            />
          </span>
        </Row>
      ))}
    </div>
  );
}

function PaymentsPanel({
  catalog,
  disabled,
  refresh,
}: {
  catalog: SettingsCatalog;
  disabled: boolean;
  refresh: () => void;
}) {
  const sdk = useSdk();
  const showToast = useToast((s) => s.show);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const create = useMutation({
    mutationFn: () =>
      sdk.createPaymentMethod(
        { code, name, category: 'payment', sortOrder: Number(sortOrder) || 0 },
        { idempotencyKey: idempotencyKey('payment-method') },
      ),
    onSuccess: () => {
      setCode('');
      setName('');
      setSortOrder('0');
      refresh();
      showToast({ tone: 'positive', text: 'Payment method saved' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const update = useMutation({
    mutationFn: (method: SettingsCatalog['paymentMethods'][number]) =>
      sdk.updatePaymentMethod(method.id, {
        code: window.prompt('Payment method code', method.code) ?? method.code,
        name: window.prompt('Payment method name', method.name) ?? method.name,
        category: method.category,
        sortOrder: Number(
          window.prompt('Sort order', String(method.sortOrder)) ?? method.sortOrder,
        ),
      }),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Payment method updated' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });
  const remove = useMutation({
    mutationFn: (method: SettingsCatalog['paymentMethods'][number]) =>
      sdk.removePaymentMethod(method.id),
    onSuccess: () => {
      refresh();
      showToast({ tone: 'positive', text: 'Payment method removed' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <div className={CARD}>
      <SectionHeader title="Payments" count={catalog.paymentMethods.length} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
        className="grid gap-3 border-b border-[var(--line-hairline)] p-4 md:grid-cols-[140px_1fr_100px_auto]"
      >
        <label className={LABEL}>
          Code
          <Input value={code} onChange={(event) => setCode(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Name
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className={LABEL}>
          Order
          <Input
            type="number"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          loading={create.isPending}
          disabled={disabled || !code.trim() || !name.trim()}
          className="self-end"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </form>
      {catalog.paymentMethods.map((method) => (
        <Row key={method.id}>
          <span className="font-mono font-semibold">{method.code}</span>
          <span>{method.name}</span>
          <span className="flex items-center justify-between gap-2 md:justify-end">
            <Badge tone={method.isActive ? 'positive' : 'neutral'}>{method.sortOrder}</Badge>
            <RowActions
              disabled={disabled}
              onEdit={() => update.mutate(method)}
              onRemove={() => {
                if (window.confirm(`Remove ${method.name}?`)) remove.mutate(method);
              }}
            />
          </span>
        </Row>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const sdk = useSdk();
  const qc = useQueryClient();
  const propertyId = useSession((s) => s.activePropertyId);
  const canManage = useCan('property.settings.manage');
  const [section, setSection] = useState<Section>('rooms');

  const { data, isLoading } = useQuery({
    queryKey: ['settings-catalog', propertyId],
    queryFn: () => sdk.settingsCatalog(),
    enabled: !!propertyId,
  });

  const catalog = data ?? emptyCatalog();
  const total = useMemo(
    () =>
      catalog.rooms.length +
      catalog.roomTypes.length +
      catalog.floors.length +
      catalog.amenities.length +
      catalog.chargeTypes.length +
      catalog.paymentMethods.length,
    [catalog],
  );

  const refresh = () => {
    for (const key of [
      'settings-catalog',
      'availability',
      'available-rooms',
      'room-rack',
      'hk-board',
      'arrivals',
      'in-house',
      'folio',
      'manager-flash',
    ]) {
      qc.invalidateQueries({ queryKey: [key] });
    }
  };

  return (
    <div className="mx-auto max-w-[1120px] space-y-[var(--space-4)]">
      <div className="flex flex-wrap items-end justify-between gap-[var(--space-3)]">
        <div>
          <h1 className="font-display text-[var(--text-title)] font-semibold tracking-tight">
            Settings
          </h1>
        </div>
        <Badge tone={canManage ? 'positive' : 'neutral'}>
          {canManage ? 'Manage' : 'Read only'} · {total}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[3px]">
        {SECTIONS.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-[6px] text-[12px] transition-colors',
              section === key
                ? 'bg-[var(--interactive-selected)] font-medium text-[var(--ink-accent)]'
                : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SettingsPageSkeleton />
      ) : section === 'rooms' ? (
        <RoomsPanel catalog={catalog} disabled={!canManage} refresh={refresh} />
      ) : section === 'roomTypes' ? (
        <RoomTypesPanel catalog={catalog} disabled={!canManage} refresh={refresh} />
      ) : section === 'floors' ? (
        <FloorsPanel catalog={catalog} disabled={!canManage} refresh={refresh} />
      ) : section === 'amenities' ? (
        <AmenitiesPanel catalog={catalog} disabled={!canManage} refresh={refresh} />
      ) : section === 'charges' ? (
        <ChargesPanel catalog={catalog} disabled={!canManage} refresh={refresh} />
      ) : (
        <PaymentsPanel catalog={catalog} disabled={!canManage} refresh={refresh} />
      )}
    </div>
  );
}
