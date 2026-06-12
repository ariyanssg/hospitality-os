'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@vela/contracts/sdk';
import { BASE_URL, useSdk } from './sdk';
import { useSession } from './store';

/**
 * The Hotel Selector action: point the session at a hotel (or back to the platform with null),
 * re-bootstrap /me on the same token, and clear the query cache — cached data from the previous
 * hotel context is a correctness bug, not a staleness nit.
 */
export function useHotelSwitch(): (tenantId: string | null) => Promise<void> {
  const sdk = useSdk();
  const qc = useQueryClient();
  const router = useRouter();
  const token = useSession((s) => s.token);
  const setSession = useSession((s) => s.setSession);

  return useCallback(
    async (tenantId: string | null) => {
      if (!token) return;
      await sdk.switchContext(tenantId);
      const me = await createClient({ baseUrl: BASE_URL, token }).me();
      setSession(token, me); // resets activePropertyId to the hotel's first property
      qc.clear();
      router.push(tenantId ? '/today' : '/admin');
    },
    [sdk, qc, router, token, setSession],
  );
}
