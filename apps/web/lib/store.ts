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

// ── UI preferences ──
export type Density = 'comfortable' | 'compact' | 'touch';

interface UiPrefsState {
  density: Density;
  cycleDensity: () => void;
}

/** Density is a first-class dimension (doc 17 §1.5) — cycled from the top bar, persisted. */
export const useUiPrefs = create<UiPrefsState>()(
  persist(
    (set) => ({
      density: 'comfortable',
      cycleDensity: () =>
        set((s) => ({
          density: s.density === 'comfortable' ? 'compact' : s.density === 'compact' ? 'touch' : 'comfortable',
        })),
    }),
    { name: 'vela-ui-prefs' },
  ),
);

// ── Cross-page desk intents ──
interface DeskIntentState {
  /** Reservation queued for check-in by ⌘K — the arrivals board opens its drawer and clears it. */
  checkinId: string | null;
  requestCheckin: (id: string) => void;
  clearCheckin: () => void;
}

export const useDeskIntent = create<DeskIntentState>()((set) => ({
  checkinId: null,
  requestCheckin: (id) => set({ checkinId: id }),
  clearCheckin: () => set({ checkinId: null }),
}));

// ── Toasts ──
export interface ToastState {
  id: number;
  text: string;
  tone?: 'positive' | 'info' | 'critical';
  /** Optional undo handler — renders the "Undo" affordance (doc 17: motion is the receipt). */
  onUndo?: () => void;
}

interface ToastStore {
  toast: ToastState | null;
  show: (t: Omit<ToastState, 'id'>) => void;
  dismiss: () => void;
}

let toastSeq = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastStore>()((set) => ({
  toast: null,
  show: (t) => {
    clearTimeout(toastTimer);
    set({ toast: { ...t, id: ++toastSeq } });
    toastTimer = setTimeout(() => set({ toast: null }), 4200);
  },
  dismiss: () => {
    clearTimeout(toastTimer);
    set({ toast: null });
  },
}));
