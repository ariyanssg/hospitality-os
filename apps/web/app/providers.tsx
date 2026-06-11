'use client';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@vela/ui';

/** App-wide client providers: TanStack Query (server cache) + Atrium theme. Density is set on <html>. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
