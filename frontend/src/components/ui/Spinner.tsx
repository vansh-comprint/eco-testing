import { cn } from '@/lib/utils';
import { iconSize } from '@/lib/design-tokens';

export interface SpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Color variant */
  variant?: 'default' | 'primary' | 'light' | 'dark';
}

const sizeMap = {
  xs: iconSize.xs,
  sm: iconSize.sm,
  md: iconSize.md,
  lg: iconSize.lg,
  xl: iconSize.xl,
} as const;

/**
 * Unified loading spinner component
 * Replaces all inline spinner implementations across the app
 */
export function Spinner({
  size = 'md',
  className,
  variant = 'default'
}: SpinnerProps) {
  const variantClasses = {
    default: 'border-slate-300 dark:border-white/20 border-t-slate-600 dark:border-t-white/70',
    primary: 'border-ecotribe-primary/30 border-t-ecotribe-primary',
    light: 'border-white/30 border-t-white',
    dark: 'border-black/20 border-t-black',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-spin rounded-full border-2',
        sizeMap[size],
        variantClasses[variant],
        className
      )}
    />
  );
}

/**
 * SVG-based spinner for more complex use cases
 */
export function SpinnerSVG({
  size = 'md',
  className
}: Omit<SpinnerProps, 'variant'>) {
  return (
    <svg
      className={cn(sizeMap[size], 'animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Full-page loading spinner with optional message
 */
export function LoadingOverlay({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-overlay flex items-center justify-center',
        'bg-white/80 dark:bg-black/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" variant="primary" />
        <p className="text-sm font-medium text-slate-600 dark:text-white/60">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Inline loading indicator for buttons
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <Spinner
      size="sm"
      variant="dark"
      className={cn('mr-2', className)}
    />
  );
}

export default Spinner;
