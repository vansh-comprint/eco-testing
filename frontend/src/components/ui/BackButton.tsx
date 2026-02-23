import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  /** Explicit route to navigate to. If omitted, uses browser back (navigate(-1)). */
  to?: string;
  /** Label displayed next to the chevron. Defaults to "Back". */
  label?: string;
  /** Additional CSS classes on the outer button */
  className?: string;
}

/**
 * Standard back-navigation button — Style F variant.
 * Uses browser back by default; pass `to` for an explicit route.
 */
export function BackButton({ to, label = 'Back', className = '' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={`flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary mb-3 transition-colors ${className}`}
    >
      <ChevronLeft className="w-4 h-4" />
      <span className="text-xs font-mono font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

export default BackButton;
