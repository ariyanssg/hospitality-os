'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DensityProvider } from '@vela/ui';
import { useSession } from '@/lib/store';

/**
 * The POS terminal shell (design: "Vela POS Terminal") — a full-screen touch surface, separate from
 * the Desk chrome. Touch density throughout: 44px+ targets, same token contract.
 */
export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useSession((s) => s.token);
  // The session store rehydrates from localStorage asynchronously — gate only once it has.
  // Optional-chained: the persist API is absent during the server prerender of this page.
  const [hydrated, setHydrated] = useState(() => useSession.persist?.hasHydrated() ?? false);

  useEffect(() => {
    const unsub = useSession.persist.onFinishHydration(() => setHydrated(true));
    if (useSession.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  if (!token) return null;

  return (
    <DensityProvider density="touch" asChild>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-canvas)]" data-density="touch">
        {children}
        <style>{`@keyframes pos-blink { 0%, 100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
      </div>
    </DensityProvider>
  );
}
