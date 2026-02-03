/**
 * OpsBranches - Branch management for OPS Admin portal
 * Uses OpsEnterpriseContext for enterprise selection
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Users,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Phone,
  Clock,
} from 'lucide-react';
import { useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useActiveITAdmins,
} from '@/hooks';
import { PageHeader, Card, ConfirmationModal } from '@/components/ui';
import type { BranchResponse } from '@/lib/api/branches';

type BranchFormData = {
  branch_name: string;
  branch_code: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pin_code: string;
  site_contact_person: string;
  site_contact_phone: string;
  operating_hours: string;
  it_admin_id: string;
};

const emptyForm: BranchFormData = {
  branch_name: '',
  branch_code: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pin_code: '',
  site_contact_person: '',
  site_contact_phone: '',
  operating_hours: '',
  it_admin_id: '',
};

export function OpsBranches() {
  const { selectedEnterpriseId, isAllEnterprises, selectedEnterprise } = useOpsEnterprise();
  const enterpriseId = isAllEnterprises ? '' : (selectedEnterpriseId || '');
  const { data: branches = [], isLoading } = useBranches(enterpriseId);
  const { data: itAdmins = [] } = useActiveITAdmins(enterpriseId);
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchResponse | null>(null);
  const [formData, setFormData] = useState<BranchFormData>(emptyForm);
  const [formError, setFormError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<BranchResponse | null>(null);

  const filteredBranches = branches.filter((b: BranchResponse) =>
    b.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.branch_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormData(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (branch: BranchResponse) => {
    setEditingBranch(branch);
    setFormData({
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      address_line1: branch.address_line1,
      address_line2: branch.address_line2 || '',
      city: branch.city,
      state: branch.state,
      pin_code: branch.pin_code,
      site_contact_person: branch.site_contact_person || '',
      site_contact_phone: branch.site_contact_phone || '',
      operating_hours: branch.operating_hours || '',
      it_admin_id: branch.it_admin_id || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.branch_name || !formData.branch_code || !formData.address_line1 || !formData.city || !formData.state || !formData.pin_code) {
      setFormError('Please fill in all required fields.');
      return;
    }

    try {
      if (editingBranch) {
        await updateBranch.mutateAsync({
          branchId: editingBranch.id,
          updates: {
            branch_name: formData.branch_name,
            branch_code: formData.branch_code,
            address_line1: formData.address_line1,
            address_line2: formData.address_line2 || undefined,
            city: formData.city,
            state: formData.state,
            pin_code: formData.pin_code,
            site_contact_person: formData.site_contact_person || undefined,
            site_contact_phone: formData.site_contact_phone || undefined,
            operating_hours: formData.operating_hours || undefined,
            it_admin_id: formData.it_admin_id || null,
          },
        });
      } else {
        await createBranch.mutateAsync({
          enterprise_id: enterpriseId,
          branch_name: formData.branch_name,
          branch_code: formData.branch_code,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2 || undefined,
          city: formData.city,
          state: formData.state,
          pin_code: formData.pin_code,
          site_contact_person: formData.site_contact_person || undefined,
          site_contact_phone: formData.site_contact_phone || undefined,
          operating_hours: formData.operating_hours || undefined,
          it_admin_id: formData.it_admin_id || undefined,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save branch');
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;
    try {
      await deleteBranch.mutateAsync(branchToDelete.id);
      setIsDeleteModalOpen(false);
      setBranchToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete branch:', err);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400';
    if (status === 'inactive') return 'border-slate-400/30 bg-slate-400/10 text-slate-400';
    return 'border-amber-400/30 bg-amber-400/10 text-amber-400';
  };

  if (isAllEnterprises) {
    return (
      <div className="space-y-6">
        <PageHeader label="Branches" title="Branch Management" subtitle="Select an enterprise to manage branches" />
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-white/30" />
          <h3 className="font-brand font-bold text-xl text-slate-500 dark:text-white/50 uppercase tracking-tight mb-2">
            Select an Enterprise
          </h3>
          <p className="font-display text-slate-400 dark:text-white/40 max-w-md mx-auto">
            Use the enterprise selector in the sidebar to choose an enterprise before managing branches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Branches"
        title="Branch Management"
        subtitle={`Manage branches for ${selectedEnterprise?.name || 'selected enterprise'}`}
        actions={
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-lime-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-lime-400 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
        <input
          type="text"
          placeholder="Search branches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-lime-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4">
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Total</p>
          <p className="font-brand font-bold text-2xl text-slate-900 dark:text-white">{branches.length}</p>
        </div>
        <div className="border border-emerald-400/30 bg-emerald-400/5 p-4">
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Active</p>
          <p className="font-brand font-bold text-2xl text-emerald-400">
            {branches.filter((b: BranchResponse) => b.status === 'active').length}
          </p>
        </div>
        <div className="border border-amber-400/30 bg-amber-400/5 p-4">
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">Needs Admin</p>
          <p className="font-brand font-bold text-2xl text-amber-400">
            {branches.filter((b: BranchResponse) => !b.it_admin_id).length}
          </p>
        </div>
        <div className="border border-blue-400/30 bg-blue-400/5 p-4">
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase">IT Admins</p>
          <p className="font-brand font-bold text-2xl text-blue-400">{itAdmins.length}</p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
        </div>
      )}

      {/* Branch List */}
      {!isLoading && filteredBranches.length > 0 && (
        <div className="space-y-3">
          {filteredBranches.map((branch: BranchResponse, idx: number) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-slate-500 dark:text-white/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display font-bold text-slate-900 dark:text-white">{branch.branch_name}</h3>
                      <span className="font-mono font-bold text-xs text-lime-500">{branch.branch_code}</span>
                      <span className={`px-2 py-0.5 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusColor(branch.status)}`}>
                        {branch.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-white/40" />
                        <span className="font-mono text-slate-500 dark:text-white/50">{branch.city}, {branch.state} - {branch.pin_code}</span>
                      </div>
                      {branch.it_admin && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-mono text-blue-400">{branch.it_admin.name}</span>
                        </div>
                      )}
                      {!branch.it_admin_id && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-mono text-amber-400">No IT Admin</span>
                        </div>
                      )}
                      {branch.site_contact_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-white/40" />
                          <span className="font-mono text-slate-500 dark:text-white/50">{branch.site_contact_phone}</span>
                        </div>
                      )}
                      {branch.operating_hours && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-white/40" />
                          <span className="font-mono text-slate-500 dark:text-white/50">{branch.operating_hours}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(branch)}
                    className="p-2 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                    title="Edit Branch"
                  >
                    <Edit className="w-4 h-4 text-slate-500 dark:text-white/50" />
                  </button>
                  <button
                    onClick={() => { setBranchToDelete(branch); setIsDeleteModalOpen(true); }}
                    className="p-2 border border-red-400/30 hover:bg-red-400/10 transition-colors"
                    title="Delete Branch"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredBranches.length === 0 && (
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-white/30" />
          <h3 className="font-brand font-bold text-xl text-slate-500 dark:text-white/50 uppercase tracking-tight mb-2">
            {searchQuery ? 'No Matches' : 'No Branches Yet'}
          </h3>
          <p className="font-display text-slate-400 dark:text-white/40 max-w-md mx-auto mb-6">
            {searchQuery
              ? 'Try a different search term.'
              : 'Create a branch to start managing IT assets for this enterprise.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2 bg-lime-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-lime-400 transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Branch
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-lg max-h-[90vh] overflow-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <h2 className="font-brand font-bold text-xl text-slate-900 dark:text-white uppercase tracking-tight">
                  {editingBranch ? 'Edit Branch' : 'Create Branch'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-slate-500 dark:text-white/50" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="border border-red-400/30 bg-red-400/10 p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="font-mono text-xs text-red-400">{formError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">Branch Name *</label>
                    <input
                      value={formData.branch_name}
                      onChange={(e) => setFormData(f => ({ ...f, branch_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm focus:border-lime-500 focus:outline-none"
                      placeholder="e.g. Mumbai HQ"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">Branch Code *</label>
                    <input
                      value={formData.branch_code}
                      onChange={(e) => setFormData(f => ({ ...f, branch_code: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-sm focus:border-lime-500 focus:outline-none"
                      placeholder="e.g. MUM-HQ"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">Address Line 1 *</label>
                  <input
                    value={formData.address_line1}
                    onChange={(e) => setFormData(f => ({ ...f, address_line1: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm focus:border-lime-500 focus:outline-none"
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">Address Line 2</label>
                  <input
                    value={formData.address_line2}
                    onChange={(e) => setFormData(f => ({ ...f, address_line2: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm focus:border-lime-500 focus:outline-none"
                    placeholder="Suite, building, etc."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">City *</label>
                    <input
                      value={formData.city}
                      onChange={(e) => setFormData(f => ({ ...f, city: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm focus:border-lime-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">State *</label>
                    <input
                      value={formData.state}
                      onChange={(e) => setFormData(f => ({ ...f, state: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm focus:border-lime-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">PIN Code *</label>
                    <input
                      value={formData.pin_code}
                      onChange={(e) => setFormData(f => ({ ...f, pin_code: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-sm focus:border-lime-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">Contact Person</label>
                    <input
                      value={formData.site_contact_person}
                      onChange={(e) => setFormData(f => ({ ...f, site_contact_person: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm focus:border-lime-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">Contact Phone</label>
                    <input
                      value={formData.site_contact_phone}
                      onChange={(e) => setFormData(f => ({ ...f, site_contact_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-sm focus:border-lime-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">Operating Hours</label>
                  <input
                    value={formData.operating_hours}
                    onChange={(e) => setFormData(f => ({ ...f, operating_hours: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display text-sm focus:border-lime-500 focus:outline-none"
                    placeholder="e.g. Mon-Fri 9AM-6PM"
                  />
                </div>

                {/* IT Admin Assignment */}
                <div>
                  <label className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase tracking-widest block mb-1">Assign IT Admin</label>
                  <select
                    value={formData.it_admin_id}
                    onChange={(e) => setFormData(f => ({ ...f, it_admin_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-display text-sm focus:border-lime-500 focus:outline-none"
                  >
                    <option value="">No IT Admin</option>
                    {itAdmins.map((admin: any) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/50 font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createBranch.isPending || updateBranch.isPending}
                  className="px-5 py-2 bg-lime-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-lime-400 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {(createBranch.isPending || updateBranch.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {editingBranch ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setBranchToDelete(null); }}
        onConfirm={handleDelete}
        isLoading={deleteBranch.isPending}
        variant="danger"
        title="Delete Branch?"
        description={`Are you sure you want to delete "${branchToDelete?.branch_name}"? This action cannot be undone.`}
        confirmText="Delete Branch"
      />
    </div>
  );
}

export default OpsBranches;
