/**
 * Org Branch Context
 * V3.2: Provides global branch selection for Org Admin portal
 * Allows Org Admin to filter IT Admin view by specific branches
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useBranches, useAuth } from '@/hooks';

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  status: string;
  it_admin_id?: string | null;
  it_admin_name?: string | null;
}

interface OrgBranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  isAllBranches: boolean;
  isLoading: boolean;
}

const OrgBranchContext = createContext<OrgBranchContextType | undefined>(undefined);

export function OrgBranchProvider({ children }: { children: ReactNode }) {
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';
  const { data: branches = [], isLoading } = useBranches(enterpriseId);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // Get selected branch object
  const selectedBranch = selectedBranchId
    ? branches.find((b: Branch) => b.id === selectedBranchId) || null
    : null;

  // Check if viewing all branches
  const isAllBranches = selectedBranchId === null;

  // Persist selection to sessionStorage
  useEffect(() => {
    if (selectedBranchId) {
      sessionStorage.setItem('org_selected_branch', selectedBranchId);
    } else {
      sessionStorage.removeItem('org_selected_branch');
    }
  }, [selectedBranchId]);

  // Restore selection from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('org_selected_branch');
    if (stored && branches.some((b: Branch) => b.id === stored)) {
      setSelectedBranchId(stored);
    }
  }, [branches]);

  return (
    <OrgBranchContext.Provider
      value={{
        branches,
        selectedBranch,
        selectedBranchId,
        setSelectedBranchId,
        isAllBranches,
        isLoading,
      }}
    >
      {children}
    </OrgBranchContext.Provider>
  );
}

export function useOrgBranch() {
  const context = useContext(OrgBranchContext);
  if (context === undefined) {
    throw new Error('useOrgBranch must be used within an OrgBranchProvider');
  }
  return context;
}
