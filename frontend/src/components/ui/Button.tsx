import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { focus, duration, hover as hoverStyles } from '@/lib/design-tokens';
import { SpinnerSVG } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  pill?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-lime-500 text-black font-brand font-bold uppercase tracking-wider
    hover:bg-lime-400 hover:shadow-[0_0_20px_rgba(132,204,22,0.3)]
    active:bg-lime-600
    transition-all duration-200
  `,
  secondary: `
    bg-white/70 dark:bg-zinc-800/70
    backdrop-blur-sm
    border border-lime-500/20 dark:border-lime-400/15
    text-slate-800 dark:text-zinc-100
    font-semibold uppercase tracking-wider
    hover:border-lime-500/40 dark:hover:border-lime-400/30
    hover:bg-lime-50/50 dark:hover:bg-lime-500/10
    transition-all duration-200
  `,
  ghost: `
    bg-transparent
    text-slate-600 dark:text-zinc-400
    font-medium uppercase tracking-wider
    hover:bg-lime-500/8 dark:hover:bg-lime-500/10
    hover:text-lime-700 dark:hover:text-lime-400
    transition-colors duration-200
  `,
  danger: `
    bg-red-50/80 dark:bg-red-500/10
    border border-red-500/25 dark:border-red-400/20
    text-red-700 dark:text-red-400
    font-semibold uppercase tracking-wider
    hover:bg-red-100/80 dark:hover:bg-red-500/15
    hover:border-red-500/40 dark:hover:border-red-400/30
    transition-all duration-200
  `,
  outline: `
    bg-transparent
    border border-slate-300 dark:border-zinc-700
    text-slate-700 dark:text-zinc-300
    font-semibold uppercase tracking-wider
    hover:border-lime-500 dark:hover:border-lime-400
    hover:text-lime-600 dark:hover:text-lime-400
    transition-colors duration-200
  `,
  subtle: `
    bg-lime-50/80 dark:bg-lime-500/10
    text-lime-700 dark:text-lime-400
    font-semibold uppercase tracking-wider
    hover:bg-lime-100/80 dark:hover:bg-lime-500/15
    transition-colors duration-200
  `,
};

const sizes: Record<ButtonSize, string> = {
  xs: 'h-8 px-4 text-[10px] gap-1.5',
  sm: 'h-9 px-5 text-xs gap-2',
  md: 'h-11 px-6 text-xs gap-2',
  lg: 'h-14 px-8 text-sm gap-3',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      pill = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ duration: duration.fastest }}
        className={cn(
          'relative inline-flex items-center justify-center',
          pill ? 'rounded-full' : 'btn-chamfer',
          focus.ring,
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <SpinnerSVG size="md" />
            <span className="ml-2">Processing...</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
