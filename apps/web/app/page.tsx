'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/store';

/** Entry redirect: into the Desk if signed in, otherwise to login. */
export default function Home() {
  const router = useRouter();
  const token = useSession((s) => s.token);
  useEffect(() => {
    router.replace(token ? '/arrivals' : '/login');
  }, [token, router]);
  return null;
}
