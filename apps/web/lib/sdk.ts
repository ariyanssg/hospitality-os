'use client';
import { useMemo } from 'react';
import { createClient, type VelaClient } from '@vela/contracts/sdk';
import { useSession } from './store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Build a typed SDK client bound to the current token + active property. */
export function useSdk(): VelaClient {
  const token = useSession((s) => s.token);
  const propertyId = useSession((s) => s.activePropertyId);
  return useMemo(
    () => createClient({ baseUrl: BASE_URL, token: token ?? undefined, propertyId: propertyId ?? undefined }),
    [token, propertyId],
  );
}

/** Plain sign-in call (no SDK method — auth precedes the session). */
export async function signIn(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${BASE_URL}/v1/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.title ?? json?.detail ?? 'Sign-in failed');
  }
  return json as { token: string };
}

export { BASE_URL };
