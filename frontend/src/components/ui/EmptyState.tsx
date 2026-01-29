import React from 'react';
import { motion } from 'framer-motion';
import { Inbox, Search, FileX, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

type EmptyStateVariant = 'default' | 'search' | 'error' | 'noData';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const defaultIcons: Record<EmptyStateVariant, React.ReactNode> = {
  default: <Inbox className="w-10 h-10" />,
  search: <Search className="w-10 h-10" />,
  error: <AlertCircle className="w-10 h-10" />,
  noData: <FileX className="w-10 h-10" />,
};

const iconStyles: Record<EmptyStateVariant, string> = {
  default: 'text-slate-300 dark:text-white/20',
  search: 'text-slate-300 dark:text-white/20',
  error: 'text-red-300 dark:text-red-400/50',
  noData: 'text-slate-300 dark:text-white/20',
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'default',
  title,
  description,
  icon,
  action,
  size = 'md',
  className,
}) => {
  const sizeConfig = {
    sm: { padding: 'py-8 px-4', title: 'text-sm', desc: 'text-xs max-w-xs' },
    md: { padding: 'py-12 px-4', title: 'text-base', desc: 'text-sm max-w-sm' },
    lg: { padding: 'py-16 px-4', title: 'text-lg', desc: 'text-sm max-w-md' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeConfig[size].padding,
        className
      )}
    >
      <div className={cn('mb-3', iconStyles[variant])}>
        {icon || defaultIcons[variant]}
      </div>
      <h3 className={cn('font-medium text-slate-700 dark:text-white/80 mb-1', sizeConfig[size].title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-slate-500 dark:text-white/40 mb-4', sizeConfig[size].desc)}>
          {description}
        </p>
      )}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
