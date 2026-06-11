import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'The Desk — Vela',
  description: 'Vela front desk — calm surface, deep machine.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-density="comfortable" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
