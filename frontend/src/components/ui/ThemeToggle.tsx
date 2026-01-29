import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const handleToggle = () => {
    toggleTheme();
    // Also update body classes
    if (isDark) {
      document.body.classList.remove('bg-ecotribe-dark', 'text-white');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    } else {
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-ecotribe-dark', 'text-white');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
        isDark
          ? 'bg-zinc-800 border border-white/10'
          : 'bg-slate-200 border border-slate-300'
      } ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Track Icons */}
      <Sun className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-opacity duration-300 ${
        isDark ? 'opacity-30 text-zinc-500' : 'opacity-100 text-amber-500'
      }`} />
      <Moon className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-opacity duration-300 ${
        isDark ? 'opacity-100 text-ecotribe-primary' : 'opacity-30 text-slate-400'
      }`} />

      {/* Sliding Knob */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 w-6 h-6 rounded-full shadow-md flex items-center justify-center ${
          isDark
            ? 'left-[calc(100%-26px)] bg-ecotribe-primary'
            : 'left-0.5 bg-white'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-black" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </motion.div>
    </button>
  );
}

// Compact version for headers
export function ThemeToggleCompact({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const handleToggle = () => {
    toggleTheme();
    if (isDark) {
      document.body.classList.remove('bg-ecotribe-dark', 'text-white');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
    } else {
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.classList.add('bg-ecotribe-dark', 'text-white');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-all duration-300 ${
        isDark
          ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-ecotribe-primary border border-white/10'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-ecotribe-light-primary border border-slate-200'
      } ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 90, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </motion.div>
    </button>
  );
}

export default ThemeToggle;
