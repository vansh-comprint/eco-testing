import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const sizes = {
  xs: 'h-0.5',
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

const variants = {
  default: 'bg-ecotribe-primary',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = true,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="font-mono text-xs text-black/50 dark:text-white/50 uppercase tracking-wider">{label || 'Progress'}</span>
          <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={cn(
        'w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden',
        sizes[size]
      )}>
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className={cn('h-full rounded-full', variants[variant])}
        />
      </div>
    </div>
  );
};

// Step Progress for multi-step flows
interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  steps?: string[];
  className?: string;
  size?: 'sm' | 'md';
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  steps,
  className,
  size = 'md',
}) => {
  const sizeConfig = {
    sm: { circle: 'w-7 h-7 text-xs', text: 'text-[11px]' },
    md: { circle: 'w-8 h-8 text-sm', text: 'text-xs' },
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'rounded-full flex items-center justify-center font-mono font-bold',
                    'border transition-colors duration-200',
                    sizeConfig[size].circle,
                    isCompleted && 'border-ecotribe-primary bg-ecotribe-primary text-black',
                    isCurrent && 'border-ecotribe-primary/50 bg-ecotribe-primary/15 text-ecotribe-primary',
                    !isCompleted && !isCurrent && 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-400 dark:text-white/30'
                  )}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNumber}
                </motion.div>
                {steps?.[index] && (
                  <span
                    className={cn(
                      'mt-2 font-mono font-bold text-center max-w-[80px]',
                      sizeConfig[size].text,
                      isCurrent ? 'text-black dark:text-white' : isCompleted ? 'text-black/50 dark:text-white/50' : 'text-black/30 dark:text-white/30'
                    )}
                  >
                    {steps[index]}
                  </span>
                )}
              </div>
              {index < totalSteps - 1 && (
                <div className="flex-1 h-px mx-3 bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="h-full bg-ecotribe-primary"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Progress;
