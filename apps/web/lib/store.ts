'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Me } from '@vela/contracts';

interface SessionState {
  token: string | null;
  me: Me | null;
  activePropertyId: string | null;
  setSession: (token: string, me: Me) => void;
  setActiveProperty: (id: string) => void;
  clear: () => void;
}

/**
 * Client session: the bearer token + the /me bootstrap (identity, properties, permission set) +
 * the active property scope sent as X-Property-Id. Persisted so a refresh keeps you signed in.
 */
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      me: null,
      activePropertyId: null,
      setSession: (token, me) =>
        set({ token, me, activePropertyId: me.properties[0]?.id ?? null }),
      setActiveProperty: (id) => set({ activePropertyId: id }),
      clear: () => set({ token: null, me: null, activePropertyId: null }),
    }),
    { name: 'vela-session' },
  ),
);

/** Permission check against the decision set (doc 06): drives PermissionGate + UI affordances. */
export function useCan(permission: string): boolean {
  return useSession((s) => s.me?.permissions.includes(permission) ?? false);
}
