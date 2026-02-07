import React from 'react';
import { cn } from '@/lib/utils';
import { text, focus as focusStyles } from '@/lib/design-tokens';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode; // Alias for leftIcon
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-4 text-sm',
  lg: 'h-14 px-5 text-base',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, leftIcon, rightIcon, hint, id, size = 'md', required, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    const actualLeftIcon = leftIcon || icon;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block font-mono text-xs uppercase tracking-wider',
              text.secondary
            )}
          >
            {label}
            {required && <span className="text-lime-600 dark:text-lime-400 ml-1">*</span>}
          </label>
        )}
        <div className="relative group">
          {actualLeftIcon && (
            <div className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2',
              text.muted,
              'group-focus-within:text-lime-600 dark:group-focus-within:text-lime-400',
              'transition-colors duration-200'
            )}>
              {actualLeftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Glass background with brand tint
              'w-full',
              'bg-white/80 dark:bg-zinc-900/80',
              'backdrop-blur-sm',
              'border border-slate-200/80 dark:border-zinc-700',
              // Text colors - high contrast
              text.primary,
              'placeholder:text-slate-400 dark:placeholder:text-zinc-500',
              // Focus state with brand color
              'focus:outline-none',
              'focus:border-lime-500 dark:focus:border-lime-400',
              'focus:ring-2 focus:ring-lime-500/20 dark:focus:ring-lime-400/20',
              'focus:bg-white dark:focus:bg-zinc-900',
              // Transition
              'transition-all duration-200',
              // Disabled state
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'disabled:bg-slate-100 dark:disabled:bg-zinc-800',
              // Sizes
              sizes[size],
              actualLeftIcon && 'pl-12',
              rightIcon && 'pr-12',
              // Error state
              error && 'border-red-500/50 dark:border-red-400/50 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            required={required}
            {...props}
          />
          {rightIcon && (
            <div className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2',
              text.muted,
              'group-focus-within:text-lime-600 dark:group-focus-within:text-lime-400',
              'transition-colors duration-200'
            )}>
              {rightIcon}
            </div>
          )}
        </div>
        {hint && !error && (
          <p className={cn(
            'text-xs',
            text.muted
          )}>
            {hint}
          </p>
        )}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
