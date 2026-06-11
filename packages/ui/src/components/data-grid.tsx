'use client';
import { useRef, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { Skeleton } from './skeleton';

/**
 * DataGrid — the Tier-B foundation (doc 17 §4): TanStack Table core + row virtualization, sticky
 * header, sort, density-reactive row height, keyboard row activation, skeleton matching the final
 * layout. Every list screen in the product is this one component configured — consistency by
 * construction. (Column pin/resize/saved-views land incrementally on this base.)
 */
export interface DataGridProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  loading?: boolean;
  onRowActivate?: (row: T) => void;
  getRowId?: (row: T) => string;
  empty?: ReactNode;
  /** Approx. rows to render when measuring; virtualization handles the rest. */
  estimateRowPx?: number;
}

export function DataGrid<T>({
  data,
  columns,
  loading,
  onRowActivate,
  getRowId,
  empty,
  estimateRowPx = 44,
}: DataGridProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId ? (r) => getRowId(r) : undefined,
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateRowPx,
    overscan: 12,
  });

  const items = virtualizer.getVirtualItems();
  const padTop = items[0]?.start ?? 0;
  const padBottom = items.length ? virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0) : 0;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-hairline)] bg-[var(--bg-surface)]">
      <div ref={scrollRef} className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-[var(--font-size-ui)]">
          <thead className="sticky top-0 z-[var(--z-sticky)] bg-[var(--bg-raised)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--line-hairline)]">
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const dir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="h-[var(--row-h)] px-[var(--cell-px)] text-left align-middle text-[var(--text-micro)] font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]"
                      style={{ width: header.getSize() ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!sortable}
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn('inline-flex items-center gap-1', sortable && 'hover:text-[var(--ink-secondary)]')}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortable &&
                            (dir === 'asc' ? (
                              <ArrowUp className="size-3" />
                            ) : dir === 'desc' ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-40" />
                            ))}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--line-hairline)]">
                  {columns.map((_c, ci) => (
                    <td key={ci} className="h-[var(--row-h)] px-[var(--cell-px)]">
                      <Skeleton className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-[var(--space-12)] text-center text-[var(--ink-tertiary)]">
                  {empty ?? 'Nothing here yet.'}
                </td>
              </tr>
            ) : (
              <>
                {padTop > 0 && (
                  <tr aria-hidden>
                    <td colSpan={columns.length} style={{ height: padTop }} />
                  </tr>
                )}
                {items.map((vi) => {
                  const row = rows[vi.index]!;
                  return (
                    <tr
                      key={row.id}
                      data-index={vi.index}
                      tabIndex={onRowActivate ? 0 : undefined}
                      onClick={() => onRowActivate?.(row.original)}
                      onKeyDown={(e) => {
                        if (onRowActivate && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onRowActivate(row.original);
                        }
                      }}
                      className={cn(
                        'border-b border-[var(--line-hairline)] transition-colors duration-[var(--motion-fast)]',
                        onRowActivate &&
                          'cursor-pointer hover:bg-[var(--bg-sunken)] focus-visible:bg-[var(--bg-sunken)] focus-visible:outline-none',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="h-[var(--row-h)] px-[var(--cell-px)] align-middle text-[var(--ink-primary)]">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {padBottom > 0 && (
                  <tr aria-hidden>
                    <td colSpan={columns.length} style={{ height: padBottom }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { ColumnDef } from '@tanstack/react-table';
