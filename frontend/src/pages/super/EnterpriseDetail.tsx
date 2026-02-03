/**
 * Super Admin Enterprise Detail Page
 * V3.4: View and edit enterprise details with documents viewer
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  Briefcase,
  Shield,
  Edit,
  Save,
  X,
  ExternalLink,
  Download,
  FileCheck,
  Power,
  Ban,
} from 'lucide-react';
import { PageHeader, Card, Spinner, ConfirmationModal } from '@/components/ui';
import { CreateEnterpriseUserModal } from '@/pages/super';
import { enterprisesApi } from '@/lib/api/enterprises';
import { usersApi } from '@/lib/api/users';
import { branchesApi } from '@/lib/api/branches';
import { glass, text, iconSize } from '@/lib/design-tokens';
import { useAuth } from '@/hooks';

interface Enterprise {
  id: string;
  name: string;
  legalName?: string;
  gstNumber?: string;
  panNumber?: string;
  address?: any;
  status: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  companySize?: string;
  employeeCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

interface EnterpriseUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  branch_id?: string;
}

interface SubUser {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  department?: string;
  status: string;
}

interface EnterpriseDocuments {
  id: string;
  company_name: string;
  gst_number: string;
  pan_number: string;
  registered_address: string;
  doc_gst_certificate: string | null;
  doc_pan_card: string | null;
  doc_incorporation_cert: string | null;
  doc_signatory_id: string | null;
  doc_address_proof: string | null;
  doc_company_logo: string | null;
  application_ref: string;
  created_at: string;
}

export function SuperEnterpriseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [admins, setAdmins] = useState<EnterpriseUser[]>([]);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<EnterpriseDocuments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'it_admin' | 'org_admin' | 'employee'>('employee');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    legalName: '',
    gstNumber: '',
    panNumber: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    industry: '',
    companySize: '',
    employeeCount: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Status change state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'active' | 'inactive' | 'suspended' | null>(null);

  // Update enterprise mutation
  const updateEnterpriseMutation = useMutation({
    mutationFn: async (data: { enterpriseId: string; updates: UpdateEnterpriseInput; updatedBy: string }) => {
      return updateEnterprise(data.enterpriseId, data.updates, data.updatedBy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      fetchEnterpriseDetails();
      setIsEditing(false);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { enterpriseId: string; status: 'active' | 'inactive' | 'suspended'; updatedBy: string }) => {
      return updateEnterpriseStatus(data.enterpriseId, data.status, data.updatedBy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprises'] });
      fetchEnterpriseDetails();
      setShowStatusModal(false);
      setPendingStatus(null);
    },
  });

  useEffect(() => {
    if (id) {
      fetchEnterpriseDetails();
    }
  }, [id]);

  const fetchEnterpriseDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      // Fetch enterprise via REST API
      const enterpriseResult = await enterprisesApi.get(id);

      if (enterpriseResult.success && enterpriseResult.data) {
        const row = enterpriseResult.data;
        const addressData = typeof row.address === 'string' ? JSON.parse(row.address) : row.address;
        const enterpriseData = {
          id: row.id,
          name: row.name,
          legalName: row.legal_name,
          gstNumber: row.gst_number,
          panNumber: row.pan_number,
          address: addressData,
          status: row.status,
          contactPerson: row.contact_person,
          contactEmail: row.contact_email,
          contactPhone: row.contact_phone,
          industry: row.industry,
          companySize: row.company_size,
          employeeCount: row.employee_count,
          createdAt: new Date(row.created_at),
          updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
        };
        setEnterprise(enterpriseData);

        // Initialize edit form
        setEditForm({
          name: enterpriseData.name || '',
          legalName: enterpriseData.legalName || '',
          gstNumber: enterpriseData.gstNumber || '',
          panNumber: enterpriseData.panNumber || '',
          contactPerson: enterpriseData.contactPerson || '',
          contactEmail: enterpriseData.contactEmail || '',
          contactPhone: enterpriseData.contactPhone || '',
          industry: enterpriseData.industry || '',
          companySize: enterpriseData.companySize || '',
          employeeCount: enterpriseData.employeeCount?.toString() || '',
          addressLine1: enterpriseData.address?.line1 || '',
          addressLine2: enterpriseData.address?.line2 || '',
          city: enterpriseData.address?.city || '',
          state: enterpriseData.address?.state || '',
          pinCode: enterpriseData.address?.pinCode || '',
          country: enterpriseData.address?.country || 'India',
        });
      }

      // Fetch branches for this enterprise
      const branchesResult = await branchesApi.list({ enterprise_id: id, limit: 1000 });
      if (branchesResult.success && branchesResult.data) {
        const branchMap: Record<string, string> = {};
        branchesResult.data.forEach((b) => {
          branchMap[b.id] = b.name;
        });
        setBranches(branchMap);
      }

      // Fetch users for this enterprise
      const usersResult = await usersApi.list({ enterprise_id: id, limit: 1000 });
      if (usersResult.success && usersResult.data) {
        const adminUsers = usersResult.data
          .filter((u) => u.role === 'org_admin' || u.role === 'it_admin')
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            status: u.status,
            phone: u.phone,
            branch_id: u.branch_id,
          }));
        setAdmins(adminUsers);

        // Sub-users (employees) are also in users table with role 'employee'
        const subUsersList = usersResult.data
          .filter((u) => u.role === 'employee' || u.role === 'employee')
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            department: u.department,
            status: u.status,
          }));
        setSubUsers(subUsersList);
      }
    } catch (error) {
      console.error('Error fetching enterprise details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = (role: 'it_admin' | 'org_admin' | 'employee') => {
    setSelectedRole(role);
    setIsUserModalOpen(true);
  };

  const handleUserCreated = () => {
    setIsUserModalOpen(false);
    fetchEnterpriseDetails();
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!enterprise || !user) return;

    setIsSaving(true);
    try {
      const updates: UpdateEnterpriseInput = {
        name: editForm.name,
        legal_name: editForm.legalName || undefined,
        gst_number: editForm.gstNumber || undefined,
        pan_number: editForm.panNumber || undefined,
        contact_person: editForm.contactPerson || undefined,
        contact_email: editForm.contactEmail || undefined,
        contact_phone: editForm.contactPhone || undefined,
        industry: editForm.industry || undefined,
        company_size: editForm.companySize || undefined,
        employee_count: editForm.employeeCount ? parseInt(editForm.employeeCount) : undefined,
        address: {
          line1: editForm.addressLine1,
          line2: editForm.addressLine2,
          city: editForm.city,
          state: editForm.state,
          pinCode: editForm.pinCode,
          country: editForm.country,
        },
      };

      await updateEnterpriseMutation.mutateAsync({
        enterpriseId: enterprise.id,
        updates,
        updatedBy: user.id,
      });
    } catch (error) {
      console.error('Failed to update enterprise:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    if (enterprise) {
      setEditForm({
        name: enterprise.name || '',
        legalName: enterprise.legalName || '',
        gstNumber: enterprise.gstNumber || '',
        panNumber: enterprise.panNumber || '',
        contactPerson: enterprise.contactPerson || '',
        contactEmail: enterprise.contactEmail || '',
        contactPhone: enterprise.contactPhone || '',
        industry: enterprise.industry || '',
        companySize: enterprise.companySize || '',
        employeeCount: enterprise.employeeCount?.toString() || '',
        addressLine1: enterprise.address?.line1 || '',
        addressLine2: enterprise.address?.line2 || '',
        city: enterprise.address?.city || '',
        state: enterprise.address?.state || '',
        pinCode: enterprise.address?.pinCode || '',
        country: enterprise.address?.country || 'India',
      });
    }
    setIsEditing(false);
  };

  // Handle status change
  const handleStatusChange = (newStatus: 'active' | 'inactive' | 'suspended') => {
    setPendingStatus(newStatus);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!enterprise || !user || !pendingStatus) return;

    await updateStatusMutation.mutateAsync({
      enterpriseId: enterprise.id,
      status: pendingStatus,
      updatedBy: user.id,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!enterprise) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-400" />
        <h2 className={`font-brand font-bold text-xl mb-2 ${text.primary}`}>Enterprise Not Found</h2>
        <p className={`${text.muted} mb-6`}>The enterprise you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/super/enterprises')}
          className="px-4 py-2 bg-lime-500 text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-lime-400 transition-all"
        >
          Back to Enterprises
        </button>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      it_admin: 'border-blue-400/30 bg-blue-400/10 text-blue-400',
      org_admin: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400',
      employee: 'border-purple-400/30 bg-purple-400/10 text-purple-400',
    };
    return roleColors[role] || 'border-slate-400/30 bg-slate-400/10 text-slate-400';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      it_admin: 'IT Admin',
      org_admin: 'Org Admin',
      employee: 'Employee',
    };
    return labels[role] || role;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400';
    if (status === 'inactive') return 'border-slate-400/30 bg-slate-400/10 text-slate-400';
    if (status === 'suspended') return 'border-red-400/30 bg-red-400/10 text-red-400';
    return 'border-amber-400/30 bg-amber-400/10 text-amber-400';
  };

  const orgAdmins = admins.filter(u => u.role === 'org_admin');
  const itAdmins = admins.filter(u => u.role === 'it_admin');

  // Document labels
  const DOCUMENT_LABELS: Record<string, string> = {
    doc_gst_certificate: 'GST Certificate',
    doc_pan_card: 'PAN Card',
    doc_incorporation_cert: 'Incorporation Certificate',
    doc_signatory_id: 'Signatory ID',
    doc_address_proof: 'Address Proof',
    doc_company_logo: 'Company Logo',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Enterprise Details"
        title={enterprise.name}
        subtitle={`Registered on ${enterprise.createdAt.toLocaleDateString()}`}
        actions={
          <div className="flex gap-3">
            {!isEditing ? (
              <>
                {/* Status Actions */}
                {enterprise.status === 'active' && (
                  <button
                    onClick={() => handleStatusChange('suspended')}
                    className="px-4 py-2 border border-red-400/30 bg-red-400/10 text-red-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-400/20 transition-all flex items-center gap-2"
                  >
                    <Ban className={iconSize.sm} />
                    Suspend
                  </button>
                )}
                {enterprise.status === 'suspended' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="px-4 py-2 border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-emerald-400/20 transition-all flex items-center gap-2"
                  >
                    <Power className={iconSize.sm} />
                    Reactivate
                  </button>
                )}
                {enterprise.status === 'inactive' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="px-4 py-2 border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-emerald-400/20 transition-all flex items-center gap-2"
                  >
                    <Power className={iconSize.sm} />
                    Activate
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                >
                  <Edit className={iconSize.sm} />
                  Edit
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/[0.05] transition-all flex items-center gap-2"
                >
                  <X className={iconSize.sm} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Clock className={`${iconSize.sm} animate-spin`} />
                  ) : (
                    <Save className={iconSize.sm} />
                  )}
                  Save
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/super/enterprises')}
              className="px-4 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/[0.05] transition-all flex items-center gap-2"
            >
              <ArrowLeft className={iconSize.sm} />
              Back
            </button>
          </div>
        }
      />

      {/* Enterprise Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className={`${iconSize.lg} text-lime-500`} />
                <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>
                  Company Information
                </h2>
              </div>
              <span className={`px-3 py-1 border font-mono font-bold text-xs uppercase tracking-widest ${getStatusBadge(enterprise.status)}`}>
                {enterprise.status === 'active' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                {enterprise.status === 'suspended' && <Ban className="w-3 h-3 inline mr-1" />}
                {enterprise.status === 'pending_verification' && <Clock className="w-3 h-3 inline mr-1" />}
                {enterprise.status}
              </span>
            </div>
          </div>
          <div className="p-6">
            {isEditing ? (
              /* Edit Form */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      Company Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      Legal Name
                    </label>
                    <input
                      type="text"
                      value={editForm.legalName}
                      onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      GST Number
                    </label>
                    <input
                      type="text"
                      value={editForm.gstNumber}
                      onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={editForm.panNumber}
                      onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Industry
                      </label>
                      <input
                        type="text"
                        value={editForm.industry}
                        onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50"
                      />
                    </div>
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Company Size
                      </label>
                      <input
                        type="text"
                        value={editForm.companySize}
                        onChange={(e) => setEditForm({ ...editForm, companySize: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Employee Count
                      </label>
                      <input
                        type="number"
                        value={editForm.employeeCount}
                        onChange={(e) => setEditForm({ ...editForm, employeeCount: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={editForm.contactPerson}
                      onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={editForm.contactEmail}
                      onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={editForm.contactPhone}
                      onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
                    />
                  </div>
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      Address
                    </label>
                    <input
                      type="text"
                      placeholder="Line 1"
                      value={editForm.addressLine1}
                      onChange={(e) => setEditForm({ ...editForm, addressLine1: e.target.value })}
                      className="w-full px-4 py-2 mb-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Line 2 (optional)"
                      value={editForm.addressLine2}
                      onChange={(e) => setEditForm({ ...editForm, addressLine2: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="City"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={editForm.state}
                      onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-display text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="PIN Code"
                      value={editForm.pinCode}
                      onChange={(e) => setEditForm({ ...editForm, pinCode: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {enterprise.legalName && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Legal Name
                      </label>
                      <p className={`font-display text-sm ${text.primary}`}>{enterprise.legalName}</p>
                    </div>
                  )}
                  {enterprise.gstNumber && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        GST Number
                      </label>
                      <p className={`font-mono text-sm ${text.primary}`}>{enterprise.gstNumber}</p>
                    </div>
                  )}
                  {enterprise.panNumber && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        PAN Number
                      </label>
                      <p className={`font-mono text-sm ${text.primary}`}>{enterprise.panNumber}</p>
                    </div>
                  )}
                  {enterprise.industry && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Industry
                      </label>
                      <p className={`font-display text-sm ${text.primary}`}>{enterprise.industry}</p>
                    </div>
                  )}
                  {enterprise.companySize && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Company Size
                      </label>
                      <p className={`font-display text-sm ${text.primary}`}>{enterprise.companySize}</p>
                    </div>
                  )}
                  {enterprise.employeeCount && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Employee Count
                      </label>
                      <p className={`font-display text-sm ${text.primary}`}>{enterprise.employeeCount}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {enterprise.contactPerson && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Contact Person
                      </label>
                      <p className={`font-display text-sm ${text.primary}`}>{enterprise.contactPerson}</p>
                    </div>
                  )}
                  {enterprise.contactEmail && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Email
                      </label>
                      <div className="flex items-center gap-2">
                        <Mail className={`${iconSize.sm} ${text.muted}`} />
                        <p className={`font-mono text-sm ${text.primary}`}>{enterprise.contactEmail}</p>
                      </div>
                    </div>
                  )}
                  {enterprise.contactPhone && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Phone
                      </label>
                      <div className="flex items-center gap-2">
                        <Phone className={`${iconSize.sm} ${text.muted}`} />
                        <p className={`font-mono text-sm ${text.primary}`}>{enterprise.contactPhone}</p>
                      </div>
                    </div>
                  )}
                  {enterprise.address && (
                    <div>
                      <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                        Address
                      </label>
                      <div className="flex items-start gap-2">
                        <MapPin className={`${iconSize.sm} ${text.muted} mt-0.5`} />
                        <p className={`font-display text-sm ${text.primary}`}>
                          {enterprise.address.full ? (
                            // Simple address from application
                            enterprise.address.full
                          ) : enterprise.address.line1 ? (
                            // Structured address
                            <>
                              {enterprise.address.line1}
                              {enterprise.address.line2 && `, ${enterprise.address.line2}`}
                              <br />
                              {enterprise.address.city}, {enterprise.address.state} {enterprise.address.pinCode}
                              <br />
                              {enterprise.address.country}
                            </>
                          ) : (
                            // Fallback for string addresses
                            typeof enterprise.address === 'string' ? enterprise.address : 'N/A'
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Documents Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className={`${iconSize.lg} text-blue-500`} />
                <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>
                  Registration Documents
                </h2>
              </div>
              {documents?.application_ref && (
                <span className="font-mono text-xs text-slate-500 dark:text-white/50">
                  Ref: {documents.application_ref}
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            {documents ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(DOCUMENT_LABELS).map(([key, label]) => {
                  const docUrl = documents[key as keyof EnterpriseDocuments] as string | null;

                  return (
                    <div
                      key={key}
                      className={`p-4 border ${
                        docUrl
                          ? 'border-emerald-400/30 bg-emerald-400/5'
                          : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {docUrl ? (
                            <FileCheck className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                          )}
                          <div>
                            <p className={`font-mono text-xs ${docUrl ? 'text-slate-900 dark:text-white' : text.muted}`}>
                              {label}
                            </p>
                            <p className={`font-mono text-[10px] ${docUrl ? 'text-emerald-400' : text.muted}`}>
                              {docUrl ? 'Uploaded' : 'Not uploaded'}
                            </p>
                          </div>
                        </div>
                        {docUrl && (
                          <div className="flex items-center gap-1">
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 transition-colors"
                              title="View document"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <a
                              href={docUrl}
                              download
                              className="p-1.5 text-ecotribe-primary hover:text-white hover:bg-ecotribe-primary/20 transition-colors"
                              title="Download document"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className={`w-12 h-12 mx-auto mb-4 ${text.muted}`} />
                <p className={`font-mono text-sm ${text.muted}`}>No registration documents found</p>
                <p className={`font-mono text-xs ${text.muted} mt-2`}>
                  Documents are available for enterprises registered through the application process
                </p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Org Admin Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Briefcase className={`${iconSize.lg} text-emerald-500`} />
                <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>
                  Org Admin {orgAdmins.length > 0 && `(${orgAdmins.length})`}
                </h2>
              </div>
              <button
                onClick={() => handleAddUser('org_admin')}
                className="px-3 py-2 border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-emerald-400/20 transition-all flex items-center gap-2"
              >
                <UserPlus className={iconSize.sm} />
                Add Org Admin
              </button>
            </div>
          </div>
          {orgAdmins.length > 0 ? (
            <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
              {orgAdmins.map((u) => (
                <div key={u.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-display font-bold ${text.primary}`}>{u.name}</h3>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getRoleBadge(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusBadge(u.status)}`}>
                          {u.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className={`${iconSize.sm} ${text.muted}`} />
                          <span className={`font-mono text-xs ${text.muted}`}>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className={`${iconSize.sm} ${text.muted}`} />
                            <span className={`font-mono text-xs ${text.muted}`}>{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Briefcase className={`w-12 h-12 mx-auto mb-4 ${text.muted}`} />
              <p className={`font-mono text-sm ${text.muted}`}>No Org Admin assigned yet</p>
              <p className={`font-mono text-xs ${text.muted} mt-2`}>The Org Admin manages finance and approvals</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* IT Admins Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className={`${iconSize.lg} text-blue-500`} />
                <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>
                  IT Admins ({itAdmins.length})
                </h2>
              </div>
              <button
                onClick={() => handleAddUser('it_admin')}
                className="px-3 py-2 border border-blue-400/30 bg-blue-400/10 text-blue-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-400/20 transition-all flex items-center gap-2"
              >
                <UserPlus className={iconSize.sm} />
                Add IT Admin
              </button>
            </div>
          </div>
          {itAdmins.length > 0 ? (
            <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
              {itAdmins.map((u) => (
                <div key={u.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-display font-bold ${text.primary}`}>{u.name}</h3>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getRoleBadge(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusBadge(u.status)}`}>
                          {u.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-2">
                          <Mail className={`${iconSize.sm} ${text.muted}`} />
                          <span className={`font-mono text-xs ${text.muted}`}>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className={`${iconSize.sm} ${text.muted}`} />
                            <span className={`font-mono text-xs ${text.muted}`}>{u.phone}</span>
                          </div>
                        )}
                        {u.branch_id && branches[u.branch_id] && (
                          <div className="flex items-center gap-2">
                            <MapPin className={`${iconSize.sm} text-amber-400`} />
                            <span className={`font-mono text-xs text-amber-400`}>{branches[u.branch_id]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Shield className={`w-12 h-12 mx-auto mb-4 ${text.muted}`} />
              <p className={`font-mono text-sm ${text.muted}`}>No IT Admins assigned yet</p>
              <p className={`font-mono text-xs ${text.muted} mt-2`}>IT Admins manage assets and branches</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Employees Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className={`${iconSize.lg} text-purple-500`} />
                <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>
                  Employees ({subUsers.length})
                </h2>
              </div>
              <button
                onClick={() => handleAddUser('employee')}
                className="px-3 py-2 border border-purple-400/30 bg-purple-400/10 text-purple-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-purple-400/20 transition-all flex items-center gap-2"
              >
                <UserPlus className={iconSize.sm} />
                Add Employee
              </button>
            </div>
          </div>
          {subUsers.length > 0 ? (
            <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
              {subUsers.map((u) => (
                <div key={u.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-display font-bold ${text.primary}`}>{u.name || u.email}</h3>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getRoleBadge('employee')}`}>
                          Employee
                        </span>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusBadge(u.status)}`}>
                          {u.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-2">
                          <Mail className={`${iconSize.sm} ${text.muted}`} />
                          <span className={`font-mono text-xs ${text.muted}`}>{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className={`${iconSize.sm} ${text.muted}`} />
                            <span className={`font-mono text-xs ${text.muted}`}>{u.phone}</span>
                          </div>
                        )}
                        {u.department && (
                          <div className="flex items-center gap-2">
                            <Briefcase className={`${iconSize.sm} text-purple-400`} />
                            <span className={`font-mono text-xs text-purple-400`}>{u.department}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users className={`w-12 h-12 mx-auto mb-4 ${text.muted}`} />
              <p className={`font-mono text-sm ${text.muted}`}>No employees found for this enterprise</p>
              <p className={`font-mono text-xs ${text.muted} mt-2`}>Employees are users who submit devices for evaluation</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Create User Modal */}
      {enterprise && (
        <CreateEnterpriseUserModal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          enterpriseId={enterprise.id}
          enterpriseName={enterprise.name}
          onSuccess={handleUserCreated}
          defaultRole={selectedRole}
        />
      )}

      {/* Status Change Confirmation Modal */}
      <ConfirmationModal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setPendingStatus(null);
        }}
        onConfirm={confirmStatusChange}
        title={`${pendingStatus === 'active' ? 'Activate' : pendingStatus === 'suspended' ? 'Suspend' : 'Deactivate'} Enterprise`}
        description={
          pendingStatus === 'suspended'
            ? `Are you sure you want to suspend ${enterprise.name}? This will prevent all users from accessing the platform and block all their operations.`
            : pendingStatus === 'active'
            ? `Are you sure you want to activate ${enterprise.name}? All users will regain access to the platform and can resume operations.`
            : `Are you sure you want to deactivate ${enterprise.name}? This will disable the enterprise account.`
        }
        confirmText={pendingStatus === 'active' ? 'Activate' : pendingStatus === 'suspended' ? 'Suspend' : 'Deactivate'}
        variant={pendingStatus === 'suspended' ? 'danger' : pendingStatus === 'active' ? 'info' : 'warning'}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  );
}

export default SuperEnterpriseDetail;
