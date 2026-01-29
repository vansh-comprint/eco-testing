import { motion } from 'framer-motion';
import { Grid3X3 } from 'lucide-react';
import { useThemeStore } from '@/stores';

interface MeshToggleProps {
  className?: string;
}

// Compact version for headers
export function MeshToggleCompact({ className = '' }: MeshToggleProps) {
  const { showMeshBackground, toggleMeshBackground, theme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleMeshBackground}
      className={`p-2 rounded-lg transition-all duration-300 ${
        showMeshBackground
          ? isDark
            ? 'bg-ecotribe-primary/10 text-ecotribe-primary border border-ecotribe-primary/20'
            : 'bg-ecotribe-light-primary/10 text-ecotribe-light-primary border border-ecotribe-light-primary/20'
          : isDark
            ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-ecotribe-primary border border-white/10'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-ecotribe-light-primary border border-slate-200'
      } ${className}`}
      aria-label={showMeshBackground ? 'Hide mesh background' : 'Show mesh background'}
      title={showMeshBackground ? 'Hide mesh background' : 'Show mesh background'}
    >
      <motion.div
        key={showMeshBackground ? 'on' : 'off'}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Grid3X3 className="w-5 h-5" />
      </motion.div>
    </button>
  );
}

export default MeshToggleCompact;
