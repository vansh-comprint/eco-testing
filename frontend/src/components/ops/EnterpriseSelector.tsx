/**
 * Enterprise Selector Component
 * V3: Allows OPS Admin to toggle between enterprises
 * Shows in sidebar/header with enterprise details
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Search, Check, Globe, X } from 'lucide-react';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';

interface EnterpriseSelectorProps {
  compact?: boolean;
}

export function EnterpriseSelector({ compact = false }: EnterpriseSelectorProps) {
  const {
    enterprises,
    selectedEnterprise,
    selectedEnterpriseId,
    setSelectedEnterpriseId,
    isAllEnterprises,
    isLoading
  } = useOpsEnterprise();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter enterprises by search
  const filteredEnterprises = enterprises.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="px-3 py-2 animate-pulse">
        <div className="h-10 bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`interactive w-full flex items-center gap-3 px-3 py-2.5 border transition-all ${
          isOpen
            ? 'border-ecotribe-primary/50 bg-ecotribe-primary/10'
            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
        }`}
      >
        <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${
          isAllEnterprises
            ? 'border border-blue-500/30 bg-blue-500/10'
            : 'border border-ecotribe-primary/30 bg-ecotribe-primary/10'
        }`}>
          {isAllEnterprises ? (
            <Globe className="w-4 h-4 text-blue-400" />
          ) : (
            <Building2 className="w-4 h-4 text-ecotribe-primary" />
          )}
        </div>
        {!compact && (
          <div className="flex-1 text-left min-w-0">
            <p className="font-mono font-bold text-[9px] uppercase tracking-widest text-zinc-500">
              {isAllEnterprises ? 'Viewing' : 'Enterprise'}
            </p>
            <p className="font-display font-bold text-sm text-white truncate">
              {isAllEnterprises ? 'All Enterprises' : selectedEnterprise?.name || 'Select...'}
            </p>
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl max-h-[400px] overflow-hidden flex flex-col"
          >
            {/* Search */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search enterprises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/[0.02] border border-white/10 text-white font-display text-sm placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50"
                  autoFocus
                />
              </div>
            </div>

            {/* All Enterprises Option */}
            <button
              onClick={() => {
                setSelectedEnterpriseId(null);
                setIsOpen(false);
                setSearchQuery('');
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                isAllEnterprises
                  ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                  : 'hover:bg-white/[0.05] border-l-2 border-l-transparent'
              }`}
            >
              <div className="w-8 h-8 border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-display font-bold text-sm text-white">All Enterprises</p>
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wide">
                  {enterprises.length} total
                </p>
              </div>
              {isAllEnterprises && (
                <Check className="w-4 h-4 text-blue-400" />
              )}
            </button>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Enterprise List */}
            <div className="overflow-y-auto max-h-[280px]">
              {filteredEnterprises.length > 0 ? (
                filteredEnterprises.map((enterprise) => {
                  const isSelected = selectedEnterpriseId === enterprise.id;
                  return (
                    <button
                      key={enterprise.id}
                      onClick={() => {
                        setSelectedEnterpriseId(enterprise.id);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                        isSelected
                          ? 'bg-ecotribe-primary/10 border-l-2 border-l-ecotribe-primary'
                          : 'hover:bg-white/[0.05] border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 flex items-center justify-center ${
                        isSelected
                          ? 'border border-ecotribe-primary/30 bg-ecotribe-primary/10'
                          : 'border border-white/10 bg-white/5'
                      }`}>
                        <span className={`font-brand font-bold text-xs ${
                          isSelected ? 'text-ecotribe-primary' : 'text-zinc-400'
                        }`}>
                          {enterprise.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={`font-display font-bold text-sm truncate ${
                          isSelected ? 'text-ecotribe-primary' : 'text-white'
                        }`}>
                          {enterprise.name}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wide truncate">
                          {enterprise.contact_email || 'No email'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${
                          enterprise.status === 'active'
                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                        }`}>
                          {enterprise.status}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-ecotribe-primary" />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="font-mono text-xs text-zinc-500 uppercase tracking-wide">
                    No enterprises found
                  </p>
                </div>
              )}
            </div>

            {/* Clear Selection (if selected) */}
            {selectedEnterpriseId && (
              <div className="border-t border-white/10 p-3">
                <button
                  onClick={() => {
                    setSelectedEnterpriseId(null);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-white/10 bg-white/[0.02] text-zinc-400 font-mono text-xs uppercase tracking-widest hover:bg-white/[0.05] hover:text-white transition-all"
                >
                  <X className="w-3 h-3" />
                  Clear Selection
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EnterpriseSelector;
