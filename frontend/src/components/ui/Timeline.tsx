import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type TimelineItemStatus = 'completed' | 'current' | 'pending' | 'error';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: Date;
  status: TimelineItemStatus;
  icon?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<TimelineItemStatus, { dot: string; line: string; icon: React.ReactNode }> = {
  completed: {
    dot: 'bg-ecotribe-primary border-ecotribe-primary',
    line: 'bg-ecotribe-primary/70 dark:bg-ecotribe-primary/50',
    icon: <Check className="w-2.5 h-2.5 text-ecotribe-dark" />,
  },
  current: {
    dot: 'bg-ecotribe-primary/20 border-ecotribe-primary',
    line: 'bg-slate-200 dark:bg-white/[0.08]',
    icon: <Clock className="w-2.5 h-2.5 text-ecotribe-primary" />,
  },
  pending: {
    dot: 'bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.15]',
    line: 'bg-slate-200 dark:bg-white/[0.06]',
    icon: null,
  },
  error: {
    dot: 'bg-red-100 dark:bg-red-500/15 border-red-300 dark:border-red-400/50',
    line: 'bg-red-200 dark:bg-red-500/20',
    icon: <AlertCircle className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />,
  },
};

export const Timeline: React.FC<TimelineProps> = ({ items, className, size = 'md' }) => {
  const sizeConfig = {
    sm: { dot: 'w-5 h-5', pl: 'pl-7', title: 'text-sm', desc: 'text-xs' },
    md: { dot: 'w-6 h-6', pl: 'pl-8', title: 'text-sm', desc: 'text-xs' },
  };

  return (
    <div className={cn('relative', className)}>
      {items.map((item, index) => {
        const styles = statusStyles[item.status];
        const isLast = index === items.length - 1;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.15 }}
            className={cn('relative pb-5 last:pb-0', sizeConfig[size].pl)}
          >
            {/* Connecting line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[11px] top-6 w-px h-[calc(100%-12px)]',
                  styles.line
                )}
              />
            )}

            {/* Dot */}
            <div
              className={cn(
                'absolute left-0 top-0.5 rounded-full border flex items-center justify-center',
                sizeConfig[size].dot,
                styles.dot
              )}
            >
              {item.icon || styles.icon}
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4
                  className={cn(
                    'font-medium',
                    sizeConfig[size].title,
                    item.status === 'completed' && 'text-slate-900 dark:text-white/90',
                    item.status === 'current' && 'text-ecotribe-primary',
                    item.status === 'pending' && 'text-slate-500 dark:text-white/40',
                    item.status === 'error' && 'text-red-700 dark:text-red-400'
                  )}
                >
                  {item.title}
                </h4>
                {item.timestamp && (
                  <span className="text-[11px] text-slate-400 dark:text-white/30 tabular-nums">
                    {format(item.timestamp, 'MMM d, HH:mm')}
                  </span>
                )}
              </div>
              {item.description && (
                <p className={cn('mt-0.5 text-slate-500 dark:text-white/40', sizeConfig[size].desc)}>
                  {item.description}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Compact horizontal timeline for asset status
interface StatusTimelineProps {
  statuses: { key: string; label: string }[];
  currentStatus: string;
  isFlowComplete?: boolean;
  className?: string;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  statuses,
  currentStatus,
  isFlowComplete = false,
  className,
}) => {
  const currentIndex = statuses.findIndex((s) => s.key === currentStatus);

  return (
    <div className={cn('flex items-center gap-1.5 overflow-x-auto', className)}>
      {statuses.map((status, index) => {
        const isCompleted = index < currentIndex || (isFlowComplete && index === currentIndex);
        const isCurrent = index === currentIndex && !isFlowComplete;

        return (
          <React.Fragment key={status.key}>
            <div className="flex flex-col items-center min-w-fit">
              <div
                className={cn(
                  'w-3.5 h-3.5 rounded-full border flex items-center justify-center',
                  isCompleted && 'bg-ecotribe-primary border-ecotribe-primary',
                  isCurrent && 'bg-ecotribe-primary/20 border-ecotribe-primary/50',
                  !isCompleted && !isCurrent && 'bg-slate-100 dark:bg-white/[0.04] border-slate-300 dark:border-white/[0.12]'
                )}
              >
                {isCompleted && <Check className="w-2 h-2 text-ecotribe-dark" />}
              </div>
              <span
                className={cn(
                  'mt-1 text-[10px] whitespace-nowrap',
                  isCurrent ? 'text-slate-700 dark:text-white/70 font-medium' : 'text-slate-400 dark:text-white/30'
                )}
              >
                {status.label}
              </span>
            </div>
            {index < statuses.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px min-w-3 mt-[-14px]',
                  isCompleted ? 'bg-ecotribe-primary/70 dark:bg-ecotribe-primary/50' : 'bg-slate-200 dark:bg-white/[0.08]'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Timeline;
