import { useEffect, useRef } from 'react';
import { Spinner } from './Spinner';
import { cn } from '@/lib/utils';

interface InfiniteScrollTriggerProps {
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Whether the next page is currently being fetched */
  isFetchingNextPage: boolean;
  /** Function to fetch the next page */
  fetchNextPage: () => void;
  /** Custom class for the trigger container */
  className?: string;
}

/**
 * InfiniteScrollTrigger — Place at the bottom of a scrollable list.
 * Uses IntersectionObserver to auto-fetch the next page when the user scrolls near it.
 */
export function InfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  className,
}: InfiniteScrollTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hasNextPage && !isFetchingNextPage) return null;

  return (
    <div ref={triggerRef} className={cn('flex justify-center py-6', className)}>
      {isFetchingNextPage && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
          <Spinner size="sm" variant="primary" />
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
}

interface InfiniteScrollInfoProps {
  /** Total items loaded so far */
  loadedCount: number;
  /** Total items available (from pagination metadata) */
  totalCount?: number;
  /** Custom class */
  className?: string;
}

/**
 * Shows "Showing X of Y items" info bar
 */
export function InfiniteScrollInfo({
  loadedCount,
  totalCount,
  className,
}: InfiniteScrollInfoProps) {
  if (!totalCount || totalCount === 0) return null;

  return (
    <div className={cn(
      'text-xs text-slate-500 dark:text-zinc-500 text-center py-2',
      className
    )}>
      Showing {loadedCount} of {totalCount} items
    </div>
  );
}
