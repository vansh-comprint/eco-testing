import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useBranchesByITAdmin, useAuth } from '@/hooks';

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  status: string;
  it_admin_id?: string | null;
  it_admin_name?: string | null;
}

interface ITAdminBranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
  isAllBranches: boolean;
  isLoading: boolean;
}

export const ITAdminBranchContext = createContext<ITAdminBranchContextType | undefined>(undefined);

export function ITAdminBranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || '';
  const { data: branches = [], isLoading } = useBranchesByITAdmin(userId);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const selectedBranch = selectedBranchId
    ? branches.find((b: Branch) => b.id === selectedBranchId) || null
    : null;

  const isAllBranches = selectedBranchId === null;

  // Persist selected branch to sessionStorage
  useEffect(() => {
    if (selectedBranchId) {
      sessionStorage.setItem('it_admin_selected_branch', selectedBranchId);
    } else {
      sessionStorage.removeItem('it_admin_selected_branch');
    }
  }, [selectedBranchId]);

  // Restore selected branch from sessionStorage, or auto-select when only one branch
  useEffect(() => {
    const stored = sessionStorage.getItem('it_admin_selected_branch');
    if (stored && branches.some((b: Branch) => b.id === stored)) {
      setSelectedBranchId(stored);
    } else if (branches.length === 1) {
      // Only auto-select when there is exactly one branch.
      // For multiple branches, default to null (all branches) so batches from
      // any managed branch are visible without the user needing to switch.
      setSelectedBranchId(branches[0].id);
    }
  }, [branches]);

  return (
    <ITAdminBranchContext.Provider value={{ branches, selectedBranch, selectedBranchId, setSelectedBranchId, isAllBranches, isLoading }}>
      {children}
    </ITAdminBranchContext.Provider>
  );
}

export function useITAdminBranch() {
  const context = useContext(ITAdminBranchContext);
  if (context === undefined) {
    throw new Error('useITAdminBranch must be used within an ITAdminBranchProvider');
  }
  return context;
}
