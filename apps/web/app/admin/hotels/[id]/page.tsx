'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRightCircle, KeyRound, Plus, UserRound } from 'lucide-react';
import { Badge, Button, Drawer, Input, Skeleton } from '@vela/ui';
import type { HotelRoleKey, HotelUser } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useHotelSwitch } from '@/lib/platform';
import { useCanPlatform, useToast } from '@/lib/store';

const CARD =
  'rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]';
const LABEL = 'block space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]';
const SELECT_CLASS =
  'flex h-[var(--control-h)] w-full rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[var(--cell-px)] text-[var(--font-size-ui)] text-[var(--ink-primary)] focus-visible:border-[var(--line-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-focus)]';

/** The provisioning role menu — labels in front-of-house terms, keys are the system templates. */
const ROLE_OPTIONS: Array<[HotelRoleKey, string]> = [
  ['owner', 'Hotel Admin (Owner / GM)'],
  ['financial_controller', 'Accounts (Financial Controller)'],
  ['front_desk_agent', 'Front Desk'],
  ['front_office_manager', 'Front Office Manager'],
  ['night_auditor', 'Night Auditor'],
  ['reservations_agent', 'Reservations Agent'],
  ['revenue_manager', 'Revenue Manager'],
  ['housekeeping_supervisor', 'Housekeeping Supervisor'],
];

function CreateUserDrawer({
  tenantId,
  open,
  onClose,
}: {
  tenantId: string;
  open: boolean;
  onClose: () => void;
}) {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleKey, setRoleKey] = useState<HotelRoleKey>('front_desk_agent');

  const create = useMutation({
    mutationFn: () => sdk.createHotelUser(tenantId, { name, email, password, roleKey }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-hotel', tenantId] });
      qc.invalidateQueries({ queryKey: ['platform-hotels'] });
      showToast({ tone: 'positive', text: `${name} added` });
      onClose();
      setName('');
      setEmail('');
      setPassword('');
      setRoleKey('front_desk_agent');
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  const valid = name.trim() && email.includes('@') && password.length >= 8;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New hotel user"
      description="Creates a login scoped to this hotel with the selected role."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!valid}>
            <Plus className="size-3.5" /> Create user
          </Button>
        </div>
      }
    >
      <div className="space-y-[var(--gap-lg)]">
        <label className={LABEL}>
          <span>Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={LABEL}>
          <span>Email</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={LABEL}>
          <span>Password (min 8 chars)</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className={LABEL}>
          <span>Role</span>
          <select
            className={SELECT_CLASS}
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value as HotelRoleKey)}
          >
            {ROLE_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Drawer>
  );
}

