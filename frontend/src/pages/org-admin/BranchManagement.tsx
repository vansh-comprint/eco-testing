/**
 * Branch Management Page - Org Admin Portal
 * V3.2: 1 Branch → 1 IT Admin, 1 IT Admin → Multiple Branches
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Users,
  Package,
  Laptop,
  Phone,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Upload,
  AlertTriangle,
  User
} from 'lucide-react';
import { useAuth, useBranches, useBranchesByITAdmin, useBranchSummary, useCreateBranch, useUpdateBranch, useDeleteBranch, useActiveITAdmins, useCheckBranchCodeExists } from '@/hooks';
import { PageHeader, Badge, Modal } from '@/components/ui';
import { text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';
import { validateBranchCode } from '@/lib/validations/branch';

// Types
interface ITAdmin {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Branch {
  id: string;
  enterprise_id: string;
  branch_name: string;
  branch_code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  pickup_point_description?: string;
  site_contact_person?: string;
  site_contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  status: 'active' | 'inactive' | 'needs_admin';
  it_admin_id?: string | null;
  it_admin?: ITAdmin | null;
  created_at: string;
  updated_at: string;
}

interface BranchSummary {
  branch_id: string;
  enterprise_id: string;
  branch_name: string;
  branch_code: string;
  city: string;
  state: string;
  branch_status: string;
  it_admin_id?: string;
  it_admin_name?: string;
  it_admin_email?: string;
  asset_count: number;
  total_batch_count: number;
  active_batch_count: number;
}

export function BranchManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enterprise, user } = useAuth();
  const enterpriseId = enterprise?.id || '';

  // Determine base path for navigation (IT Admin vs Org Admin)
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  // React Query hooks - IT Admin only sees their assigned branches
  const userId = user?.id || '';
  const { data: orgBranches = [], isLoading: orgLoading } = useBranches(isOrgAdmin ? enterpriseId : '');
  const { data: itBranches = [], isLoading: itLoading } = useBranchesByITAdmin(isOrgAdmin ? '' : userId);
  const branches = isOrgAdmin ? orgBranches : itBranches;
  const isLoading = isOrgAdmin ? orgLoading : itLoading;
  
  const { data: allBranchSummaries = [] } = useBranchSummary(enterpriseId);
  const { data: itAdmins = [] } = useActiveITAdmins(enterpriseId); // Only show active admins in dropdown

  // V3.2: Scope branch summaries to IT Admin's branches
  const myBranchIds = new Set(branches.map((b: Branch) => b.id));
  const branchSummaries = isOrgAdmin
    ? allBranchSummaries
    : allBranchSummaries.filter((s: BranchSummary) => myBranchIds.has(s.branch_id));
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();
  
  // Org Admin can fully manage branches; IT Admin can only create new ones
  const canManageBranches = isOrgAdmin;
  const canCreateBranches = true; // Both Org Admin and IT Admin can create branches

  // Filter branches by search
  const filteredBranches = branches.filter((branch: Branch) =>
    branch.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.branch_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get summary for a branch
  const getSummary = (branchId: string): BranchSummary | undefined => {
    return branchSummaries.find((s: BranchSummary) => s.branch_id === branchId);
  };

  // Stats
  const totalBranches = branches.length;
  const activeBranches = branches.filter((b: Branch) => b.status === 'active').length;
  const needsAdminBranches = branches.filter((b: Branch) => b.status === 'needs_admin').length;
  const totalAssets = branchSummaries.reduce((sum: number, s: BranchSummary) => sum + (s.asset_count || 0), 0);

  // Handlers
  const handleAddBranch = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (branchToDelete) {
      await deleteBranch.mutateAsync(branchToDelete.id);
      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    }
  };

  const handleBulkUpload = () => {
    navigate(`${basePath}/branches/upload`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-lime-500 mx-auto mb-4" />
          <p className={`font-display font-bold uppercase tracking-wide ${text.muted}`}>Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label={isOrgAdmin ? "Organization" : "My Branches"}
        title="Branch Management"
        subtitle={isOrgAdmin ? "Manage your enterprise branches and IT Admin assignments" : "View your assigned branches"}
        actions={
          canCreateBranches ? (
            <div className="flex items-center gap-3">
              {canManageBranches && (
                <button
                  type="button"
                  onClick={handleBulkUpload}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-lime-500/50 text-slate-700 dark:text-zinc-300 font-semibold text-sm uppercase tracking-wider transition-all"
                >
                  <Upload className={iconSize.md} />
                  Bulk Upload
                </button>
              )}
              <button
                type="button"
                onClick={handleAddBranch}
                className="flex items-center gap-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-semibold text-sm uppercase tracking-wider transition-all"
              >
                <Plus className={iconSize.md} />
                Add Branch
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Branches"
          value={totalBranches}
          icon={<Building2 className={iconSize.lg} />}
          accent="brand"
        />
        <StatCard
          label="Active"
          value={activeBranches}
          icon={<CheckCircle className={iconSize.lg} />}
          accent="success"
        />
        <StatCard
          label="Needs Admin"
          value={needsAdminBranches}
          icon={<AlertTriangle className={iconSize.lg} />}
          accent={needsAdminBranches > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Total Assets"
          value={totalAssets}
          icon={<Laptop className={iconSize.lg} />}
          accent="neutral"
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconSize.md} ${text.muted}`} />
          <input
            type="text"
            placeholder="Search branches by name, code, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/20"
          />
        </div>
      </div>

      {/* Branch Grid */}
      {filteredBranches.length === 0 ? (
        <EmptyState
          onAddBranch={handleAddBranch}
          onBulkUpload={handleBulkUpload}
          hasSearch={searchQuery.length > 0}
          canManage={canManageBranches}
          canCreate={canCreateBranches}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filteredBranches.map((branch: Branch, index: number) => {
              const summary = getSummary(branch.id);
              return (
                <motion.div
                  key={branch.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <BranchCard
                    branch={branch}
                    summary={summary}
                    onEdit={canManageBranches ? () => handleEditBranch(branch) : undefined}
                    onDelete={canManageBranches ? () => handleDeleteClick(branch) : undefined}
                    onClick={() => navigate(`${basePath}/branches/${branch.id}`)}
                    canManage={canManageBranches}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Branch Modal */}
      <BranchFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        branch={editingBranch}
        enterpriseId={enterpriseId}
        itAdmins={itAdmins}
        isOrgAdmin={isOrgAdmin}
        onSubmit={async (data) => {
          if (editingBranch) {
            await updateBranch.mutateAsync({ branchId: editingBranch.id, updates: data });
          } else {
            await createBranch.mutateAsync({ ...data, enterprise_id: enterpriseId });
          }
          setIsModalOpen(false);
        }}
        isLoading={createBranch.isPending || updateBranch.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        branch={branchToDelete}
        onConfirm={handleConfirmDelete}
        isLoading={deleteBranch.isPending}
      />
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  accent
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'brand' | 'success' | 'warning' | 'info' | 'neutral';
}) {
  const accentStyles = {
    brand: 'border-l-lime-500 text-lime-600 dark:text-lime-400',
    success: 'border-l-emerald-500 text-emerald-600 dark:text-emerald-400',
    warning: 'border-l-amber-500 text-amber-600 dark:text-amber-400',
    info: 'border-l-blue-500 text-blue-600 dark:text-blue-400',
    neutral: 'border-l-slate-400 text-slate-600 dark:text-zinc-400',
  };

  return (
    <div className={`bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 border-l-4 ${accentStyles[accent]} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className={accentStyles[accent].split(' ').slice(1).join(' ')}>{icon}</span>
      </div>
      <p className={`font-brand text-2xl font-bold ${text.primary}`}>{value}</p>
      <p className={`text-xs font-mono uppercase tracking-wider ${text.muted}`}>{label}</p>
    </div>
  );
}

// Branch Card Component - Compact Horizontal Layout
function BranchCard({
  branch,
  summary,
  onEdit,
  onDelete,
  onClick,
  canManage = true,
}: {
  branch: Branch;
  summary?: BranchSummary;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick: () => void;
  canManage?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  // Get status variant
  const getStatusVariant = () => {
    switch (branch.status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'needs_admin': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = () => {
    switch (branch.status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'needs_admin': return 'Needs Admin';
      default: return branch.status;
    }
  };

  return (
    <div 
      className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden group hover:border-lime-500/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Horizontal Layout */}
      <div className="flex items-stretch">
        {/* Left: Icon + Name */}
        <div className="flex items-center gap-3 px-4 py-3 border-r border-slate-100 dark:border-zinc-800 min-w-[200px]">
          <div className="w-10 h-10 bg-lime-500/10 border border-lime-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className={`${iconSize.lg} text-lime-600 dark:text-lime-400`} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-display font-bold text-sm ${text.primary} group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors truncate`}>
              {branch.branch_name}
            </h3>
            <p className={`font-mono text-[10px] ${text.muted}`}>{branch.branch_code}</p>
          </div>
        </div>

        {/* Middle: Location + IT Admin (responsive) */}
        <div className="flex-1 flex items-center gap-4 px-4 py-3">
          {/* Location */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin className={`w-3.5 h-3.5 ${text.muted} flex-shrink-0`} />
            <span className={`text-xs ${text.secondary} truncate`}>
              {branch.city}, {branch.state}
            </span>
          </div>

          {/* IT Admin - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2 min-w-0 flex-1">
            <User className={`w-3.5 h-3.5 ${branch.it_admin ? 'text-lime-600 dark:text-lime-400' : text.muted} flex-shrink-0`} />
            {branch.it_admin ? (
              <span className={`text-xs ${text.primary} truncate`}>{branch.it_admin.name}</span>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400">No Admin</span>
            )}
          </div>

          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-zinc-800">
              <Laptop className="w-3 h-3 text-lime-600 dark:text-lime-400" />
              <span className={`text-xs font-bold ${text.primary}`}>{summary?.asset_count || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-zinc-800">
              <Package className="w-3 h-3 text-blue-500" />
              <span className={`text-xs font-bold ${text.primary}`}>{summary?.active_batch_count || 0}</span>
            </div>
          </div>
        </div>

        {/* Right: Status + Actions */}
        <div className="flex items-center gap-3 px-4 py-3 border-l border-slate-100 dark:border-zinc-800">
          <Badge variant={getStatusVariant()} size="sm">
            {getStatusLabel()}
          </Badge>
          
          {canManage && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className={`p-1.5 ${hoverStyles.subtle} transition-colors`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-lg z-20">
                    <button
                      type="button"
                      onClick={() => { onEdit?.(); setShowMenu(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${hoverStyles.row}`}
                    >
                      <Edit className={iconSize.sm} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { onDelete?.(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className={iconSize.sm} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ onAddBranch, onBulkUpload, hasSearch, canManage = true, canCreate = true }: { onAddBranch: () => void; onBulkUpload: () => void; hasSearch: boolean; canManage?: boolean; canCreate?: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 py-16 text-center">
      <Building2 className={`${iconSize['2xl']} mx-auto mb-4 ${text.muted}`} />
      <h3 className={`font-display font-bold text-lg mb-2 ${text.primary}`}>
        {hasSearch ? 'No branches found' : (canManage || canCreate) ? 'No branches yet' : 'No branches assigned'}
      </h3>
      <p className={`text-sm mb-6 ${text.muted}`}>
        {hasSearch
          ? 'Try adjusting your search criteria'
          : canCreate
            ? 'Create your first branch to start managing assets'
            : 'Contact your Org Admin to get assigned to a branch'}
      </p>
      {!hasSearch && canCreate && (
        <div className="flex items-center justify-center gap-3">
          {canManage && (
            <button
              type="button"
              onClick={onBulkUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-lime-500/50 text-slate-700 dark:text-zinc-300 font-semibold text-sm uppercase tracking-wider transition-all"
            >
              <Upload className={iconSize.md} />
              Bulk Upload CSV
            </button>
          )}
          <button
            type="button"
            onClick={onAddBranch}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-semibold text-sm uppercase tracking-wider transition-all"
          >
            <Plus className={iconSize.md} />
            Add First Branch
          </button>
        </div>
      )}
    </div>
  );
}

// Branch Form Modal Component
function BranchFormModal({
  isOpen,
  onClose,
  branch,
  enterpriseId,
  itAdmins,
  isOrgAdmin = true,
  onSubmit,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  enterpriseId: string;
  itAdmins: ITAdmin[];
  isOrgAdmin?: boolean;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pin_code: '',
    site_contact_person: '',
    site_contact_phone: '',
    opening_hours: '',
    closing_hours: '',
    pickup_point_description: '',
    special_instructions: '',
    it_admin_id: '' as string | null,
  });

  // Generate time options in 30-minute intervals (6:00 AM - 11:00 PM)
  const timeOptions = (() => {
    const options: { value: string; label: string }[] = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (const minute of [0, 30]) {
        if (hour === 23 && minute === 30) continue; // Skip 11:30 PM
        const h24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const label = `${h12}:${minute.toString().padStart(2, '0')} ${period}`;
        options.push({ value: h24, label });
      }
    }
    return options;
  })();

  const [codeError, setCodeError] = useState<string | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Parse operating_hours string (e.g., "09:00 - 18:00") into opening/closing
  const parseOperatingHours = (hours: string | undefined) => {
    if (!hours) return { opening: '', closing: '' };
    const match = hours.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
    if (match) return { opening: match[1], closing: match[2] };
    return { opening: '', closing: '' };
  };

  // Reset form when modal opens or branch changes
  useEffect(() => {
    if (isOpen) {
      if (branch) {
        const { opening, closing } = parseOperatingHours(branch.operating_hours);
        setFormData({
          branch_name: branch.branch_name || '',
          branch_code: branch.branch_code || '',
          address_line1: branch.address_line1 || '',
          address_line2: branch.address_line2 || '',
          city: branch.city || '',
          state: branch.state || '',
          pin_code: branch.pin_code || '',
          site_contact_person: branch.site_contact_person || '',
          site_contact_phone: branch.site_contact_phone || '',
          opening_hours: opening,
          closing_hours: closing,
          pickup_point_description: branch.pickup_point_description || '',
          special_instructions: branch.special_instructions || '',
          it_admin_id: branch.it_admin_id || '',
        });
      } else {
        setFormData({
          branch_name: '',
          branch_code: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          pin_code: '',
          site_contact_person: '',
          site_contact_phone: '',
          opening_hours: '',
          closing_hours: '',
          pickup_point_description: '',
          special_instructions: '',
          it_admin_id: '',
        });
      }
      setCodeError(null);
      setValidationErrors({});
    }
  }, [isOpen, branch]);

  // Debounced code check via REST API
  const checkCodeUniqueness = useCallback(async (code: string) => {
    if (!code || code.length < 1) return;

    // Skip check if editing and code hasn't changed
    if (branch && code === branch.branch_code) {
      setCodeError(null);
      return;
    }

    setIsCheckingCode(true);
    try {
      const { branchesApi } = await import('@/lib/api/branches');
      const response = await branchesApi.checkCodeExists(enterpriseId, code.toUpperCase());
      if (response.data?.exists) {
        setCodeError('This code is already in use');
      } else {
        setCodeError(null);
      }
    } catch {
      // Ignore errors
    } finally {
      setIsCheckingCode(false);
    }
  }, [enterpriseId, branch]);

  // Validation helpers
  const validatePinCode = (value: string): string | null => {
    if (!value) return null; // Let required handle empty
    if (!/^\d{6}$/.test(value)) return 'PIN code must be exactly 6 digits';
    return null;
  };

  const validatePhone = (value: string): string | null => {
    if (!value) return null; // Optional field
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length !== 10) return 'Phone number must be 10 digits';
    if (!/^[6-9]\d{9}$/.test(cleaned)) return 'Enter a valid Indian mobile number';
    return null;
  };

  const validateCity = (value: string): string | null => {
    if (!value) return null;
    if (!/^[a-zA-Z\s]+$/.test(value)) return 'City name should only contain letters';
    return null;
  };

  const validateState = (value: string): string | null => {
    if (!value) return null;
    if (!/^[a-zA-Z\s]+$/.test(value)) return 'State name should only contain letters';
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Real-time validation
    let error: string | null = null;
    if (name === 'pin_code') error = validatePinCode(value);
    if (name === 'site_contact_phone') error = validatePhone(value);
    if (name === 'city') error = validateCity(value);
    if (name === 'state') error = validateState(value);

    setValidationErrors(prev => ({
      ...prev,
      [name]: error || '',
    }));
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, branch_code: value }));

    // Validate format
    const validation = validateBranchCode(value);
    if (!validation.valid) {
      setCodeError(validation.error || null);
    } else {
      // Check uniqueness after short delay
      const timeout = setTimeout(() => checkCodeUniqueness(value), 500);
      return () => clearTimeout(timeout);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeError) return;

    // Validate all fields before submit
    const errors: Record<string, string> = {};
    const pinError = validatePinCode(formData.pin_code);
    const phoneError = validatePhone(formData.site_contact_phone);
    const cityError = validateCity(formData.city);
    const stateError = validateState(formData.state);

    if (pinError) errors.pin_code = pinError;
    if (phoneError) errors.site_contact_phone = phoneError;
    if (cityError) errors.city = cityError;
    if (stateError) errors.state = stateError;

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Combine opening/closing hours into operating_hours string
    const operating_hours = formData.opening_hours && formData.closing_hours
      ? `${formData.opening_hours} - ${formData.closing_hours}`
      : '';

    const { opening_hours, closing_hours, ...rest } = formData;
    const submitData = {
      ...rest,
      operating_hours,
      it_admin_id: formData.it_admin_id || null,
    };

    await onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={branch ? 'Edit Branch' : 'Add New Branch'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${text.primary}`}>Branch Name *</label>
            <input
              type="text"
              name="branch_name"
              value={formData.branch_name}
              onChange={handleChange}
              required
              placeholder="e.g., Mumbai HQ"
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${text.primary}`}>
              Branch Code *
              {isCheckingCode && <Loader2 className="inline w-3 h-3 ml-2 animate-spin" />}
            </label>
            <input
              type="text"
              name="branch_code"
              value={formData.branch_code}
              onChange={handleCodeChange}
              required
              maxLength={10}
              placeholder="e.g., MUMHQ"
              className={`w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border text-sm focus:outline-none font-mono uppercase ${
                codeError
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-slate-200 dark:border-zinc-800 focus:border-lime-500/50'
              }`}
            />
            {codeError && (
              <p className="text-xs text-red-500 mt-1">{codeError}</p>
            )}
            <p className={`text-xs mt-1 ${text.muted}`}>1-10 alphanumeric characters, auto-uppercase</p>
          </div>
        </div>

        {/* IT Admin Assignment - Only shown to Org Admin */}
        {isOrgAdmin && (
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${text.primary}`}>
              Assign IT Admin
              <span className={`font-normal ml-1 ${text.muted}`}>(Optional)</span>
            </label>
            <select
              name="it_admin_id"
              value={formData.it_admin_id || ''}
              onChange={handleChange}
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
            >
              <option value="">No IT Admin (needs_admin status)</option>
              {itAdmins.map((admin: ITAdmin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name} ({admin.email})
                </option>
              ))}
            </select>
            <p className={`text-xs mt-1 ${text.muted}`}>
              Branches without an IT Admin will be marked as "Needs Admin"
            </p>
          </div>
        )}

        {/* Address */}
        <div className="space-y-4">
          <h4 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>Address</h4>
          <div>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              required
              placeholder="Address Line 1 *"
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
            />
          </div>
          <div>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              placeholder="Address Line 2 (Optional)"
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="City *"
                className={`w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border text-sm focus:outline-none ${
                  validationErrors.city
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 dark:border-zinc-800 focus:border-lime-500/50'
                }`}
              />
              {validationErrors.city && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.city}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                placeholder="State *"
                className={`w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border text-sm focus:outline-none ${
                  validationErrors.state
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 dark:border-zinc-800 focus:border-lime-500/50'
                }`}
              />
              {validationErrors.state && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.state}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                name="pin_code"
                value={formData.pin_code}
                onChange={handleChange}
                required
                placeholder="PIN Code *"
                maxLength={6}
                className={`w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border text-sm focus:outline-none ${
                  validationErrors.pin_code
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 dark:border-zinc-800 focus:border-lime-500/50'
                }`}
              />
              {validationErrors.pin_code && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.pin_code}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h4 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>Site Contact</h4>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="site_contact_person"
              value={formData.site_contact_person}
              onChange={handleChange}
              placeholder="Contact Person Name"
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
            />
            <div>
              <input
                type="tel"
                name="site_contact_phone"
                value={formData.site_contact_phone}
                onChange={handleChange}
                placeholder="Contact Phone (10 digits)"
                maxLength={10}
                className={`w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border text-sm focus:outline-none ${
                  validationErrors.site_contact_phone
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-slate-200 dark:border-zinc-800 focus:border-lime-500/50'
                }`}
              />
              {validationErrors.site_contact_phone && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.site_contact_phone}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${text.muted}`}>Opening Hours</label>
              <select
                name="opening_hours"
                value={formData.opening_hours}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
              >
                <option value="">Select time</option>
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${text.muted}`}>Closing Hours</label>
              <select
                name="closing_hours"
                value={formData.closing_hours}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50"
              >
                <option value="">Select time</option>
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pickup Info */}
        <div className="space-y-4">
          <h4 className={`font-display font-bold text-sm uppercase tracking-wider ${text.muted}`}>Pickup Details</h4>
          <textarea
            name="pickup_point_description"
            value={formData.pickup_point_description}
            onChange={handleChange}
            placeholder="Pickup point description (e.g., Reception desk, Loading dock)"
            rows={2}
            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50 resize-none"
          />
          <textarea
            name="special_instructions"
            value={formData.special_instructions}
            onChange={handleChange}
            placeholder="Special instructions for logistics (e.g., Security clearance required)"
            rows={2}
            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-lime-500/50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !!codeError}
            className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-semibold text-sm uppercase tracking-wider transition-all"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {branch ? 'Save Changes' : 'Create Branch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  isOpen,
  onClose,
  branch,
  onConfirm,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!isOpen || !branch) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Branch" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className={`text-sm ${text.primary}`}>
              Are you sure you want to delete <strong>{branch.branch_name}</strong>?
            </p>
            <p className={`text-sm mt-1 ${text.muted}`}>
              This action cannot be undone. All assets and batches must be moved first.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold text-sm uppercase tracking-wider transition-all"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Branch
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default BranchManagement;
