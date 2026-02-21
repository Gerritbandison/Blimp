import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  hidden?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  pageSize?: number;
  emptyState?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  data, columns, onRowClick, selectable, selectedIds = [],
  onSelectionChange, pageSize = 20, emptyState, loading, className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const visibleColumns = columns.filter((c) => !c.hidden);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = (a as Record<string, string | number | boolean | null | undefined>)[sortKey];
      const bv = (b as Record<string, string | number | boolean | null | undefined>)[sortKey];
      const aStr = av == null ? '' : String(av);
      const bStr = bv == null ? '' : String(bv);
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function toggleAll() {
    if (!onSelectionChange) return;
    const allIds = paged.map((r) => r.id);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    onSelectionChange(allSelected ? [] : allIds);
  }

  function toggleRow(id: string) {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    );
  }

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-busy="true" aria-label="Loading data">
          <thead>
            <tr className="border-b border-gray-100">
              {visibleColumns.map((col) => (
                <th key={String(col.key)} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {visibleColumns.map((col) => (
                  <td key={String(col.key)} className="py-3 px-4">
                    <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={clsx('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-100">
            <tr>
              {selectable && (
                <th className="w-10 py-3 px-4" scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={paged.length > 0 && paged.every((r) => selectedIds.includes(r.id))}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {visibleColumns.map((col) => {
                const isSortable = col.sortable !== false;
                const isActive = sortKey === String(col.key);
                const ariaSortValue: React.AriaAttributes['aria-sort'] = isActive
                  ? sortDir === 'asc' ? 'ascending' : 'descending'
                  : isSortable ? 'none' : undefined;

                return (
                  <th
                    key={String(col.key)}
                    scope="col"
                    aria-sort={ariaSortValue}
                    tabIndex={isSortable ? 0 : undefined}
                    className={clsx(
                      'text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap',
                      isSortable && 'cursor-pointer hover:text-gray-900 select-none',
                      col.width && `w-${col.width}`
                    )}
                    onClick={() => isSortable && handleSort(String(col.key))}
                    onKeyDown={(e) => {
                      if (isSortable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleSort(String(col.key));
                      }
                    }}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {isSortable && (
                        <span className="flex flex-col" aria-hidden="true">
                          <ChevronUp
                            size={10}
                            className={clsx(isActive && sortDir === 'asc' ? 'text-blue-600' : 'text-gray-300')}
                          />
                          <ChevronDown
                            size={10}
                            className={clsx(isActive && sortDir === 'desc' ? 'text-blue-600' : 'text-gray-300')}
                          />
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="py-16 text-center"
                >
                  {emptyState || (
                    <div className="text-gray-400">
                      <p className="text-base font-medium">No records found</p>
                      <p className="text-sm mt-1">Try adjusting your filters or search</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(
                    'group transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-blue-50/40',
                    selectedIds.includes(row.id) && 'bg-blue-50/50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="w-10 py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select row`}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                  )}
                  {visibleColumns.map((col) => (
                    <td key={String(col.key)} className="py-3 px-4 text-gray-700 whitespace-nowrap">
                      {col.render
                        ? col.render(row)
                        : (() => { const v = (row as Record<string, string | number | boolean | null | undefined>)[String(col.key)]; return v == null ? '—' : String(v); })()}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </p>
          <nav aria-label="Table pagination" className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  className={clsx(
                    'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors',
                    p === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
