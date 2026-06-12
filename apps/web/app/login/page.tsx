'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@vela/contracts/sdk';
import { Button, Input } from '@vela/ui';
import { signIn, BASE_URL } from '@/lib/sdk';
import { useSession } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useSession((s) => s.setSession);
  const [email, setEmail] = useState('frankie@grand-vela.demo');
  const [password, setPassword] = useState('demo-password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await signIn(email, password);
      const me = await createClient({ baseUrl: BASE_URL, token }).me();
      setSession(token, me);
      router.replace('/arrivals');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg-canvas)] px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex size-11 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--interactive-default)] font-display text-xl font-bold text-[var(--ink-inverse)]">
            ▲
          </div>
          <h1 className="font-display text-[var(--text-title)] font-semibold">The Desk</h1>
          <p className="mt-1 text-[var(--text-caption)] text-[var(--ink-tertiary)]">
            Sign in to Vela — calm surface, deep machine.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-[var(--gap-lg)] rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] p-[var(--space-6)] shadow-[var(--shadow-e3)]"
        >
          <label className="block space-y-1.5">
            <span className="text-[var(--text-caption)] font-medium text-[var(--ink-secondary)]">
              Email
            </span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[var(--text-caption)] font-medium text-[var(--ink-secondary)]">
              Password
            </span>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-[var(--radius-md)] border border-[var(--status-critical-line)] bg-[var(--status-critical-bg)] px-[var(--space-3)] py-2 text-[var(--text-caption)] text-[var(--status-critical-ink)]"
            >
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-[var(--text-micro)] text-[var(--ink-tertiary)]">
          Demo: run <code className="font-mono">pnpm seed</code> to provision this property.
        </p>
      </div>
    </main>
  );
}
