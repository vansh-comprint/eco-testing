/**
 * ITAdminInvite - Page for inviting/creating new IT Admins
 * V3: Part of Org Admin portal - Enterprise → Branch → IT Admin hierarchy
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  UserPlus,
  CheckCircle,
  Plus,
  X,
  Send,
  ArrowRight,
  Info,
  Building2
} from 'lucide-react';
import { useAuth, useBranches, useCreateITAdmin, useApiError } from '@/hooks';

interface InviteFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  branch_id: string;
}

const initialFormData: InviteFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  branch_id: '',
};

// Generate a random password
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function ITAdminInvite() {
  const navigate = useNavigate();
  // V3: Use React Query hook for auth
  const { enterprise } = useAuth();
  const { data: branches = [] } = useBranches(enterprise?.id || '');
  const createITAdmin = useCreateITAdmin();
  const { handleError, showSuccess, showWarning } = useApiError();

  const [invites, setInvites] = useState<InviteFormData[]>([{ ...initialFormData, password: generatePassword() }]);
  const [isLoading, setIsLoading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [createdAdmins, setCreatedAdmins] = useState<Array<{ email: string; password: string }>>([]);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<number, Record<string, string>> = {};
    let isValid = true;

    invites.forEach((invite, index) => {
      const fieldErrors: Record<string, string> = {};

      if (!invite.name.trim()) {
        fieldErrors.name = 'Name is required';
        isValid = false;
      }

      if (!invite.email.trim()) {
        fieldErrors.email = 'Email is required';
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invite.email)) {
        fieldErrors.email = 'Invalid email format';
        isValid = false;
      }

      if (!invite.password || invite.password.length < 8) {
        fieldErrors.password = 'Password must be at least 8 characters';
        isValid = false;
      }

      if (!invite.branch_id) {
        fieldErrors.branch_id = 'Branch assignment is required for IT Admins';
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
    setInvites(prev => [...prev, { ...initialFormData, password: generatePassword() }]);
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

  const regeneratePassword = (index: number) => {
    handleChange(index, 'password', generatePassword());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !enterprise?.id) return;

    setIsLoading(true);
    const created: Array<{ email: string; password: string }> = [];
    const failed: Array<{ email: string; error: string }> = [];

    try {
      for (const invite of invites) {
        try {
          await createITAdmin.mutateAsync({
            enterprise_id: enterprise.id,
            branch_id: invite.branch_id || undefined,
            name: invite.name,
            email: invite.email,
            phone: invite.phone || undefined,
            password: invite.password,
          });
          created.push({ email: invite.email, password: invite.password });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          failed.push({ email: invite.email, error: errorMessage });
          handleError(err, `Creating IT Admin ${invite.email}`);
        }
      }

      if (created.length > 0) {
        setCreatedAdmins(created);
        setSuccessCount(created.length);

        if (failed.length > 0) {
          showWarning(
            'Partial Success',
            `Created ${created.length} IT Admin(s), but ${failed.length} failed.`
          );
        } else {
          showSuccess(
            'IT Admins Created',
            `Successfully created ${created.length} IT Admin account(s).`
          );
        }
      } else if (failed.length > 0) {
        // All failed - error toasts already shown by handleError
      }
    } catch (error) {
      handleError(error, 'Creating IT Admins');
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
              IT Admins Created
            </h2>
            <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
              Total Created
            </p>
            <p className="font-brand font-bold text-4xl text-ecotribe-primary mb-6">
              {successCount}
            </p>

            {/* Credentials List */}
            <div className="text-left mb-6 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">
                Login Credentials (Save These!)
              </p>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {createdAdmins.map((admin, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10">
                    <p className="font-mono text-xs text-slate-600 dark:text-white/70">
                      <span className="text-slate-400 dark:text-white/40">Email:</span> {admin.email}
                    </p>
                    <p className="font-mono text-xs text-slate-600 dark:text-white/70">
                      <span className="text-slate-400 dark:text-white/40">Password:</span> {admin.password}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="font-display text-sm text-slate-500 dark:text-white/50 mb-8 uppercase tracking-wide">
              Share these credentials securely with the IT Admins
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setSuccessCount(null);
                  setCreatedAdmins([]);
                  setInvites([{ ...initialFormData, password: generatePassword() }]);
                }}
                className="interactive px-6 py-3 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add More
              </button>
              <button
                onClick={() => navigate('/org-admin/it-admins')}
                className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                View IT Admins
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
            onClick={() => navigate('/org-admin/it-admins')}
            className="interactive flex items-center gap-2 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to IT Admins
          </button>

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
              <UserPlus className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Team</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
                Add IT Admins
              </h1>
              <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-1 uppercase tracking-wide">
                Create IT Admin accounts for branch management
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
            <p className="font-display font-bold text-sm text-black dark:text-white uppercase tracking-wide mb-2">IT Admin Responsibilities</p>
            <ul className="font-mono text-xs text-slate-500 dark:text-white/50 space-y-1">
              <li>• Manage assets and create batches for their assigned branch</li>
              <li>• Invite employees who check-in their devices</li>
              <li>• Submit batches for pickup approval</li>
              <li>• Track pickup status and coordinate logistics</li>
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
                {invites.length > 1 ? `IT Admin ${index + 1}` : 'IT Admin Details'}
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
                  placeholder="e.g., Rajesh Kumar"
                  value={invite.name}
                  onChange={(e) => handleChange(index, 'name', e.target.value)}
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
                    placeholder="rajesh@company.com"
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
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={invite.phone}
                    onChange={(e) => handleChange(index, 'phone', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invite.password}
                    onChange={(e) => handleChange(index, 'password', e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => regeneratePassword(index)}
                    className="px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 font-mono text-xs uppercase tracking-wide hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Generate
                  </button>
                </div>
                {errors[index]?.password && (
                  <p className="mt-2 font-mono text-xs text-red-400">{errors[index].password}</p>
                )}
              </div>

              {/* Branch Assignment */}
              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">
                  Assign to Branch *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30" />
                  <select
                    value={invite.branch_id}
                    onChange={(e) => handleChange(index, 'branch_id', e.target.value)}
                    className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none cursor-pointer ${
                      errors[index]?.branch_id ? 'border-red-500' : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <option value="" className="bg-white dark:bg-[#0a0a0a]">Select a branch...</option>
                    {branches.map((branch: any) => (
                      <option key={branch.id} value={branch.id} className="bg-white dark:bg-[#0a0a0a]">
                        {branch.branch_name} ({branch.branch_code})
                      </option>
                    ))}
                  </select>
                </div>
                {errors[index]?.branch_id && (
                  <p className="mt-2 font-mono text-xs text-red-400">{errors[index].branch_id}</p>
                )}
                {branches.length === 0 && (
                  <p className="mt-2 font-mono text-[10px] text-amber-500">
                    No branches found. Create a branch first in Branch Management.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add Another Button */}
        <motion.button
          type="button"
          onClick={addInvite}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="interactive w-full p-5 border-2 border-dashed border-white/10 hover:border-ecotribe-primary/30 text-slate-500 dark:text-white/50 hover:text-ecotribe-primary transition-all flex items-center justify-center gap-2 font-mono font-bold text-xs uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" />
          Add Another IT Admin
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
            onClick={() => navigate('/org-admin/it-admins')}
            disabled={isLoading}
            className="interactive px-6 py-3 text-slate-500 dark:text-white/50 hover:text-white font-mono font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
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
            Create {invites.length > 1 ? `${invites.length} IT Admins` : 'IT Admin'}
          </button>
        </motion.div>
      </form>
    </div>
  );
}

export default ITAdminInvite;
