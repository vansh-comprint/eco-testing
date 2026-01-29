import React from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'outline';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  /** Use left-border accent style instead of full background */
  accentBorder?: boolean;
}

// v2.0 - Refined semantic colors with better light mode contrast
const variants: Record<BadgeVariant, string> = {
  default: `
    bg-slate-100/80 dark:bg-zinc-800/80
    text-slate-700 dark:text-zinc-300
    border border-slate-200/80 dark:border-zinc-700
  `,
  success: `
    bg-emerald-50/80 dark:bg-emerald-500/10
    text-emerald-700 dark:text-emerald-400
    border border-emerald-500/25 dark:border-emerald-400/20
  `,
  warning: `
    bg-amber-50/80 dark:bg-amber-500/10
    text-amber-700 dark:text-amber-400
    border border-amber-500/25 dark:border-amber-400/20
  `,
  error: `
    bg-red-50/80 dark:bg-red-500/10
    text-red-700 dark:text-red-400
    border border-red-500/25 dark:border-red-400/20
  `,
  info: `
    bg-blue-50/80 dark:bg-blue-500/10
    text-blue-700 dark:text-blue-400
    border border-blue-500/25 dark:border-blue-400/20
  `,
  primary: `
    bg-lime-50/80 dark:bg-lime-500/10
    text-lime-700 dark:text-lime-400
    border border-lime-500/25 dark:border-lime-400/20
  `,
  outline: `
    bg-transparent
    text-slate-600 dark:text-zinc-400
    border border-slate-300 dark:border-zinc-600
  `,
};

// Accent border variant - left border only
const accentBorderVariants: Record<BadgeVariant, string> = {
  default: `
    bg-white/60 dark:bg-zinc-900/60
    backdrop-blur-sm
    text-slate-700 dark:text-zinc-300
    border border-slate-200/60 dark:border-zinc-700/60
    border-l-2 border-l-slate-400 dark:border-l-zinc-500
  `,
  success: `
    bg-white/60 dark:bg-zinc-900/60
    backdrop-blur-sm
    text-emerald-700 dark:text-emerald-400
    border border-emerald-200/60 dark:border-emerald-500/20
    border-l-2 border-l-emerald-500
  `,
  warning: `
    bg-white/60 dark:bg-zinc-900/60
    backdrop-blur-sm
    text-amber-700 dark:text-amber-400
    border border-amber-200/60 dark:border-amber-500/20
    border-l-2 border-l-amber-500
  `,
  error: `
    bg-white/60 dark:bg-zinc-900/60
    backdrop-blur-sm
    text-red-700 dark:text-red-400
    border border-red-200/60 dark:border-red-500/20
    border-l-2 border-l-red-500
  `,
  info: `
    bg-white/60 dark:bg-zinc-900/60
    backdrop-blur-sm
    text-blue-700 dark:text-blue-400
    border border-blue-200/60 dark:border-blue-500/20
    border-l-2 border-l-blue-500
  `,
  primary: `
    bg-white/60 dark:bg-zinc-900/60
    backdrop-blur-sm
    text-lime-700 dark:text-lime-400
    border border-lime-200/60 dark:border-lime-500/20
    border-l-2 border-l-lime-500
  `,
  outline: `
    bg-transparent
    text-slate-600 dark:text-zinc-400
    border border-slate-300 dark:border-zinc-600
    border-l-2 border-l-slate-400 dark:border-l-zinc-500
  `,
};

const sizes: Record<BadgeSize, string> = {
  xs: 'h-5 px-2 text-[9px]',
  sm: 'h-6 px-2.5 text-[10px]',
  md: 'h-7 px-3 text-[11px]',
  lg: 'h-8 px-4 text-xs',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-500 dark:bg-zinc-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  primary: 'bg-lime-500',
  outline: 'bg-slate-500 dark:bg-zinc-400',
};

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'sm',
  dot = false,
  accentBorder = false,
  children,
  ...props
}) => {
  const variantStyles = accentBorder ? accentBorderVariants[variant] : variants[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        'font-medium uppercase tracking-wider whitespace-nowrap',
        variantStyles,
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          dotColors[variant],
          'animate-pulse'
        )} />
      )}
      {children}
    </span>
  );
};

// Status-specific badge for asset statuses
type AssetStatusType =
  | 'pending_assignment'
  | 'assigned'
  | 'check_in_started'
  | 'submitted'
  | 'remote_review'
  | 'conditionally_accepted'
  | 'remote_rejected'
  | 'in_transit'
  | 'facility_qc'
  | 'final_accepted'
  | 'final_rejected'
  | 'payout_pending'
  | 'completed';

const statusConfig: Record<AssetStatusType, { label: string; variant: BadgeVariant }> = {
  pending_assignment: { label: 'Pending', variant: 'default' },
  assigned: { label: 'Assigned', variant: 'info' },
  check_in_started: { label: 'In Progress', variant: 'info' },
  submitted: { label: 'Submitted', variant: 'info' },
  remote_review: { label: 'In Review', variant: 'warning' },
  conditionally_accepted: { label: 'Accepted', variant: 'success' },
  remote_rejected: { label: 'Rejected', variant: 'error' },
  in_transit: { label: 'In Transit', variant: 'warning' },
  facility_qc: { label: 'QC Check', variant: 'warning' },
  final_accepted: { label: 'Accepted', variant: 'success' },
  final_rejected: { label: 'Rejected', variant: 'error' },
  payout_pending: { label: 'Payout Due', variant: 'primary' },
  completed: { label: 'Complete', variant: 'success' },
};

interface StatusBadgeProps {
  status: AssetStatusType;
  size?: BadgeSize;
  showDot?: boolean;
  /** Use left-border accent style */
  accentBorder?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showDot = false,
  accentBorder = false,
}) => {
  const config = statusConfig[status] || { label: status, variant: 'default' as BadgeVariant };
  return (
    <Badge variant={config.variant} size={size} dot={showDot} accentBorder={accentBorder}>
      {config.label}
    </Badge>
  );
};

export default Badge;
