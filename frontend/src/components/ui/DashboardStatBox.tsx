import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { accent, text, iconSize, hover as hoverStyles, glass } from '@/lib/design-tokens';
import { listItemVariants, createStaggerTransition } from '@/lib/animations';
import { TrendingUp, TrendingDown } from 'lucide-react';

export type StatAccent = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatBoxItem {
  /** Main label for the stat */
  label: string;
  /** Primary value to display */
  value: string | number;
  /** Optional sublabel (e.g., "In System", "This Month") */
  subLabel?: string;
  /** Optional icon component */
  icon?: React.ReactNode;
  /** Optional trend indicator */
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  /** Click handler */
  onClick?: () => void;
  /** Accent color for left border (default: neutral) */
  accent?: StatAccent;
}

interface DashboardStatGridProps {
  items: StatBoxItem[];
  /** Number of columns on large screens */
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

/**
 * Individual stat box with left-border accent pattern
 * Premium design with glass background and sophisticated colors
 */
export function StatBox({
  label,
  value,
  subLabel,
  icon,
  trend,
  onClick,
  accent: accentType = 'neutral',
  index = 0,
}: StatBoxItem & { index?: number }) {
  const accentConfig = accent[accentType];

  return (
    <motion.div
      variants={listItemVariants}
      initial="initial"
      animate="animate"
      transition={createStaggerTransition(index)}
      onClick={onClick}
      className={cn(
        // Glass background - HIGH OPACITY FOR VISIBILITY
        'bg-white dark:bg-zinc-900/85',
        'backdrop-blur-md',
        // Border with accent
        'border',
        accentConfig.borderColor,
        accentConfig.border,
        // Shadow for light mode depth
        'shadow-sm shadow-slate-900/[0.04] dark:shadow-none',
        // Padding
        'p-6',
        // Hover
        onClick && 'cursor-pointer',
        hoverStyles.stat,
        'hover:border-lime-500/30 dark:hover:border-lime-400/20',
        'hover:shadow-md hover:shadow-slate-900/[0.06] dark:hover:shadow-none',
        'transition-all duration-200'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Label - Above the value */}
          <p className={cn(
            'font-mono text-xs uppercase tracking-[0.15em] mb-2',
            text.muted
          )}>
            {label}
          </p>

          {/* Value - Large and prominent */}
          <p className={cn(
            'font-brand font-bold text-3xl md:text-4xl tracking-tight',
            text.primary
          )}>
            {value}
          </p>

          {/* Sub-label and Trend */}
          {(subLabel || trend) && (
            <div className="flex items-center gap-3 mt-2">
              {subLabel && (
                <span className={cn(
                  'text-xs',
                  text.muted
                )}>
                  {subLabel}
                </span>
              )}
              {trend && (
                <span className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  trend.direction === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}>
                  {trend.direction === 'up' ? (
                    <TrendingUp className={iconSize.xs} />
                  ) : (
                    <TrendingDown className={iconSize.xs} />
                  )}
                  {trend.value}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className={cn(
            'flex-shrink-0 p-2.5',
            'bg-slate-100 dark:bg-zinc-800/80',
            'rounded-lg',
            'border border-slate-200 dark:border-zinc-700/50'
          )}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Dashboard stat grid with glass styling
 * Provides consistent layout across all dashboards
 */
export function DashboardStatGrid({
  items,
  columns = 4,
  className,
}: DashboardStatGridProps) {
  const columnClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-2 lg:grid-cols-5',
    6: 'md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        columnClasses[columns],
        className
      )}
    >
      {items.map((item, index) => (
        <StatBox key={item.label} {...item} index={index} />
      ))}
    </div>
  );
}

/**
 * Compact stat box for smaller displays and mobile
 */
export function CompactStatBox({
  label,
  value,
  icon,
  accent: accentType = 'neutral',
  className,
}: Omit<StatBoxItem, 'subLabel' | 'trend' | 'onClick'> & { className?: string }) {
  const accentConfig = accent[accentType];

  return (
    <div className={cn(
      // Glass background - HIGH OPACITY
      'bg-white dark:bg-zinc-900/85',
      'backdrop-blur-md',
      // Border with accent
      'border',
      accentConfig.borderColor,
      accentConfig.border,
      // Shadow for depth
      'shadow-sm shadow-slate-900/[0.04] dark:shadow-none',
      // Padding
      'p-4',
      // Hover
      'hover:border-lime-500/30 dark:hover:border-lime-400/20',
      'transition-all duration-200',
      className
    )}>
      <div className="flex items-center justify-between gap-3">
        {icon && (
          <div className={cn(
            'flex-shrink-0 p-2',
            'bg-slate-100 dark:bg-zinc-800/80',
            'rounded-lg',
            'border border-slate-200 dark:border-zinc-700/50'
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 text-right">
          <p className={cn(
            'font-brand font-bold text-2xl tracking-tight',
            text.primary
          )}>
            {value}
          </p>
          <p className={cn(
            'text-xs uppercase tracking-wider mt-1',
            text.muted
          )}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Highlighted stat box for primary KPIs
 * Uses brand accent with subtle tinted background
 */
export function HighlightStatBox({
  label,
  value,
  subLabel,
  icon,
  trend,
  onClick,
  className,
}: Omit<StatBoxItem, 'accent'> & { className?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={cn(
        // Brand-tinted glass background
        'bg-lime-50/80 dark:bg-lime-500/[0.08]',
        'backdrop-blur-md',
        // Brand border
        'border border-lime-500/25 dark:border-lime-400/20',
        'border-l-4 border-l-lime-500',
        // Padding
        'p-6',
        // Hover
        onClick && 'cursor-pointer',
        'hover:border-lime-500/40 dark:hover:border-lime-400/30',
        'transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-lime-700 dark:text-lime-300 uppercase tracking-[0.15em] mb-2">
            {label}
          </p>
          <p className={cn(
            'font-brand font-bold text-3xl md:text-4xl tracking-tight',
            text.primary
          )}>
            {value}
          </p>
          {(subLabel || trend) && (
            <div className="flex items-center gap-3 mt-2">
              {subLabel && (
                <span className="text-xs text-lime-600 dark:text-lime-400">
                  {subLabel}
                </span>
              )}
              {trend && (
                <span className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  trend.direction === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                )}>
                  {trend.direction === 'up' ? (
                    <TrendingUp className={iconSize.xs} />
                  ) : (
                    <TrendingDown className={iconSize.xs} />
                  )}
                  {trend.value}%
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2.5 bg-lime-100/80 dark:bg-lime-500/20 rounded-lg border border-lime-200/50 dark:border-lime-500/30">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Connected section wrapper - visually links stats with related content
 * Creates cohesive blocks where stats and tables/lists belong together
 */
export interface ConnectedSectionProps {
  /** Section title displayed above stats */
  title?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Action button/link on the right */
  action?: React.ReactNode;
  /** Stats to display */
  stats?: StatBoxItem[];
  /** Number of stat columns */
  statColumns?: 2 | 3 | 4 | 5;
  /** Content below stats */
  children: React.ReactNode;
  className?: string;
}

export function ConnectedSection({
  title,
  subtitle,
  action,
  stats,
  statColumns = 4,
  children,
  className,
}: ConnectedSectionProps) {
  const columnClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-2 lg:grid-cols-5',
  };

  return (
    <div className={cn(
      // Container styling
      'bg-white dark:bg-zinc-900/80',
      'border border-slate-200 dark:border-zinc-800',
      'shadow-sm shadow-slate-900/[0.04] dark:shadow-none',
      'overflow-hidden',
      className
    )}>
      {/* Section Header */}
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
          <div>
            {title && (
              <h2 className={cn(
                'font-brand font-bold text-base uppercase tracking-wide',
                text.primary
              )}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className={cn('text-xs mt-0.5', text.muted)}>
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}

      {/* Stats Row - Connected to content below */}
      {stats && stats.length > 0 && (
        <div className={cn(
          'grid grid-cols-1 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-zinc-800',
          'border-b border-slate-200 dark:border-zinc-800',
          columnClasses[statColumns]
        )}>
          {stats.map((stat, index) => {
            const accentConfig = accent[stat.accent || 'neutral'];
            return (
              <div
                key={stat.label}
                onClick={stat.onClick}
                className={cn(
                  'p-5',
                  stat.onClick && 'cursor-pointer',
                  'hover:bg-slate-50 dark:hover:bg-zinc-800/50',
                  'transition-colors duration-150',
                  // First item gets the accent border
                  index === 0 && accentConfig.border
                )}
              >
                <p className={cn('font-mono text-[11px] uppercase tracking-[0.15em] mb-1', text.muted)}>
                  {stat.label}
                </p>
                <div className="flex items-end justify-between gap-2">
                  <p className={cn('font-brand font-bold text-2xl tracking-tight', text.primary)}>
                    {stat.value}
                  </p>
                  {stat.icon && (
                    <div className="flex-shrink-0 opacity-60">
                      {stat.icon}
                    </div>
                  )}
                </div>
                {stat.subLabel && (
                  <p className={cn('text-[10px] mt-1', text.muted)}>
                    {stat.subLabel}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      <div>
        {children}
      </div>
    </div>
  );
}

export default DashboardStatGrid;
