import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percentage';
  icon?: React.ReactNode;
  trend?: { value: number; isPositive: boolean } | 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  animate?: boolean;
  variant?: 'default' | 'compact' | 'prominent';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  previousValue,
  format = 'number',
  icon,
  trend,
  trendValue,
  className,
  animate = true,
  variant = 'default',
}) => {
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }

    const duration = 800;
    const steps = 24;
    const stepValue = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, animate]);

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val}%`;
      default:
        return new Intl.NumberFormat('en-IN').format(val);
    }
  };

  const getTrendData = () => {
    if (!trend && !previousValue) return null;

    if (typeof trend === 'object' && trend !== null) {
      return {
        direction: trend.isPositive ? 'up' : 'down',
        value: `${trend.value}%`,
      };
    }

    if (typeof trend === 'string') {
      return { direction: trend, value: trendValue };
    }

    if (previousValue && typeof value === 'number') {
      const change = ((value - previousValue) / previousValue) * 100;
      return {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        value: `${Math.abs(change).toFixed(1)}%`,
      };
    }

    return null;
  };

  const trendData = getTrendData();

  const trendIcons = {
    up: <TrendingUp className="w-3.5 h-3.5" />,
    down: <TrendingDown className="w-3.5 h-3.5" />,
    neutral: <Minus className="w-3.5 h-3.5" />,
  };

  const trendColors = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-black/50 dark:text-zinc-500',
  };

  const variantStyles = {
    default: 'p-8',
    compact: 'p-6',
    prominent: 'p-10',
  };

  const valueStyles = {
    default: 'text-4xl md:text-5xl',
    compact: 'text-3xl',
    prominent: 'text-5xl md:text-6xl',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'border-r border-b border-black/10 dark:border-white/10',
        'hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 group',
        'bg-white/30 dark:bg-transparent backdrop-blur-sm',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-mono font-bold text-xs text-black/50 dark:text-zinc-400 uppercase tracking-widest group-hover:text-ecotribe-primary transition-colors">
            {title}
          </h4>
          {icon && (
            <div className="text-black/40 dark:text-zinc-600 group-hover:text-ecotribe-primary/60 transition-colors">
              {icon}
            </div>
          )}
        </div>
        <motion.div
          key={String(displayValue)}
          className={cn(
            'font-brand font-bold text-black dark:text-white mb-2',
            valueStyles[variant]
          )}
        >
          {formatValue(displayValue)}
        </motion.div>
        {subtitle && (
          <p className="font-mono font-medium text-black/60 dark:text-zinc-600 text-sm tracking-wide">{subtitle}</p>
        )}
        {trendData && (
          <div className={cn(
            'flex items-center gap-1.5 mt-3',
            trendColors[trendData.direction as keyof typeof trendColors]
          )}>
            {trendIcons[trendData.direction as keyof typeof trendIcons]}
            <span className="font-mono text-xs font-bold">
              {trendData.value}
            </span>
            <span className="text-black/40 dark:text-zinc-600 text-xs font-mono">vs last period</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Grid layout for multiple stats - Protocol style with border grid
interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  children,
  columns = 4,
  className,
}) => {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid border-l border-t border-black/10 dark:border-white/10', gridCols[columns], className)}>
      {children}
    </div>
  );
};

export default StatsCard;
