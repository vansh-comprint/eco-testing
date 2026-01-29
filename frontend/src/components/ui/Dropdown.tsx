import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-10 px-3 text-sm',
  lg: 'h-11 px-3.5 text-sm',
};

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select',
  label,
  error,
  disabled = false,
  size = 'md',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Update menu position when open
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

  // Handle click outside - check both dropdown container and portal menu
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    const isInsideDropdown = dropdownRef.current?.contains(target);
    const isInsideMenu = menuRef.current?.contains(target);

    if (!isInsideDropdown && !isInsideMenu) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Update position on scroll/resize
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

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        updateMenuPosition();
      }
      setIsOpen(!isOpen);
    }
  };

  // Render dropdown menu in a portal
  const dropdownMenu = isOpen && createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.1 }}
        style={{
          position: 'absolute',
          top: menuPosition.top,
          left: menuPosition.left,
          width: menuPosition.width,
        }}
        className={cn(
          'z-[9999] rounded-lg',
          'bg-white dark:bg-zinc-900 backdrop-blur-xl border border-slate-200 dark:border-white/10',
          'shadow-xl',
          'max-h-56 overflow-y-auto',
          'py-1'
        )}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (!option.disabled) {
                onChange(option.value);
                setIsOpen(false);
              }
            }}
            disabled={option.disabled}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-left',
              'transition-colors duration-100',
              option.disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer',
              option.value === value && 'bg-black/5 dark:bg-white/5'
            )}
          >
            {option.icon && (
              <span className="text-black/50 dark:text-white/50 flex-shrink-0">{option.icon}</span>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono text-black dark:text-white block truncate">{option.label}</span>
              {option.description && (
                <span className="text-[11px] font-mono text-black/40 dark:text-white/40 block truncate">{option.description}</span>
              )}
            </div>
            {option.value === value && (
              <Check className="w-4 h-4 text-ecotribe-primary flex-shrink-0" />
            )}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>,
    document.body
  );

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      {label && (
        <label className="block font-mono text-[10px] text-black/50 dark:text-white/50 uppercase tracking-widest mb-2">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10',
          'text-left transition-all duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus:outline-none focus:border-ecotribe-primary',
          sizes[size],
          isOpen && 'border-ecotribe-primary bg-white/50 dark:bg-white/5',
          error && 'border-red-500/50 dark:border-red-500/30'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="text-black/60 dark:text-white/60 flex-shrink-0">{selectedOption.icon}</span>
          )}
          <span className={cn(
            'truncate font-mono text-xs',
            selectedOption ? 'text-black dark:text-white' : 'text-slate-400 dark:text-white/30'
          )}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-black/40 dark:text-white/40 transition-transform duration-150 flex-shrink-0',
            isOpen && 'rotate-180 text-ecotribe-primary'
          )}
        />
      </button>

      {dropdownMenu}

      {error && <p className="mt-1 font-mono text-[11px] text-red-600 dark:text-red-400 uppercase tracking-wide">{error}</p>}
    </div>
  );
};

export default Dropdown;
