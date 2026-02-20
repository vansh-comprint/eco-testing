import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { headerVariants, createSectionTransition } from '@/lib/animations';
import { BackButton } from './BackButton';

export interface PageHeaderProps {
  /** Small uppercase label above the title (e.g., "Dashboard", "Assets") */
  label?: string;
  /** Main page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Right-aligned action buttons */
  actions?: React.ReactNode;
  action?: React.ReactNode; // Alias for actions
  /** Link to navigate back */
  backLink?: string;
  /** Label for the back button (e.g., "Back to Branches") */
  backLabel?: string;
  /** Whether to show bottom border */
  bordered?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Delay for animation (useful for staggering) */
  delay?: number;
}

/**
 * Unified page header component for all dashboards and pages
 * Provides consistent typography and spacing across portals
 */
export function PageHeader({
  label,
  title,
  subtitle,
  actions,
  action,
  backLink,
  backLabel = 'Back',
  bordered = true,
  className,
  delay = 0,
}: PageHeaderProps) {
  const actualActions = actions || action;
  return (
    <motion.div
      variants={headerVariants}
      initial="initial"
      animate="animate"
      transition={createSectionTransition(delay)}
      className={cn(
        'flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-6',
        bordered && 'border-b border-slate-200 dark:border-white/10',
        className
      )}
    >
      <div>
        {backLink && <BackButton to={backLink} label={backLabel} />}
        {label && (
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            {label}
          </span>
        )}
        <h1 className="font-brand font-bold text-2xl md:text-3xl lg:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="font-display text-sm text-slate-500 dark:text-white/50 mt-2 uppercase tracking-wide">
            {subtitle}
          </p>
        )}
      </div>

      {actualActions && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {actualActions}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Section header for content sections within a page
 * Smaller than PageHeader, used for card sections
 */
export function SectionHeader({
  title,
  subtitle,
  actions,
  className,
}: Omit<PageHeaderProps, 'label' | 'bordered' | 'delay'>) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 dark:border-white/10',
      className
    )}>
      <div>
        <h2 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
          {title}
        </h2>
        {subtitle && (
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1 uppercase tracking-wider">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Compact header for cards and smaller sections
 */
export function CardSectionHeader({
  title,
  badge,
  action,
  className,
}: {
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-3 p-4 md:p-6 border-b border-slate-200 dark:border-white/10',
      className
    )}>
      <div className="flex items-center gap-3">
        <h3 className="font-brand font-bold text-base text-slate-900 dark:text-white uppercase tracking-wide">
          {title}
        </h3>
        {badge}
      </div>
      {action}
    </div>
  );
}

export default PageHeader;
