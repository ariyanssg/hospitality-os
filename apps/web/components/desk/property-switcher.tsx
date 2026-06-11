'use client';
import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { Kbd } from '@vela/ui';
import { useSession } from '@/lib/store';

/** PropertySwitcher (⌘P) — top-bar control to scope the whole app to a property (doc 18 §2). */
export function PropertySwitcher() {
  const me = useSession((s) => s.me);
  const activeId = useSession((s) => s.activePropertyId);
  const setActive = useSession((s) => s.setActiveProperty);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const active = me?.properties.find((p) => p.id === activeId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-hairline)] bg-[var(--bg-surface)] px-2.5 text-[var(--font-size-ui)] hover:bg-[var(--bg-sunken)]"
      >
        <Building2 className="size-4 text-[var(--ink-tertiary)]" />
        <span className="max-w-[180px] truncate font-medium">{active?.name ?? 'Select property'}</span>
        <Kbd>⌘P</Kbd>
        <ChevronDown className="size-3.5 text-[var(--ink-tertiary)]" />
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-[var(--z-overlay)] w-[280px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] shadow-[var(--shadow-e4)]">
          {me?.properties.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActive(p.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 px-[var(--space-3)] py-2.5 text-left hover:bg-[var(--bg-sunken)]"
            >
              <div>
                <div className="text-[var(--font-size-ui)] font-medium">{p.name}</div>
                <div className="font-mono text-[var(--text-micro)] text-[var(--ink-tertiary)]">{p.code} · {p.currency}</div>
              </div>
              {p.id === activeId && <Check className="size-4 text-[var(--ink-accent)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
