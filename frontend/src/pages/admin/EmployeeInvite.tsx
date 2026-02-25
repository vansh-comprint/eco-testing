import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  UserPlus,
  Mail,
  CheckCircle,
  Plus,
  X,
  Send,
  ArrowRight,
  Info
} from 'lucide-react';
import { useAuth, useCreateSubUsers, useApiError, useEmployeeBasePath } from '@/hooks';
import { BranchSelector } from '@/components/ui';

interface InviteFormData {
  name: string;
  email: string;
  phone: string;
  department: string;
  customDepartment: string;  // For "Other" department option
  branch_id: string;
}

const DEPARTMENTS = [
  { label: 'Engineering', value: 'Engineering' },
  { label: 'Marketing', value: 'Marketing' },
  { label: 'HR', value: 'HR' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Operations', value: 'Operations' },
  { label: 'Sales', value: 'Sales' },
  { label: 'IT', value: 'IT' },
  { label: 'Other', value: 'Other' },
];

const initialFormData: InviteFormData = {
  name: '',
  email: '',
  phone: '',
  department: '',
  customDepartment: '',
  branch_id: '',
};

export function EmployeeInvite() {
  const navigate = useNavigate();
  const location = useLocation();
  // V3: Use React Query hooks
  const { user } = useAuth();
  const { enterpriseId, basePath, isEnterpriseNested } = useEmployeeBasePath();
  const createSubUsersMutation = useCreateSubUsers();
  const { handleError, showSuccess } = useApiError();

  // V3.2: Detect if we're in Org Admin context (true for org_admin role, org-admin portal, or enterprise-nested super/ops routes)
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin') || isEnterpriseNested;

  // Branch linking: IT Admin uses their user ID, Org Admin / nested enterprise uses enterprise ID
  const branchSelectorUserId = !isOrgAdmin ? (user?.id || '') : undefined;

  const [invites, setInvites] = useState<InviteFormData[]>([{ ...initialFormData }]);
  const [isLoading, setIsLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<number, Record<string, string>> = {};
    let isValid = true;
    const seenEmails = new Set<string>();

    invites.forEach((invite, index) => {
      const fieldErrors: Record<string, string> = {};

      // Name validation - required, letters only
      if (!invite.name.trim()) {
        fieldErrors.name = 'Name is required';
        isValid = false;
      } else if (!/^[a-zA-Z\s]+$/.test(invite.name.trim())) {
        fieldErrors.name = 'Name must contain only letters';
        isValid = false;
      } else if (invite.name.trim().length < 2) {
        fieldErrors.name = 'Name must be at least 2 characters';
        isValid = false;
      }

      // Email validation - required, format, no duplicates in batch
      const emailLower = invite.email.trim().toLowerCase();
      if (!invite.email.trim()) {
        fieldErrors.email = 'Email is required';
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email)) {
        fieldErrors.email = 'Invalid email format';
        isValid = false;
      } else if (seenEmails.has(emailLower)) {
        fieldErrors.email = 'Duplicate email in this batch';
        isValid = false;
      } else {
        seenEmails.add(emailLower);
      }

      // Phone validation - REQUIRED, 10 digit Indian mobile
      if (!invite.phone.trim()) {
        fieldErrors.phone = 'Phone number is required';
        isValid = false;
      } else {
        const phoneDigits = invite.phone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
          fieldErrors.phone = 'Phone must be 10 digits';
          isValid = false;
        } else if (!/^[6-9]/.test(phoneDigits)) {
          fieldErrors.phone = 'Invalid Indian mobile number';
          isValid = false;
        }
      }

      // Department validation
      if (!invite.department) {
        fieldErrors.department = 'Department is required';
        isValid = false;
      } else if (invite.department === 'Other' && !invite.customDepartment.trim()) {
        fieldErrors.customDepartment = 'Please specify the department';
        isValid = false;
      }

      // Branch validation — required for Org Admin (they have no default branch)
      if (isOrgAdmin && !invite.branch_id) {
        fieldErrors.branch_id = 'Branch is required';
        isValid = false;
      }

      if (Object.keys(fieldErrors).length > 0) {
        newErrors[index] = fieldErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (index: number, field: keyof InviteFormData, value: string) => {
    setInvites(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Clear error for this field
    if (errors[index]?.[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        if (updated[index]) {
          delete updated[index][field];
          if (Object.keys(updated[index]).length === 0) {
            delete updated[index];
          }
        }
        return updated;
      });
    }
  };

  const addInvite = () => {
    setInvites(prev => [...prev, { ...initialFormData }]);
  };

  const removeInvite = (index: number) => {
    if (invites.length > 1) {
      setInvites(prev => prev.filter((_, i) => i !== index));
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !enterpriseId) return;

    setIsLoading(true);

    try {
      // V3: Create sub-users with enterprise ID using mutation
      await createSubUsersMutation.mutateAsync(
        invites.map(invite => ({
          name: invite.name.trim(),
          email: invite.email.trim().toLowerCase(),
          phone: invite.phone.replace(/\D/g, ''),  // Store only digits
          department: invite.department === 'Other' ? invite.customDepartment.trim() : invite.department,
          enterprise_id: enterpriseId,
          branch_id: invite.branch_id || undefined,
        }))
      );

      setSuccessCount(invites.length);
      showSuccess('Invitations Sent', `${invites.length} employee${invites.length > 1 ? 's' : ''} invited successfully`);
    } catch (error) {
      handleError(error, 'Sending invitations');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (successCount !== null) {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer"
        >
          <div className="py-16 px-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-16 h-16 border border-emerald-400/30 bg-emerald-400/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </motion.div>

            <h2 className="font-brand font-bold text-2xl text-black dark:text-white uppercase tracking-tight mb-3">
              Invitations Sent
            </h2>
            <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
              Total Invites
            </p>
            <p className="font-brand font-bold text-4xl text-ecotribe-primary mb-6">
              {successCount}
            </p>

            <p className="font-display text-sm text-slate-500 dark:text-white/50 mb-8 uppercase tracking-wide">
              Sub-users will receive an email with login instructions
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setSuccessCount(null);
                  setInvites([{ ...initialFormData }]);
                }}
                className="interactive px-6 py-3 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Invite More
              </button>
              <button
                onClick={() => navigate(`${basePath}/employees`)}
                className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                View Employees
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(`${basePath}/employees`)}
            className="interactive flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
              <UserPlus className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Team</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Invite Employees
              </h1>
              <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-1 uppercase tracking-wide">
                Invite employees to check-in their devices
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-blue-400/20 bg-blue-400/5 p-5"
      >
        <div className="flex gap-4">
          <div className="w-10 h-10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-black dark:text-white uppercase tracking-wide mb-2">How It Works</p>
            <ul className="font-mono text-xs text-slate-500 dark:text-white/50 space-y-1">
              <li>• Sub-users receive an email invitation with login credentials</li>
              <li>• They can then log in and check-in their assigned devices</li>
              <li>• You'll be notified when they submit device details</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {invites.map((invite, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            className="bg-white/95 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 btn-chamfer"
          >
            <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <h2 className="font-display font-bold text-sm text-black dark:text-white uppercase tracking-wide">
                {invites.length > 1 ? `Invite ${index + 1}` : 'Employee Details'}
              </h2>
              {invites.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInvite(index)}
                  className="interactive p-2 hover:bg-red-500/10 text-slate-500 dark:text-white/50 hover:text-red-400 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="p-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Vikram Singh"
                  value={invite.name}
                  onChange={(e) => handleChange(index, 'name', e.target.value.replace(/[^a-zA-Z\s'.\-]/g, ''))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                />
                {errors[index]?.name && (
                  <p className="mt-2 font-mono text-xs text-red-400">{errors[index].name}</p>
                )}
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="vikram@company.com"
                    value={invite.email}
                    onChange={(e) => handleChange(index, 'email', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                  {errors[index]?.email && (
                    <p className="mt-2 font-mono text-xs text-red-400">{errors[index].email}</p>
                  )}
                </div>
                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={invite.phone}
                    onChange={(e) => handleChange(index, 'phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    maxLength={10}
                  />
                  {errors[index]?.phone && (
                    <p className="mt-2 font-mono text-xs text-red-400">{errors[index].phone}</p>
                  )}
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                  Department <span className="text-red-400">*</span>
                </label>
                <select
                  value={invite.department}
                  onChange={(e) => {
                    handleChange(index, 'department', e.target.value);
                    // Clear custom department if switching away from Other
                    if (e.target.value !== 'Other') {
                      handleChange(index, 'customDepartment', '');
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-[#0a0a0a]">Select department</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept.value} value={dept.value} className="bg-white dark:bg-[#0a0a0a]">{dept.label}</option>
                  ))}
                </select>
                {errors[index]?.department && (
                  <p className="mt-2 font-mono text-xs text-red-400">{errors[index].department}</p>
                )}
              </div>

              {/* Custom Department (shown when "Other" is selected) */}
              {invite.department === 'Other' && (
                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                    Specify Department <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Research & Development"
                    value={invite.customDepartment}
                    onChange={(e) => handleChange(index, 'customDepartment', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                  {errors[index]?.customDepartment && (
                    <p className="mt-2 font-mono text-xs text-red-400">{errors[index].customDepartment}</p>
                  )}
                </div>
              )}

              {/* Branch Selection */}
              {enterpriseId && (
                <BranchSelector
                  enterpriseId={enterpriseId}
                  userId={branchSelectorUserId}
                  value={invite.branch_id || null}
                  onChange={(branchId) => handleChange(index, 'branch_id', branchId || '')}
                  label="Branch"
                  placeholder={isOrgAdmin ? "Select branch..." : "Select branch (optional)..."}
                  required={isOrgAdmin}
                  error={errors[index]?.branch_id}
                  showAddNew={false}
                  filterActive={true}
                />
              )}
            </div>
          </motion.div>
        ))}

        {/* Add Another Button */}
        <motion.button
          type="button"
          onClick={addInvite}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="interactive w-full p-5 border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-all flex items-center justify-center gap-2 font-mono font-bold text-xs uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          Add Another Invite
        </motion.button>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-end gap-3 pt-4"
        >
          <button
            type="button"
            onClick={() => navigate(`${basePath}/employees`)}
            disabled={isLoading}
            className="interactive px-6 py-3 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white font-mono font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send {invites.length > 1 ? `${invites.length} Invites` : 'Invite'}
          </button>
        </motion.div>
      </form>
    </div>
  );
}

export default EmployeeInvite;