function ResetPasswordDrawer({
  user,
  onClose,
}: {
  user: HotelUser | null;
  onClose: () => void;
}) {
  const sdk = useSdk();
  const showToast = useToast((s) => s.show);
  const [password, setPassword] = useState('');

  const reset = useMutation({
    mutationFn: () => sdk.resetUserPassword(user!.userId, { password }),
    onSuccess: () => {
      showToast({ tone: 'positive', text: `Password reset for ${user?.name}; their sessions were revoked` });
      onClose();
      setPassword('');
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <Drawer
      open={!!user}
      onClose={onClose}
      title={`Reset password — ${user?.name ?? ''}`}
      description="Sets a new password and signs the user out everywhere."
      width="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => reset.mutate()}
            loading={reset.isPending}
            disabled={password.length < 8}
          >
            <KeyRound className="size-3.5" /> Reset password
          </Button>
        </div>
      }
    >
      <label className={LABEL}>
        <span>New password (min 8 chars)</span>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
    </Drawer>
  );
}

export default function AdminHotelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const switchHotel = useHotelSwitch();
  const canEdit = useCanPlatform('platform.hotel.update');
  const canCreateUser = useCanPlatform('platform.user.create');
  const canResetPassword = useCanPlatform('platform.user.password.reset');
  const canSwitch = useCanPlatform('platform.hotel.switch');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [resetUser, setResetUser] = useState<HotelUser | null>(null);
  const [name, setName] = useState<string | null>(null);

  const { data: hotel, isLoading } = useQuery({
    queryKey: ['platform-hotel', id],
    queryFn: () => sdk.getHotel(id),
    enabled: !!id,
  });

  const rename = useMutation({
    mutationFn: () => sdk.updateHotel(id, { name: name ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-hotel', id] });
      qc.invalidateQueries({ queryKey: ['platform-hotels'] });
      showToast({ tone: 'positive', text: 'Hotel updated' });
      setName(null);
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  if (isLoading || !hotel) {
    return (
      <div className="mx-auto max-w-[960px] space-y-3">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-[var(--text-caption)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
      >
        <ArrowLeft className="size-3.5" /> All hotels
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-[var(--text-title)] font-semibold">{hotel.name}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            {hotel.slug}
            <Badge
              tone={hotel.status === 'active' ? 'positive' : hotel.status === 'suspended' ? 'critical' : 'caution'}
              dot
            >
              {hotel.status}
            </Badge>
          </p>
        </div>
        {canSwitch && (
          <Button variant="secondary" onClick={() => void switchHotel(hotel.id)}>
            <ArrowRightCircle className="size-3.5" /> Open hotel
          </Button>
        )}
      </div>

      {canEdit && (
        <div className={CARD}>
          <div className="flex items-end gap-3 p-4">
            <label className={`${LABEL} flex-1`}>
              <span>Hotel name</span>
              <Input value={name ?? hotel.name} onChange={(e) => setName(e.target.value)} />
            </label>
            <Button
              variant="secondary"
              onClick={() => rename.mutate()}
              loading={rename.isPending}
              disabled={name === null || !name.trim() || name === hotel.name}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line-hairline)] px-4 py-3">
          <h2 className="m-0 font-display text-[16px] font-semibold">Properties</h2>
          <Badge tone="neutral">{hotel.properties.length}</Badge>
        </div>
        {hotel.properties.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border-b border-[var(--line-hairline)] px-4 py-3 last:border-0"
          >
            <span className="font-medium text-[var(--ink-primary)]">{p.name}</span>
            <span className="text-[var(--text-micro)] text-[var(--ink-tertiary)]">
              {p.code} · {p.currency} · {p.timezone}
            </span>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line-hairline)] px-4 py-3">
          <h2 className="m-0 font-display text-[16px] font-semibold">Users</h2>
          <div className="flex items-center gap-2">
            <Badge tone="neutral">{hotel.users.length}</Badge>
            {canCreateUser && (
              <Button size="sm" onClick={() => setCreateUserOpen(true)}>
                <Plus className="size-3.5" /> Add user
              </Button>
            )}
          </div>
        </div>
        {hotel.users.length === 0 ? (
          <p className="p-6 text-center text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            No users yet.
          </p>
        ) : (
          hotel.users.map((u) => (
            <div
              key={u.userId}
              className="grid grid-cols-1 items-center gap-2 border-b border-[var(--line-hairline)] px-4 py-3 last:border-0 md:grid-cols-[1fr_auto_auto]"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-[var(--bg-sunken)] text-[var(--ink-secondary)]">
                  <UserRound className="size-4" />
                </span>
                <span>
                  <span className="block font-medium text-[var(--ink-primary)]">{u.name}</span>
                  <span className="block text-[var(--text-micro)] text-[var(--ink-tertiary)]">
                    {u.email}
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap gap-1">
                {u.membershipStatus === 'suspended' && (
                  <Badge tone="critical" dot>
                    suspended
                  </Badge>
                )}
                {u.roles.map((r) => (
                  <Badge key={`${r.key}-${r.propertyId ?? 'tenant'}`} tone="info">
                    {r.name}
                  </Badge>
                ))}
              </span>
              {canResetPassword ? (
                <Button variant="ghost" size="sm" onClick={() => setResetUser(u)}>
                  <KeyRound className="size-3.5" /> Reset password
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      <CreateUserDrawer tenantId={hotel.id} open={createUserOpen} onClose={() => setCreateUserOpen(false)} />
      <ResetPasswordDrawer user={resetUser} onClose={() => setResetUser(null)} />
    </div>
  );
}
