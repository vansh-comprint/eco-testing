import React from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  compact?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  sortKey,
  sortDirection,
  onSort,
  emptyMessage = 'No data available',
  loading = false,
  className,
  compact = false,
}: DataTableProps<T>) {
  const getValue = (item: T, key: string): unknown => {
    const keys = key.split('.');
    let value: unknown = item;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k];
      }
    }
    return value;
  };

  const cellPadding = compact ? 'px-3 py-2.5' : 'px-4 py-3.5';

  return (
    <div className={cn('w-full overflow-hidden rounded-lg border border-slate-200 dark:border-white/[0.06]', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06]">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    cellPadding,
                    'text-left text-xs font-medium text-slate-600 dark:text-white/50',
                    column.sortable && 'cursor-pointer hover:text-slate-900 dark:hover:text-white/70 transition-colors select-none',
                    column.className
                  )}
                  onClick={() => column.sortable && onSort?.(String(column.key))}
                >
                  <div className="flex items-center gap-1.5">
                    {column.header}
                    {column.sortable && (
                      <span className="text-slate-400 dark:text-white/30">
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((column) => (
                    <td key={String(column.key)} className={cellPadding}>
                      <div className="h-4 bg-slate-100 dark:bg-white/[0.04] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-slate-500 dark:text-white/40"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02, duration: 0.15 }}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'transition-colors duration-100',
                    onRowClick && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(cellPadding, 'text-sm text-slate-900 dark:text-white/80', column.className)}
                    >
                      {column.render
                        ? column.render(item, index)
                        : String(getValue(item, String(column.key)) ?? '-')}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Pagination component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showInfo?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showInfo = false,
  totalItems,
  itemsPerPage,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
  );

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4', className)}>
      {showInfo && totalItems !== undefined && itemsPerPage !== undefined && (
        <p className="text-xs text-slate-500 dark:text-white/40">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}
          -{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
        </p>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.05] rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {visiblePages.map((page, index) => {
          const prevPage = visiblePages[index - 1];
          const showEllipsis = prevPage && page - prevPage > 1;

          return (
            <React.Fragment key={page}>
              {showEllipsis && <span className="px-1 text-slate-400 dark:text-white/30 text-sm">...</span>}
              <button
                onClick={() => onPageChange(page)}
                className={cn(
                  'min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors',
                  currentPage === page
                    ? 'bg-ecotribe-primary text-ecotribe-dark'
                    : 'text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                )}
              >
                {page}
              </button>
            </React.Fragment>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.05] rounded-md disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DataTable;
