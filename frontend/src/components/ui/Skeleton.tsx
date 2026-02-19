import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}) => {
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animations = {
    pulse: 'animate-pulse',
    shimmer: 'animate-shimmer bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-white/[0.04] dark:via-white/[0.08] dark:to-white/[0.04] bg-[length:200%_100%]',
    none: '',
  };

  return (
    <div
      className={cn(
        animation !== 'shimmer' && 'bg-slate-100 dark:bg-white/[0.04]',
        variants[variant],
        animations[animation],
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  );
};

// Preset skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; className?: string; size?: 'sm' | 'md' }> = ({
  lines = 3,
  className,
  size = 'md',
}) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        height={size === 'sm' ? 12 : 14}
        className={cn(i === lines - 1 && 'w-3/4')}
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl p-5', className)}>
    <div className="flex items-center gap-3 mb-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height={14} className="w-1/2" />
        <Skeleton variant="text" height={10} className="w-1/3" />
      </div>
    </div>
    <SkeletonText lines={2} size="sm" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="w-full overflow-hidden rounded-lg border border-slate-200 dark:border-white/[0.06]">
    {/* Header */}
    <div className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.06] px-4 py-3 flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" height={12} className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="px-4 py-3.5 flex gap-4 border-b border-slate-100 dark:border-white/[0.04] last:border-0">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" height={12} className="flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SectionSkeleton: React.FC<{ rows?: number; showHeader?: boolean; className?: string }> = ({
  rows = 3,
  showHeader = true,
  className,
}) => (
  <div className={cn('animate-pulse', className)}>
    {showHeader && <Skeleton variant="text" height={16} className="w-48 mb-4" />}
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={48} className="w-full" />
      ))}
    </div>
  </div>
);

export const StatCardSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 4,
  className,
}) => (
  <div className={cn(`grid grid-cols-2 lg:grid-cols-${count} gap-4 animate-pulse`, className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-6 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <Skeleton variant="text" height={12} className="w-24 mb-3" />
        <Skeleton variant="text" height={28} className="w-16" />
      </div>
    ))}
  </div>
);

export default Skeleton;
