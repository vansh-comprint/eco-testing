import React, { createContext, useContext, useState, useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
  layoutId: string;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  defaultValue: string;
  value?: string;
  children: React.ReactNode;
  className?: string;
  onChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, value, children, className, onChange }) => {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const layoutId = useId();

  const activeTab = value ?? internalTab;

  const handleSetActiveTab = (newValue: string) => {
    if (value === undefined) {
      setInternalTab(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleSetActiveTab, layoutId }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
}

export const TabsList: React.FC<TabsListProps> = ({ children, className, variant = 'default' }) => {
  const variants = {
    default: 'inline-flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10',
    pills: 'inline-flex items-center gap-2',
    underline: 'flex items-center gap-6 border-b border-slate-200 dark:border-white/10',
  };

  return (
    <div className={cn(variants[variant], className)} role="tablist">
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className,
  disabled = false,
}) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const { activeTab, setActiveTab, layoutId } = context;
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={cn(
        'relative px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider',
        'transition-colors duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ecotribe-primary/50',
        isActive ? 'text-black' : 'text-slate-500 dark:text-white/50 hover:text-black dark:hover:text-white',
        className
      )}
    >
      {isActive && (
        <motion.div
          layoutId={`tab-indicator-${layoutId}`}
          className="absolute inset-0 bg-ecotribe-primary rounded-md"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const { activeTab } = context;

  if (activeTab !== value) return null;

  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn('mt-4', className)}
    >
      {children}
    </motion.div>
  );
};

export default Tabs;
