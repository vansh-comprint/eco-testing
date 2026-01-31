import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Check, Grid3X3, Crown, Shield, Briefcase, DollarSign, User, Truck, MapPin } from 'lucide-react';
import { useThemeStore } from '@/stores';
import { useAuth } from '@/hooks';
import type { UserRole } from '@/types';

const roles: { role: UserRole; label: string; icon: React.ReactNode; color: string; path: string }[] = [
  { role: 'super_admin', label: 'Super Admin', icon: <Crown className="w-4 h-4" />, color: 'bg-purple-500', path: '/super' },
  { role: 'ops_admin', label: 'OPS Admin', icon: <Shield className="w-4 h-4" />, color: 'bg-blue-500', path: '/ops' },
  { role: 'org_admin', label: 'Org Admin', icon: <DollarSign className="w-4 h-4" />, color: 'bg-yellow-500', path: '/org-admin' },
  { role: 'it_admin', label: 'IT Admin', icon: <Briefcase className="w-4 h-4" />, color: 'bg-ecotribe-primary', path: '/admin' },
  { role: 'employee', label: 'Employee', icon: <User className="w-4 h-4" />, color: 'bg-orange-500', path: '/check-in' },
  { role: 'logistics_admin', label: 'Logistics Admin', icon: <Truck className="w-4 h-4" />, color: 'bg-teal-500', path: '/logistics-admin' },
  { role: 'logistics_user', label: 'Logistics User', icon: <MapPin className="w-4 h-4" />, color: 'bg-cyan-500', path: '/logistics' },
];

export function RoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  // V3: Use React Query hook for auth (switchRole includes navigation)
  const { user, switchRole, isAuthenticated } = useAuth();
  const { showMeshBackground, toggleMeshBackground } = useThemeStore();

  // Only show in development and when authenticated
  if (import.meta.env.PROD || !isAuthenticated) return null;

  const currentRoleInfo = roles.find(r => r.role === user?.role);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-2 w-56 bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Dev: Switch Role</p>
            </div>

            {/* Role List */}
            <div className="py-1 max-h-64 overflow-y-auto">
              {roles.map(({ role, label, icon, color, path }) => (
                <button
                  key={role}
                  onClick={() => {
                    // V3: switchRole from useAuth handles navigation automatically
                    switchRole(role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    user?.role === role
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <span className={`w-7 h-7 ${color} flex items-center justify-center text-white`}>
                    {icon}
                  </span>
                  <span className="font-display text-sm font-medium flex-1">{label}</span>
                  {user?.role === role && (
                    <Check className="w-4 h-4 text-ecotribe-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Mesh Toggle */}
            <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/80">
              <button
                onClick={toggleMeshBackground}
                className="w-full flex items-center gap-3 text-left group"
              >
                <span className={`w-7 h-7 flex items-center justify-center border ${showMeshBackground ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary' : 'border-zinc-700 bg-zinc-800 text-zinc-500'} transition-colors`}>
                  <Grid3X3 className="w-4 h-4" />
                </span>
                <span className="flex-1">
                  <span className={`font-display text-sm font-medium ${showMeshBackground ? 'text-white' : 'text-zinc-400'}`}>
                    Mesh Background
                  </span>
                  <span className="block font-mono text-[10px] text-zinc-600 uppercase tracking-wider">
                    {showMeshBackground ? 'Enabled' : 'Disabled'}
                  </span>
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 ${currentRoleInfo?.color || 'bg-zinc-800'} text-white shadow-lg border border-white/10 transition-all`}
      >
        <span className="w-6 h-6 flex items-center justify-center">
          {currentRoleInfo?.icon || <User className="w-4 h-4" />}
        </span>
        <span className="font-display text-sm font-bold uppercase tracking-wide">
          {currentRoleInfo?.label || 'Select Role'}
        </span>
        <ChevronUp
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}
        />
      </motion.button>
    </div>
  );
}
