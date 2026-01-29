import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, checked, onChange, disabled, id, size = 'md', ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s/g, '-');

    const sizeConfig = {
      sm: { box: 'w-4 h-4', icon: 'w-2.5 h-2.5', label: 'text-sm', desc: 'text-xs' },
      md: { box: 'w-[18px] h-[18px]', icon: 'w-3 h-3', label: 'text-sm', desc: 'text-xs' },
    };

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          'flex items-start gap-2.5 cursor-pointer group',
          disabled && 'cursor-not-allowed opacity-40',
          className
        )}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'rounded border transition-all duration-150',
              'flex items-center justify-center',
              sizeConfig[size].box,
              checked
                ? 'bg-ecotribe-primary border-ecotribe-primary'
                : 'bg-white/40 dark:bg-black/40 border-black/20 dark:border-white/20 group-hover:border-ecotribe-primary/50'
            )}
          >
            <motion.div
              initial={false}
              animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
              transition={{ duration: 0.1 }}
            >
              <Check className={cn(sizeConfig[size].icon, 'text-black')} strokeWidth={3} />
            </motion.div>
          </div>
        </div>
        {(label || description) && (
          <div className="pt-px">
            {label && (
              <span className={cn('font-mono text-black dark:text-white', sizeConfig[size].label)}>
                {label}
              </span>
            )}
            {description && (
              <p className={cn('font-mono text-black/40 dark:text-white/40 mt-0.5', sizeConfig[size].desc)}>{description}</p>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
