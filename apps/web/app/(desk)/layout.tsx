'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DensityProvider } from '@vela/ui';
import { useSession, useUiPrefs } from '@/lib/store';
import { TopBar } from '@/components/desk/top-bar';
import { NavTabs } from '@/components/desk/nav-tabs';
import { LivePulseBar } from '@/components/desk/live-pulse-bar';
import { ToastViewport } from '@/components/desk/toast';

/**
 * The Desk shell (doc 18 §2, front-desk concept): top bar → rail → (pulse bar + workspace).
 * Client-side auth gate: no token ⇒ login. Density re-maps the semantic tokens for the whole shell.
 */
export default function DeskLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useSession((s) => s.token);
  const density = useUiPrefs((s) => s.density);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <DensityProvider density={density} asChild>
      <div className="flex h-screen flex-col overflow-hidden" data-density={density}>
        <TopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <NavTabs />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <LivePulseBar />
            <div className="flex-1 overflow-auto p-[var(--space-6)]">{children}</div>
          </main>
        </div>
        <ToastViewport />
      </div>
    </DensityProvider>
  );
}
