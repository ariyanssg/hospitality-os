'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { Kbd } from './kbd';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  icon?: ReactNode;
  keywords?: string;
  run: () => void;
}

/**
 * CommandPalette (⌘K) — actions / nav / entities in one field (doc 17 Tier-C, doc 18 §4). Opens on
 * ⌘K / Ctrl-K, full keyboard control (↑↓ to move, Enter to run, Esc to close). This is the shell;
 * async entity + AI result sources plug into `items`.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = 'Search & command…',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
}): ReactNode {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl-K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      `${it.label} ${it.hint ?? ''} ${it.keywords ?? ''} ${it.group ?? ''}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((it) => {
      const g = it.group ?? 'Actions';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(it);
    });
    return [...map.entries()];
  }, [filtered]);

  if (!open) return null;

  const run = (it: CommandItem) => {
    it.run();
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-palette)] flex items-start justify-center p-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-[var(--bg-overlay)]" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-[640px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line-hairline)] bg-[var(--bg-raised)] shadow-[var(--shadow-e4)]">
        <div className="flex items-center gap-[var(--gap-sm)] border-b border-[var(--line-hairline)] px-[var(--space-4)]">
          <Search className="size-4 text-[var(--ink-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && filtered[active]) {
                e.preventDefault();
                run(filtered[active]);
              } else if (e.key === 'Escape') {
                onOpenChange(false);
              }
            }}
            placeholder={placeholder}
            className="h-12 flex-1 bg-transparent text-[var(--text-body-lg)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] focus:outline-none"
          />
          <Kbd>esc</Kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-[var(--space-2)]">
          {filtered.length === 0 ? (
            <p className="px-[var(--space-4)] py-[var(--space-6)] text-center text-[var(--text-caption)] text-[var(--ink-tertiary)]">
              No matches for “{query}”.
            </p>
          ) : (
            groups.map(([group, groupItems]) => (
              <div key={group} className="px-[var(--space-2)]">
                <p className="px-[var(--space-2)] py-[var(--space-1)] text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">
                  {group}
                </p>
                {groupItems.map((it) => {
                  const idx = filtered.indexOf(it);
                  return (
                    <button
                      key={it.id}
                      onMouseMove={() => setActive(idx)}
                      onClick={() => run(it)}
                      className={cn(
                        'flex w-full items-center gap-[var(--gap-sm)] rounded-[var(--radius-md)] px-[var(--space-2)] py-[var(--space-2)] text-left',
                        idx === active ? 'bg-[var(--interactive-selected)] text-[var(--ink-accent)]' : 'text-[var(--ink-secondary)]',
                      )}
                    >
                      {it.icon && <span className="text-[var(--ink-tertiary)]">{it.icon}</span>}
                      <span className="flex-1 text-[var(--font-size-ui)] text-[var(--ink-primary)]">{it.label}</span>
                      {it.hint && <span className="text-[var(--text-caption)] text-[var(--ink-tertiary)]">{it.hint}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
