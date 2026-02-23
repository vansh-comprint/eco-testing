/**
 * BranchSelector - Smart branch selection with inline creation
 *
 * Features:
 * - Searchable dropdown of branches
 * - Quick "Add New Branch" inline creation
 * - Auto-select after creation
 * - Shows branch details (name, code, city)
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  ChevronDown,
  Plus,
  X,
  MapPin,
  Hash,
  Check,
  Phone,
  User,
} from 'lucide-react';
import { useBranches, useBranchesByITAdmin, useCreateBranch, type CreateBranchInput } from '@/hooks/useBranches';
import { Modal, ModalFooter } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  city: string;
  state: string;
  status: string;
  address_line1?: string;
}

interface BranchSelectorProps {
  enterpriseId: string;
  userId?: string; // For IT Admin filtered view
  value?: string | null;
  onChange: (branchId: string | null, branch?: Branch) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  showAddNew?: boolean;
  filterActive?: boolean; // Only show active branches
}

export function BranchSelector({
  enterpriseId,
  userId,
  value,
  onChange,
  placeholder = 'Select branch...',
  label,
  required = false,
  error,
  disabled = false,
  className,
  showAddNew = true,
  filterActive = true,
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  // Calculate menu position relative to viewport for portal rendering
  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  // Fetch branches - use IT Admin filter if userId provided
  const { data: allBranches = [], isLoading, refetch } = userId
    ? useBranchesByITAdmin(userId)
    : useBranches(enterpriseId);

  // Filter active branches if needed
  const branches = useMemo(() => {
    if (!filterActive) return allBranches;
    return allBranches.filter((b: Branch) => b.status === 'active');
  }, [allBranches, filterActive]);

  // Filter branches based on search
  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const query = searchQuery.toLowerCase();
    return branches.filter((branch: Branch) =>
      branch.branch_name?.toLowerCase().includes(query) ||
      branch.branch_code?.toLowerCase().includes(query) ||
      branch.city?.toLowerCase().includes(query)
    );
  }, [branches, searchQuery]);

  // Get selected branch
  const selectedBranch = useMemo(
    () => branches.find((branch: Branch) => branch.id === value),
    [branches, value]
  );

  // Close dropdown on outside click (check both trigger and portal menu)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideDropdown = dropdownRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);
      if (!isInsideDropdown && !isInsideMenu) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position on scroll/resize when open
  useEffect(() => {
    if (isOpen) {
      updateMenuPosition();
      window.addEventListener('scroll', updateMenuPosition, true);
      window.addEventListener('resize', updateMenuPosition);
      return () => {
        window.removeEventListener('scroll', updateMenuPosition, true);
        window.removeEventListener('resize', updateMenuPosition);
      };
    }
  }, [isOpen, updateMenuPosition]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (branch: Branch) => {
    onChange(branch.id, branch);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleAddNewClick = () => {
    setShowAddModal(true);
    setIsOpen(false);
  };

  const handleBranchCreated = async (newBranch: Branch) => {
    await refetch();
    onChange(newBranch.id, newBranch);
    setShowAddModal(false);
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-600 dark:text-white/70 mb-1.5">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div ref={dropdownRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              if (!isOpen) updateMenuPosition();
              setIsOpen(!isOpen);
            }
          }}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between gap-2',
            'px-4 py-3 bg-slate-50 dark:bg-white/[0.02]',
            'border text-left font-mono text-sm',
            'transition-all duration-200',
            disabled && 'opacity-50 cursor-not-allowed',
            error
              ? 'border-red-500/50'
              : isOpen
              ? 'border-ecotribe-primary/50'
              : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20',
          )}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Building2 className={cn(
              'w-4 h-4 flex-shrink-0',
              selectedBranch ? 'text-ecotribe-primary' : 'text-zinc-500'
            )} />
            {selectedBranch ? (
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 dark:text-white truncate">{selectedBranch.branch_name}</p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {selectedBranch.branch_code} · {selectedBranch.city}
                </p>
              </div>
            ) : (
              <span className="text-zinc-500">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedBranch && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3 h-3 text-zinc-500" />
              </button>
            )}
            <ChevronDown className={cn(
              'w-4 h-4 text-zinc-500 transition-transform',
              isOpen && 'rotate-180'
            )} />
          </div>
        </button>

      </div>

      {/* Dropdown - rendered via portal to escape overflow constraints */}
      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
            className="z-[9999] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-xl max-h-80 overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-slate-200 dark:border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search branches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-ecotribe-primary/50"
                />
              </div>
            </div>

            {/* Branch List */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                  Loading branches...
                </div>
              ) : filteredBranches.length === 0 ? (
                <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                  {searchQuery ? 'No branches found' : 'No branches yet'}
                </div>
              ) : (
                filteredBranches.map((branch: Branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleSelect(branch)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 text-left',
                      'hover:bg-slate-100 dark:hover:bg-white/5 transition-colors',
                      value === branch.id && 'bg-ecotribe-primary/10'
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white font-medium truncate">
                        {branch.branch_name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className="font-mono">{branch.branch_code}</span>
                        <span>·</span>
                        <span className="truncate">{branch.city}, {branch.state}</span>
                      </div>
                    </div>
                    {value === branch.id && (
                      <Check className="w-4 h-4 text-ecotribe-primary flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Add New Button */}
            {showAddNew && (
              <div className="border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleAddNewClick}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-ecotribe-primary/10 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-ecotribe-primary/20 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-ecotribe-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-ecotribe-primary font-medium">
                      Add New Branch
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Create a new branch location
                    </p>
                  </div>
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}

      {/* Add Branch Modal - rendered via portal to escape stacking contexts */}
      {showAddModal && createPortal(
        <AddBranchModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          enterpriseId={enterpriseId}
          onCreated={handleBranchCreated}
        />,
        document.body
      )}
    </div>
  );
}

// ============================================
// Add Branch Modal (Inline Creation)
// ============================================

interface AddBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  enterpriseId: string;
  onCreated: (branch: Branch) => void;
}

function AddBranchModal({
  isOpen,
  onClose,
  enterpriseId,
  onCreated,
}: AddBranchModalProps) {
  const createMutation = useCreateBranch();
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    address_line1: '',
    city: '',
    state: '',
    pin_code: '',
    site_contact_person: '',
    site_contact_phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    // Auto-uppercase branch code
    if (field === 'branch_code') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.branch_name.trim()) newErrors.branch_name = 'Branch name is required';
    if (!formData.branch_code.trim()) {
      newErrors.branch_code = 'Branch code is required';
    } else if (!/^[A-Z0-9]{1,10}$/.test(formData.branch_code)) {
      newErrors.branch_code = 'Code must be 1-10 alphanumeric characters';
    }
    if (!formData.address_line1.trim()) newErrors.address_line1 = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pin_code.trim()) {
      newErrors.pin_code = 'PIN code is required';
    } else if (!/^\d{6}$/.test(formData.pin_code)) {
      newErrors.pin_code = 'PIN code must be 6 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling through React portal to outer form (e.g. BatchCreate)
    if (!validate()) return;

    try {
      const input: CreateBranchInput = {
        enterprise_id: enterpriseId,
        branch_name: formData.branch_name.trim(),
        branch_code: formData.branch_code.trim(),
        address_line1: formData.address_line1.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pin_code: formData.pin_code.trim(),
        site_contact_person: formData.site_contact_person.trim() || undefined,
        site_contact_phone: formData.site_contact_phone.trim() || undefined,
      };

      const newBranch = await createMutation.mutateAsync(input);

      // Reset form
      setFormData({
        branch_name: '',
        branch_code: '',
        address_line1: '',
        city: '',
        state: '',
        pin_code: '',
        site_contact_person: '',
        site_contact_phone: '',
      });

      onCreated(newBranch as Branch);
    } catch (error: unknown) {
      console.error('Failed to create branch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create branch. Please try again.';
      setErrors({ submit: errorMessage });
    }
  };

  const handleClose = () => {
    setFormData({
      branch_name: '',
      branch_code: '',
      address_line1: '',
      city: '',
      state: '',
      pin_code: '',
      site_contact_person: '',
      site_contact_phone: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Branch"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Info */}
        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300">
          <Building2 className="w-4 h-4 flex-shrink-0" />
          <p className="font-mono text-xs">
            Create a new branch location. You can add more details later.
          </p>
        </div>

        {/* Branch Name & Code (Required) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Branch Name"
            placeholder="Headquarters"
            value={formData.branch_name}
            onChange={(e) => handleChange('branch_name', e.target.value)}
            error={errors.branch_name}
            required
            icon={<Building2 className="w-4 h-4" />}
          />
          <Input
            label="Branch Code"
            placeholder="HQ01"
            value={formData.branch_code}
            onChange={(e) => handleChange('branch_code', e.target.value)}
            error={errors.branch_code}
            required
            icon={<Hash className="w-4 h-4" />}
          />
        </div>

        {/* Address */}
        <Input
          label="Address"
          placeholder="123 Business Park, Sector 5"
          value={formData.address_line1}
          onChange={(e) => handleChange('address_line1', e.target.value)}
          error={errors.address_line1}
          required
          icon={<MapPin className="w-4 h-4" />}
        />

        {/* City, State, PIN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="City"
            placeholder="Mumbai"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            error={errors.city}
            required
          />
          <Input
            label="State"
            placeholder="Maharashtra"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            error={errors.state}
            required
          />
          <Input
            label="PIN Code"
            placeholder="400001"
            value={formData.pin_code}
            onChange={(e) => handleChange('pin_code', e.target.value)}
            error={errors.pin_code}
            required
          />
        </div>

        {/* Site Contact (Optional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Site Contact Person"
            placeholder="John Doe"
            value={formData.site_contact_person}
            onChange={(e) => handleChange('site_contact_person', e.target.value)}
            icon={<User className="w-4 h-4" />}
          />
          <Input
            label="Site Contact Phone"
            placeholder="+91 98765 43210"
            value={formData.site_contact_phone}
            onChange={(e) => handleChange('site_contact_phone', e.target.value)}
            icon={<Phone className="w-4 h-4" />}
          />
        </div>

        {/* Error */}
        {errors.submit && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Actions */}
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Create Branch
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default BranchSelector;
