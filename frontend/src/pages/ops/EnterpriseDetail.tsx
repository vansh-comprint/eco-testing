import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  Briefcase,
  Shield,
  Upload
} from 'lucide-react';
import { PageHeader, Card, Spinner, BulkImportModal } from '@/components/ui';
import type { BulkImportColumn, BulkImportResult } from '@/components/ui';
import { CreateEnterpriseUserModal } from '@/pages/super';
import { enterprisesApi } from '@/lib/api/enterprises';
import { usersApi } from '@/lib/api/users';
import { subUsersApi } from '@/lib/api/sub-users';
import { branchesApi } from '@/lib/api/branches';
import { glass, text, iconSize } from '@/lib/design-tokens';

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
  employeeCount?: number;
  createdAt: Date;
}

interface EnterpriseUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  branch_id?: string;
  branch_name?: string;
}

interface SubUser {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  department?: string;
  status: string;
}

export function EnterpriseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [admins, setAdmins] = useState<EnterpriseUser[]>([]);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [branches, setBranches] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'it_admin' | 'org_admin' | 'employee'>('employee');
  const [bulkImportType, setBulkImportType] = useState<'it_admin' | 'employee' | null>(null);

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
        setEnterprise({
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
          employeeCount: row.employee_count,
          createdAt: new Date(row.created_at),
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

      // Fetch users for this enterprise via REST API
      const usersResult = await usersApi.list({ enterprise_id: id, limit: 1000 });
      if (usersResult.success && usersResult.data) {
        // Filter to only org_admin and it_admin roles
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

        // Sub-users (employees)
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
    fetchEnterpriseDetails(); // Refresh the user list
  };

  const itAdminBulkColumns: BulkImportColumn[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'password', label: 'Password', required: true },
  ];

  const subUserBulkColumns: BulkImportColumn[] = [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'department', label: 'Department', required: false },
    { key: 'employee_id', label: 'Employee ID', required: false },
  ];

  const handleBulkImport = async (rows: Record<string, string>[]): Promise<BulkImportResult> => {
    if (!id) throw new Error('No enterprise ID');

    if (bulkImportType === 'it_admin') {
      const response = await usersApi.bulkCreate({
        users: rows.map(row => ({
          name: row.name,
          email: row.email,
          phone: row.phone || undefined,
          password: row.password || undefined,
          role: 'it_admin',
          enterprise_id: id,
        })),
      });
      if (!response.success) throw new Error(response.error?.message || 'Bulk import failed');
      return response.data as BulkImportResult;
    } else {
      const response = await subUsersApi.bulkCreate({
        enterprise_id: id,
        role: 'employee',
        users: rows.map(row => ({
          name: row.name,
          email: row.email,
          phone: row.phone || undefined,
          department: row.department || undefined,
          employee_id: row.employee_id || undefined,
        })),
      });
      if (!response.success) throw new Error(response.error?.message || 'Bulk import failed');
      return response.data as BulkImportResult;
    }
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
          onClick={() => navigate('/ops/enterprises')}
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
    return 'border-amber-400/30 bg-amber-400/10 text-amber-400';
  };

  // Separate org_admin and it_admin
  const orgAdmins = admins.filter(u => u.role === 'org_admin');
  const itAdmins = admins.filter(u => u.role === 'it_admin');

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Enterprise Details"
        title={enterprise.name}
        subtitle={`Registered on ${enterprise.createdAt.toLocaleDateString()}`}
        actions={
          <button
            onClick={() => navigate('/ops/enterprises')}
            className="px-4 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all flex items-center gap-2"
          >
            <ArrowLeft className={iconSize.sm} />
            Back
          </button>
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
                {enterprise.status === 'pending_verification' && <Clock className="w-3 h-3 inline mr-1" />}
                {enterprise.status}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
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
                {enterprise.employeeCount && (
                  <div>
                    <label className={`font-mono text-xs uppercase tracking-widest ${text.muted} mb-1 block`}>
                      Employee Count
                    </label>
                    <p className={`font-display text-sm ${text.primary}`}>{enterprise.employeeCount}</p>
                  </div>
                )}
              </div>

              {/* Right Column */}
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
                        {enterprise.address.line1}
                        {enterprise.address.line2 && `, ${enterprise.address.line2}`}
                        <br />
                        {enterprise.address.city}, {enterprise.address.state} {enterprise.address.pinCode}
                        <br />
                        {enterprise.address.country}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
              {orgAdmins.map((user) => (
                <div key={user.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-display font-bold ${text.primary}`}>{user.name}</h3>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getRoleBadge(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className={`${iconSize.sm} ${text.muted}`} />
                          <span className={`font-mono text-xs ${text.muted}`}>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className={`${iconSize.sm} ${text.muted}`} />
                            <span className={`font-mono text-xs ${text.muted}`}>{user.phone}</span>
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
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkImportType('it_admin')}
                  className="px-3 py-2 border border-blue-400/30 bg-blue-400/5 text-blue-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-400/20 transition-all flex items-center gap-2"
                >
                  <Upload className={iconSize.sm} />
                  Bulk Import
                </button>
                <button
                  onClick={() => handleAddUser('it_admin')}
                  className="px-3 py-2 border border-blue-400/30 bg-blue-400/10 text-blue-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-400/20 transition-all flex items-center gap-2"
                >
                  <UserPlus className={iconSize.sm} />
                  Add IT Admin
                </button>
              </div>
            </div>
          </div>
          {itAdmins.length > 0 ? (
            <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
              {itAdmins.map((user) => (
                <div key={user.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-display font-bold ${text.primary}`}>{user.name}</h3>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getRoleBadge(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-2">
                          <Mail className={`${iconSize.sm} ${text.muted}`} />
                          <span className={`font-mono text-xs ${text.muted}`}>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className={`${iconSize.sm} ${text.muted}`} />
                            <span className={`font-mono text-xs ${text.muted}`}>{user.phone}</span>
                          </div>
                        )}
                        {user.branch_id && branches[user.branch_id] && (
                          <div className="flex items-center gap-2">
                            <MapPin className={`${iconSize.sm} text-amber-400`} />
                            <span className={`font-mono text-xs text-amber-400`}>{branches[user.branch_id]}</span>
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
              <div className="flex gap-2">
                <button
                  onClick={() => setBulkImportType('employee')}
                  className="px-3 py-2 border border-purple-400/30 bg-purple-400/5 text-purple-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-purple-400/20 transition-all flex items-center gap-2"
                >
                  <Upload className={iconSize.sm} />
                  Bulk Import
                </button>
                <button
                  onClick={() => handleAddUser('employee')}
                  className="px-3 py-2 border border-purple-400/30 bg-purple-400/10 text-purple-400 font-mono font-bold text-xs uppercase tracking-widest hover:bg-purple-400/20 transition-all flex items-center gap-2"
                >
                  <UserPlus className={iconSize.sm} />
                  Add Employee
                </button>
              </div>
            </div>
          </div>
          {subUsers.length > 0 ? (
            <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
              {subUsers.map((user) => (
                <div key={user.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-display font-bold ${text.primary}`}>{user.name || user.email}</h3>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getRoleBadge('employee')}`}>
                          Employee
                        </span>
                        <span className={`px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${getStatusBadge(user.status)}`}>
                          {user.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-2">
                          <Mail className={`${iconSize.sm} ${text.muted}`} />
                          <span className={`font-mono text-xs ${text.muted}`}>{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className={`${iconSize.sm} ${text.muted}`} />
                            <span className={`font-mono text-xs ${text.muted}`}>{user.phone}</span>
                          </div>
                        )}
                        {user.department && (
                          <div className="flex items-center gap-2">
                            <Briefcase className={`${iconSize.sm} text-purple-400`} />
                            <span className={`font-mono text-xs text-purple-400`}>{user.department}</span>
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

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={bulkImportType !== null}
        onClose={() => setBulkImportType(null)}
        title={bulkImportType === 'it_admin' ? 'Bulk Import IT Admins' : 'Bulk Import Employees'}
        description={
          bulkImportType === 'it_admin'
            ? 'Upload a CSV file to create multiple IT Admin accounts at once.'
            : 'Upload a CSV file to create multiple employee accounts at once.'
        }
        columns={bulkImportType === 'it_admin' ? itAdminBulkColumns : subUserBulkColumns}
        onImport={handleBulkImport}
        onSuccess={() => {
          fetchEnterpriseDetails();
        }}
      />
    </div>
  );
}

export default EnterpriseDetail;
