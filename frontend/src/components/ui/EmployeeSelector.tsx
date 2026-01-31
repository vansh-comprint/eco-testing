/**
 * EmployeeSelector - Smart employee selection with inline creation
 *
 * Features:
 * - Searchable dropdown of employees
 * - Quick "Add New Employee" inline creation
 * - Auto-select after creation
 * - Shows employee details (name, email, employee ID, department)
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Search,
  ChevronDown,
  Plus,
  X,
  Mail,
  Phone,
  Building2,
  Hash,
  Check,
  UserPlus,
} from 'lucide-react';
import { useSubUsers, useCreateSubUser, type CreateSubUserInput } from '@/hooks/useEmployees';
import { Modal, ModalFooter } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employee_id?: string;
  department?: string;
  designation?: string;
}

interface EmployeeSelectorProps {
  enterpriseId: string;
  branchId?: string;
  value?: string | null;
  onChange: (employeeId: string | null, employee?: Employee) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  showAddNew?: boolean;
}

export function EmployeeSelector({
  enterpriseId,
  branchId,
  value,
  onChange,
  placeholder = 'Select employee...',
  label,
  required = false,
  error,
  disabled = false,
  className,
  showAddNew = true,
}: EmployeeSelectorProps) {
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

  // Fetch employees
  const { data: employees = [], isLoading, refetch } = useSubUsers(enterpriseId);
  const createMutation = useCreateSubUser();

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter((emp: Employee) =>
      emp.name?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.employee_id?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  // Get selected employee
  const selectedEmployee = useMemo(
    () => employees.find((emp: Employee) => emp.id === value),
    [employees, value]
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

  const handleSelect = (employee: Employee) => {
    onChange(employee.id, employee);
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

  const handleEmployeeCreated = async (newEmployee: Employee) => {
    // Refetch employees list
    await refetch();
    // Auto-select the new employee
    onChange(newEmployee.id, newEmployee);
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
            <User className={cn(
              'w-4 h-4 flex-shrink-0',
              selectedEmployee ? 'text-ecotribe-primary' : 'text-zinc-500'
            )} />
            {selectedEmployee ? (
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 dark:text-white truncate">{selectedEmployee.name}</p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {selectedEmployee.email}
                  {selectedEmployee.employee_id && ` · ${selectedEmployee.employee_id}`}
                </p>
              </div>
            ) : (
              <span className="text-zinc-500">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedEmployee && !disabled && (
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
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-ecotribe-primary/50"
                />
              </div>
            </div>

            {/* Employee List */}
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                  Loading employees...
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="px-4 py-8 text-center text-zinc-500 text-sm">
                  {searchQuery ? 'No employees found' : 'No employees yet'}
                </div>
              ) : (
                filteredEmployees.map((employee: Employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => handleSelect(employee)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 text-left',
                      'hover:bg-slate-100 dark:hover:bg-white/5 transition-colors',
                      value === employee.id && 'bg-ecotribe-primary/10'
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white font-medium truncate">
                        {employee.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className="truncate">{employee.email}</span>
                        {employee.department && (
                          <>
                            <span>·</span>
                            <span className="truncate">{employee.department}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {value === employee.id && (
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
                      Add New Employee
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Create a new employee record
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

      {/* Add Employee Modal - rendered via portal to escape stacking contexts */}
      {showAddModal && createPortal(
        <AddEmployeeModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          enterpriseId={enterpriseId}
          branchId={branchId}
          onCreated={handleEmployeeCreated}
        />,
        document.body
      )}
    </div>
  );
}

// ============================================
// Add Employee Modal (Inline Creation)
// ============================================

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  enterpriseId: string;
  branchId?: string;
  onCreated: (employee: Employee) => void;
}

function AddEmployeeModal({
  isOpen,
  onClose,
  enterpriseId,
  branchId,
  onCreated,
}: AddEmployeeModalProps) {
  const createMutation = useCreateSubUser();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    employee_id: '',
    department: '',
    designation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const input: CreateSubUserInput = {
        enterprise_id: enterpriseId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || undefined,
        employee_id: formData.employee_id.trim() || undefined,
        department: formData.department.trim() || undefined,
        designation: formData.designation.trim() || undefined,
      };

      const newEmployee = await createMutation.mutateAsync(input);

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        employee_id: '',
        department: '',
        designation: '',
      });

      onCreated(newEmployee as Employee);
    } catch (error) {
      console.error('Failed to create employee:', error);
      setErrors({ submit: 'Failed to create employee. Please try again.' });
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      employee_id: '',
      department: '',
      designation: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Employee"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Info */}
        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300">
          <UserPlus className="w-4 h-4 flex-shrink-0" />
          <p className="font-mono text-xs">
            Create a new employee. They will receive an email to set up their account.
          </p>
        </div>

        {/* Name & Email (Required) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            required
            icon={<User className="w-4 h-4" />}
          />
          <Input
            label="Email"
            type="email"
            placeholder="john@company.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            required
            icon={<Mail className="w-4 h-4" />}
          />
        </div>

        {/* Phone & Employee ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            icon={<Phone className="w-4 h-4" />}
          />
          <Input
            label="Employee ID"
            placeholder="EMP001"
            value={formData.employee_id}
            onChange={(e) => handleChange('employee_id', e.target.value)}
            icon={<Hash className="w-4 h-4" />}
          />
        </div>

        {/* Department & Designation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Department"
            placeholder="Engineering"
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
            icon={<Building2 className="w-4 h-4" />}
          />
          <Input
            label="Designation"
            placeholder="Software Engineer"
            value={formData.designation}
            onChange={(e) => handleChange('designation', e.target.value)}
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
            Create Employee
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default EmployeeSelector;
