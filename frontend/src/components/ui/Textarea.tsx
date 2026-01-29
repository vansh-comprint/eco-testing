import React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block font-mono text-[10px] text-black/50 dark:text-white/50 uppercase tracking-widest"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10',
            'px-4 py-3 font-mono text-xs text-black dark:text-white min-h-[100px] resize-y',
            'placeholder:text-slate-400 dark:placeholder:text-white/30',
            'focus:outline-none focus:border-ecotribe-primary',
            'transition-colors duration-300',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error && 'border-red-500/50 dark:border-red-500/30 focus:border-red-500',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="font-mono text-[11px] text-slate-500 dark:text-white/40 uppercase tracking-wide">{hint}</p>
        )}
        {error && <p className="font-mono text-[11px] text-red-600 dark:text-red-400 uppercase tracking-wide">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
