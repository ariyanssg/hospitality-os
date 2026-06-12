'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge, Button, Drawer, Input, Skeleton } from '@vela/ui';
import type { Superadmin } from '@vela/contracts';
import { useSdk } from '@/lib/sdk';
import { useCanPlatform, useSession, useToast } from '@/lib/store';

const CARD =
  'rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]';
const LABEL = 'block space-y-1.5 text-[12px] font-medium text-[var(--ink-secondary)]';
const SELECT_CLASS =
  'flex h-[var(--control-h)] w-full rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-[var(--bg-surface)] px-[var(--cell-px)] text-[var(--font-size-ui)] text-[var(--ink-primary)] focus-visible:border-[var(--line-focus)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--line-focus)]';

const PLATFORM_ROLE_OPTIONS: Array<[string, string]> = [
  ['platform_superadmin', 'Platform Superadmin — full administration'],
  ['platform_support', 'Platform Support — view + switch only'],
];

function CreateSuperadminDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleKey, setRoleKey] = useState('platform_superadmin');

  const create = useMutation({
    mutationFn: () => sdk.createSuperadmin({ name, email, password, roleKeys: [roleKey] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-superadmins'] });
      showToast({ tone: 'positive', text: `${name} added as platform admin` });
      onClose();
      setName('');
      setEmail('');
      setPassword('');
      setRoleKey('platform_superadmin');
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  const valid = name.trim() && email.includes('@') && password.length >= 8;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New platform admin"
      description="Platform admins manage hotels and users across the whole installation."
      width="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => create.mutate()} loading={create.isPending} disabled={!valid}>
            <Plus className="size-3.5" /> Create
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
          <span>Platform role</span>
          <select className={SELECT_CLASS} value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
            {PLATFORM_ROLE_OPTIONS.map(([key, label]) => (
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

export default function AdminSuperadminsPage() {
  const sdk = useSdk();
  const qc = useQueryClient();
  const showToast = useToast((s) => s.show);
  const me = useSession((s) => s.me);
  const canManage = useCanPlatform('platform.superadmin.manage');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: admins, isLoading } = useQuery({
    queryKey: ['platform-superadmins'],
    queryFn: () => sdk.listSuperadmins(),
  });

  const remove = useMutation({
    mutationFn: (admin: Superadmin) => sdk.removeSuperadmin(admin.userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-superadmins'] });
      showToast({ tone: 'info', text: 'Platform access revoked' });
    },
    onError: (error: Error) => showToast({ tone: 'critical', text: error.message }),
  });

  return (
    <div className="mx-auto max-w-[760px] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 font-display text-[var(--text-title)] font-semibold">Superadmins</h1>
          <p className="mt-0.5 text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Platform-level administrators. Every action they take is audited.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" /> New admin
          </Button>
        )}
      </div>

      <div className={CARD}>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !admins?.length ? (
          <p className="p-6 text-center text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            No platform admins found.
          </p>
        ) : (
          admins.map((a) => (
            <div
              key={a.userId}
              className="grid grid-cols-1 items-center gap-2 border-b border-[var(--line-hairline)] px-4 py-3 last:border-0 md:grid-cols-[1fr_auto_auto]"
            >
              <span className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-[var(--interactive-selected)] text-[var(--ink-accent)]">
                  <ShieldCheck className="size-4" />
                </span>
                <span>
                  <span className="block font-medium text-[var(--ink-primary)]">
                    {a.name}
                    {a.userId === me?.userId && (
                      <span className="ml-2 text-[var(--text-micro)] text-[var(--ink-tertiary)]">(you)</span>
                    )}
                  </span>
                  <span className="block text-[var(--text-micro)] text-[var(--ink-tertiary)]">{a.email}</span>
                </span>
              </span>
              <span className="flex flex-wrap gap-1">
                {a.roles.map((r) => (
                  <Badge key={r.key} tone="accent">
                    {r.name}
                  </Badge>
                ))}
              </span>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Revoke all platform access for ${a.name}?`)) remove.mutate(a);
                  }}
                  disabled={remove.isPending}
                >
                  <Trash2 className="size-3.5" /> Revoke
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      <CreateSuperadminDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
