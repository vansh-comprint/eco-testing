/**
 * IT Admin Branch Selector Component
 * Compact dropdown for branch scoping in the sidebar
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useITAdminBranch } from '@/contexts/ITAdminBranchContext';

export function ITAdminBranchSelector() {
  const {
    branches,
    selectedBranch,
    selectedBranchId,
    setSelectedBranchId,
    isAllBranches,
    isLoading
  } = useITAdminBranch();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading || branches.length === 0) {
    return null;
  }

  const displayLabel = isAllBranches
    ? 'All Branches'
    : selectedBranch?.branch_name || 'Select...';

  return (
    <div className="px-3 pb-1">
      <p className="px-2.5 pb-1 font-mono font-bold text-[9px] uppercase tracking-widest text-black/30 dark:text-zinc-600">
        Branch
      </p>
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-all ${
          isOpen
            ? 'bg-ecotribe-primary/10 border-ecotribe-primary/40'
            : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
        } border`}
      >
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isAllBranches ? 'bg-blue-400' : 'bg-ecotribe-primary'
        }`} />
        <span className="font-mono font-bold text-[11px] text-white/90 truncate flex-1 uppercase tracking-wide">
          {displayLabel}
        </span>
        <ChevronDown className={`w-3 h-3 text-white/40 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 border border-white/20 bg-zinc-900 shadow-2xl max-h-[240px] overflow-y-auto">
          {/* All Branches option */}
          <button
            onClick={() => {
              setSelectedBranchId(null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 text-left transition-all ${
              isAllBranches
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-white/70 hover:bg-white/[0.05]'
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            <span className="font-mono text-[11px] uppercase tracking-wide flex-1">All Branches</span>
            {isAllBranches && <Check className="w-3 h-3" />}
          </button>

          <div className="border-t border-white/5" />

          {/* Branch list */}
          {branches.map((branch: { id: string; branch_name: string; branch_code: string; status: string }) => {
            const isSelected = selectedBranchId === branch.id;
            return (
              <button
                key={branch.id}
                onClick={() => {
                  setSelectedBranchId(branch.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-left transition-all ${
                  isSelected
                    ? 'bg-ecotribe-primary/10 text-ecotribe-primary'
                    : 'text-white/70 hover:bg-white/[0.05]'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isSelected ? 'bg-ecotribe-primary' : 'bg-white/20'
                }`} />
                <span className="font-mono text-[11px] uppercase tracking-wide flex-1 truncate">
                  {branch.branch_name}
                </span>
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
}

export default ITAdminBranchSelector;
