/**
 * OPS Enterprise Context
 * V3: Provides global enterprise selection for OPS Admin portal
 * Allows OPS Admin to toggle between enterprises and view their data
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useEnterprises } from '@/hooks';
import type { EnterpriseResponse } from '@/lib/api/enterprises';

interface OpsEnterpriseContextType {
  enterprises: EnterpriseResponse[];
  selectedEnterprise: EnterpriseResponse | null;
  selectedEnterpriseId: string | null;
  setSelectedEnterpriseId: (id: string | null) => void;
  isAllEnterprises: boolean;
  isLoading: boolean;
}

const OpsEnterpriseContext = createContext<OpsEnterpriseContextType | undefined>(undefined);

export function OpsEnterpriseProvider({ children }: { children: ReactNode }) {
  const { data: enterprises = [], isLoading } = useEnterprises();
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string | null>(null);

  // Get selected enterprise object
  const selectedEnterprise = selectedEnterpriseId
    ? enterprises.find(e => e.id === selectedEnterpriseId) || null
    : null;

  // Check if viewing all enterprises
  const isAllEnterprises = selectedEnterpriseId === null;

  // Persist selection to sessionStorage
  useEffect(() => {
    if (selectedEnterpriseId) {
      sessionStorage.setItem('ops_selected_enterprise', selectedEnterpriseId);
    } else {
      sessionStorage.removeItem('ops_selected_enterprise');
    }
  }, [selectedEnterpriseId]);

  // Restore selection from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('ops_selected_enterprise');
    if (stored && enterprises.some(e => e.id === stored)) {
      setSelectedEnterpriseId(stored);
    }
  }, [enterprises]);

  return (
    <OpsEnterpriseContext.Provider
      value={{
        enterprises,
        selectedEnterprise,
        selectedEnterpriseId,
        setSelectedEnterpriseId,
        isAllEnterprises,
        isLoading,
      }}
    >
      {children}
    </OpsEnterpriseContext.Provider>
  );
}

export function useOpsEnterprise() {
  const context = useContext(OpsEnterpriseContext);
  if (context === undefined) {
    throw new Error('useOpsEnterprise must be used within an OpsEnterpriseProvider');
  }
  return context;
}
