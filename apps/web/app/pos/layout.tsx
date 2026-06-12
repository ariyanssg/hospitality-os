'use client';
import { useEffect } from 'react';
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

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

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
