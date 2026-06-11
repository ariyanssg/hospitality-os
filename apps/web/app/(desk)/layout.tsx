'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/store';
import { TopBar } from '@/components/desk/top-bar';
import { Rail } from '@/components/desk/rail';
import { LivePulseBar } from '@/components/desk/live-pulse-bar';

/**
 * The Desk shell (doc 18 §2 anatomy): top bar → [ rail | (pulse bar + workspace) ]. Client-side
 * auth gate: no token ⇒ login. The workspace is the page; the action tray mounts per-screen.
 */
export default function DeskLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useSession((s) => s.token);

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Rail
          onSignOut={() => {
            useSession.getState().clear();
            router.replace('/login');
          }}
        />
        <main className="flex flex-1 flex-col overflow-hidden">
          <LivePulseBar />
          <div className="flex-1 overflow-auto p-[var(--space-6)]">{children}</div>
        </main>
      </div>
    </div>
  );
}
