'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightCircle, Building2, Pause, Play, Plus } from 'lucide-react';
import { Badge, Button, Drawer, Input, Skeleton } from '@vela/ui';
import type { Hotel } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useHotelSwitch } from '@/lib/platform';
import { useCanPlatform, useToast } from '@/lib/store';

const CARD =
  'rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]';
const LABEL = 'block space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]';

function StatusBadge({ status }: { status: Hotel['status'] }) {
  return (
    <Badge tone={status === 'active' ? 'positive' : status === 'suspended' ? 'critical' : 'caution'} dot>
      {status}
    </Badge>
  );
}

function CreateHotelDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [withAdmin, setWithAdmin] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const create = useMutation({
    mutationFn: () =>
      sdk.createHotel({
        name,
        slug,
        property: {
          name: propertyName || name,
          code: propertyCode,
          currency,
          timezone,
          businessDayRollover: '03:00',
        },
        admin: withAdmin ? { name: adminName, email: adminEmail, password: adminPassword } : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-hotels'] });
      showToast({ tone: 'positive', text: `Hotel ${name} provisioned` });
      onClose();
      setName('');
      setSlug('');
      setPropertyName('');
      setPropertyCode('');
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  const valid =
    name.trim() &&
    /^[a-z0-9][a-z0-9-]*$/.test(slug) &&
    /^[A-Z0-9]{2,12}$/.test(propertyCode) &&
    (!withAdmin || (adminName.trim() && adminEmail.includes('@') && adminPassword.length >= 8));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New hotel"
      description="Provisions an isolated tenant with one property, system roles, and a financial baseline."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!valid}>
            <Plus className="size-3.5" /> Create hotel
          </Button>
        </div>
      }
    >
      <div className="space-y-[var(--gap-lg)]">
        <label className={LABEL}>
          <span>Hotel name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Harbor House" />
        </label>
        <label className={LABEL}>
          <span>Slug (unique, lowercase)</span>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="harbor-house"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL}>
            <span>Property name</span>
            <Input
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder={name || 'Main property'}
            />
          </label>
          <label className={LABEL}>
            <span>Property code</span>
            <Input
              value={propertyCode}
              onChange={(e) => setPropertyCode(e.target.value.toUpperCase())}
              placeholder="HH01"
            />
          </label>
          <label className={LABEL}>
            <span>Currency</span>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </label>
          <label className={LABEL}>
            <span>Timezone</span>
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </label>
        </div>

        <div className="border-t border-[var(--line-hairline)] pt-4">
          <label className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink-secondary)]">
            <input
              type="checkbox"
              checked={withAdmin}
              onChange={(e) => setWithAdmin(e.target.checked)}
            />
            Create the initial Hotel Admin
          </label>
          {withAdmin && (
            <div className="mt-3 space-y-3">
              <label className={LABEL}>
                <span>Admin name</span>
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
              </label>
              <label className={LABEL}>
                <span>Admin email</span>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </label>
              <label className={LABEL}>
                <span>Password (min 8 chars)</span>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default function AdminHotelsPage() {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const switchHotel = useHotelSwitch();
  const canCreate = useCanPlatform('platform.hotel.create');
  const canSuspend = useCanPlatform('platform.hotel.suspend');
  const canSwitch = useCanPlatform('platform.hotel.switch');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: hotels, isLoading } = useQuery({
    queryKey: ['platform-hotels'],
    queryFn: () => sdk.listHotels(),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      suspend ? sdk.suspendHotel(id) : sdk.reactivateHotel(id),
    onSuccess: (hotel) => {
      qc.invalidateQueries({ queryKey: ['platform-hotels'] });
      showToast({
        tone: hotel.status === 'active' ? 'positive' : 'info',
        text: `${hotel.name} ${hotel.status === 'active' ? 'reactivated' : 'suspended'}`,
      });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 font-display text-[var(--text-title)] font-semibold">Hotels</h1>
          <p className="mt-0.5 text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Each hotel is an isolated tenant with its own users, roles, and ledger.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" /> New hotel
          </Button>
        )}
      </div>

      <div className={CARD}>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !hotels?.length ? (
          <p className="p-6 text-center text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            No hotels yet — create the first one.
          </p>
        ) : (
          hotels.map((h) => (
            <div
              key={h.id}
              className="grid grid-cols-1 items-center gap-2 border-b border-[var(--line-hairline)] px-4 py-3 last:border-0 md:grid-cols-[1fr_auto_auto_auto]"
            >
              <Link href={`/admin/hotels/${h.id}`} className="group flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--bg-sunken)] text-[var(--ink-secondary)]">
                  <Building2 className="size-4" />
                </span>
                <span>
                  <span className="block font-medium text-[var(--ink-primary)] group-hover:underline">
                    {h.name}
                  </span>
                  <span className="block text-[var(--text-micro)] text-[var(--ink-tertiary)]">
                    {h.slug} · {h.propertyCount} {h.propertyCount === 1 ? 'property' : 'properties'} ·{' '}
                    {h.userCount} {h.userCount === 1 ? 'user' : 'users'}
                  </span>
                </span>
              </Link>
              <StatusBadge status={h.status} />
              {canSuspend ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatus.mutate({ id: h.id, suspend: h.status === 'active' })}
                  disabled={setStatus.isPending}
                >
                  {h.status === 'active' ? (
                    <>
                      <Pause className="size-3.5" /> Suspend
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" /> Reactivate
                    </>
                  )}
                </Button>
              ) : (
                <span />
              )}
              {canSwitch ? (
                <Button variant="secondary" size="sm" onClick={() => void switchHotel(h.id)}>
                  <ArrowRightCircle className="size-3.5" /> Open hotel
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      <CreateHotelDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
