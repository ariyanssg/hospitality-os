'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type Density = 'comfortable' | 'compact' | 'touch';

const DensityContext = createContext<Density>('comfortable');

/**
 * Density is a first-class dimension (doc 17 §1.5): the same components render comfortable / compact /
 * touch from one token contract. Sets `data-density` so the semantic density tokens re-map.
 */
export function DensityProvider({
  density = 'comfortable',
  children,
  asChild = false,
}: {
  density?: Density;
  children: ReactNode;
  /** When true, does not render a wrapper element (caller sets data-density on <html>). */
  asChild?: boolean;
}): ReactNode {
  const value = useMemo(() => density, [density]);
  if (asChild) {
    return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
  }
  return (
    <DensityContext.Provider value={value}>
      <div data-density={density} className="contents">
        {children}
      </div>
    </DensityContext.Provider>
  );
}

export function useDensity(): Density {
  return useContext(DensityContext);
}
