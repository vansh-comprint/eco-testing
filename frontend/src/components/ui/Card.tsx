import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { glass, duration, hover as hoverStyles, text, borders } from '@/lib/design-tokens';

interface CardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'bordered' | 'highlight' | 'ghost' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variants = {
  default: glass.default,
  elevated: glass.elevated,
  bordered: `bg-white/70 dark:bg-zinc-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-800`,
  highlight: glass.highlight,
  ghost: glass.ghost,
  subtle: glass.subtle,
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hover ? { y: -2 } : undefined}
        transition={{ duration: duration.fast, ease: 'easeOut' }}
        className={cn(
          variants[variant],
          paddings[padding],
          hover && hoverStyles.card,
          hover && 'cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement> & { noBorder?: boolean }> = ({
  className,
  noBorder = false,
  children,
  ...props
}) => (
  <div
    className={cn(
      'pb-4',
      !noBorder && 'mb-4 border-b border-slate-200/80 dark:border-zinc-800',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' }> = ({
  className,
  as: Component = 'h3',
  children,
  ...props
}) => (
  <Component
    className={cn(
      'font-brand font-bold text-base uppercase tracking-wide',
      text.primary,
      className
    )}
    {...props}
  >
    {children}
  </Component>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p
    className={cn(
      'font-mono text-xs mt-1 leading-relaxed',
      text.secondary,
      className
    )}
    {...props}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      'mt-6 pt-4 border-t border-slate-200/80 dark:border-zinc-800 flex items-center gap-3',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export default Card;
