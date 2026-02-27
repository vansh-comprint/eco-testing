import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Key, Save } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, Badge, useToast } from '@/components/ui';
import { useUpdateUser, useResetUserPassword, useEnterprises, useAllUsers, useBranches } from '@/hooks';
import { nameSchema, emailSchema, passwordSchema, optionalPhoneSchema } from '@/lib/validation';
import { text } from '@/lib/design-tokens';

interface UserData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  enterprise_id?: string;
  enterprise_name?: string;
  branch_id?: string;
  created_at: string;
}

interface RoleOption {
  value: string;
  label: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: UserData;
  allowedRoles?: RoleOption[];
  hideRole?: boolean;
}

// Roles that require an enterprise
const ENTERPRISE_ROLES = ['it_admin', 'org_admin', 'employee'];
// Roles that require a parent logistics admin
const LOGISTICS_USER_ROLE = 'logistics_user';

// Validation schemas
const userDetailsSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  role: z.string(),
  status: z.string(),
  enterprise_id: z.string().optional(),
  branch_id: z.string().optional(),
  parent_user_id: z.string().optional(),
}).refine((data) => {
  if (ENTERPRISE_ROLES.includes(data.role) && !data.enterprise_id) {
    return false;
  }
  return true;
}, {
  message: 'Enterprise is required for this role',
  path: ['enterprise_id'],
}).refine((data) => {
  if (data.role === LOGISTICS_USER_ROLE && !data.parent_user_id) {
    return false;
  }
  return true;
}, {
  message: 'Logistics Admin is required for Logistics User',
  path: ['parent_user_id'],
});

const passwordResetSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserDetailsForm = z.infer<typeof userDetailsSchema>;
type PasswordResetForm = z.infer<typeof passwordResetSchema>;

const ALL_ROLES: RoleOption[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'ops_admin', label: 'OPS Admin' },
  { value: 'it_admin', label: 'IT Admin' },
  { value: 'org_admin', label: 'Org Admin' },
  { value: 'logistics_admin', label: 'Logistics Admin' },
  { value: 'logistics_user', label: 'Logistics User' },
  { value: 'employee', label: 'Employee' },
];

export function EditUserModal({ isOpen, onClose, onSuccess, user, allowedRoles, hideRole }: EditUserModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'password'>('details');
  const { addToast } = useToast();

  // Use mutation hooks
  const updateUserMutation = useUpdateUser();
  const resetPasswordMutation = useResetUserPassword();

  // Fetch enterprises for enterprise-role selection
  const { data: enterprises = [], isLoading: enterprisesLoading } = useEnterprises();

  // Fetch logistics admins for logistics-user parent selection
  const { data: logisticsAdmins = [], isLoading: logisticsAdminsLoading } = useAllUsers({
    role: 'logistics_admin',
    limit: 100,
  });

  // Fetch branches for the user's enterprise (for IT Admin branch assignment)
  const { data: branches = [], isLoading: branchesLoading } = useBranches(user.enterprise_id || '');

  // User Details Form
  const {
    register: registerDetails,
    handleSubmit: handleSubmitDetails,
    formState: { errors: detailsErrors },
    reset: resetDetails,
    watch,
    setValue,
  } = useForm<UserDetailsForm>({
    resolver: zodResolver(userDetailsSchema) as any,
    defaultValues: {
      name: user.name,
      email: user.email,
      phone: (user.phone || '').replace(/^\+91[\s-]?/, ''),
      role: user.role,
      status: user.status,
      enterprise_id: user.enterprise_id || '',
      branch_id: user.branch_id || '',
      parent_user_id: '',
    },
  });

  // Watch role field for conditional rendering
  const selectedRole = watch('role');
  const needsEnterprise = ENTERPRISE_ROLES.includes(selectedRole || '');
  const needsBranch = selectedRole === 'it_admin';
  const needsLogisticsAdmin = selectedRole === LOGISTICS_USER_ROLE;

  // Clear conditional fields when role changes
  useEffect(() => {
    if (!ENTERPRISE_ROLES.includes(selectedRole || '')) {
      setValue('enterprise_id', '');
    }
    if (selectedRole !== 'it_admin') {
      setValue('branch_id', '');
    }
    if (selectedRole !== LOGISTICS_USER_ROLE) {
      setValue('parent_user_id', '');
    }
  }, [selectedRole, setValue]);

  // Filter to only active enterprises
  const activeEnterprises = enterprises.filter((e: any) => e.status === 'active' || e.is_active);

  // Password Reset Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordResetForm>({
    resolver: zodResolver(passwordResetSchema),
  });

  const onSubmitDetails = async (data: UserDetailsForm) => {
    try {
      console.log('📝 Updating user details:', user.id);

      await updateUserMutation.mutateAsync({
        userId: user.id,
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          role: data.role,
          status: data.status,
          enterprise_id: ENTERPRISE_ROLES.includes(data.role) ? data.enterprise_id : undefined,
          branch_id: data.role === 'it_admin' ? (data.branch_id || null) : undefined,
          parent_user_id: data.role === LOGISTICS_USER_ROLE ? data.parent_user_id : undefined,
        },
      });

      addToast({
        type: 'success',
        title: 'User Updated',
        message: `${user.name}'s details have been updated successfully`,
        duration: 5000,
      });

      resetDetails();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('❌ Error updating user:', error);

      addToast({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update user. Please try again.',
        duration: 6000,
      });
    }
  };

  const onSubmitPassword = async (data: PasswordResetForm) => {
    try {
      await resetPasswordMutation.mutateAsync({
        userId: user.id,
        data: {
          new_password: data.newPassword,
        },
      });

      console.log('✅ Password reset successfully');

      addToast({
        type: 'success',
        title: 'Password Updated',
        message: `Password for ${user.email} has been changed successfully.`,
        duration: 10000,
      });

      resetPassword();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('❌ Error resetting password:', error);

      addToast({
        type: 'error',
        title: 'Password Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update password',
        duration: 10000,
      });
    }
  };

  const handleClose = () => {
    const isSubmitting = updateUserMutation.isPending || resetPasswordMutation.isPending;
    if (!isSubmitting) {
      resetDetails();
      resetPassword();
      setActiveTab('details');
      onClose();
    }
  };

  const isSubmitting = updateUserMutation.isPending || resetPasswordMutation.isPending;

  const roles = allowedRoles || ALL_ROLES;

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit User"
      description={`Manage ${user.name}'s account`}
      size="lg"
    >
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-zinc-700 mb-6">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'details'
            ? 'border-b-2 border-lime-500 text-lime-600 dark:text-lime-400'
            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          User Details
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'password'
            ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400'
            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
        >
          <Key className="w-4 h-4 inline mr-2" />
          Reset Password
        </button>
      </div>

      {/* User Details Tab */}
      {activeTab === 'details' && (
        <form onSubmit={handleSubmitDetails(onSubmitDetails as any)}>
          <div className="space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded">
              <p className={`font-mono text-xs ${text.muted}`}>
                <span className="font-bold">Created:</span>{' '}
                {new Date(user.created_at).toLocaleDateString()}
              </p>
              {user.enterprise_name && (
                <p className={`font-mono text-xs ${text.muted} mt-1`}>
                  <span className="font-bold">Enterprise:</span> {user.enterprise_name}
                </p>
              )}
            </div>

            <Input
              label="Full Name"
              {...registerDetails('name')}
              error={detailsErrors.name?.message}
              placeholder="John Doe"
              required
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                const input = e.currentTarget;
                input.value = input.value.replace(/[^a-zA-Z\s'.\-]/g, '');
              }}
            />

            <Input
              label="Email Address"
              type="email"
              {...registerDetails('email')}
              error={detailsErrors.email?.message}
              placeholder="john@example.com"
              required
            />

            <Input
              label="Phone Number"
              {...registerDetails('phone')}
              error={detailsErrors.phone?.message}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10);
              }}
            />

            {!hideRole && (
              <div>
                <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
                  Role
                </label>
                <select
                  {...registerDetails('role')}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {detailsErrors.role && (
                  <p className="mt-1 text-xs text-red-500">{detailsErrors.role.message}</p>
                )}
              </div>
            )}

            <div>
              <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
                Status
              </label>
              <select
                {...registerDetails('status')}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
              >
                {statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              {detailsErrors.status && (
                <p className="mt-1 text-xs text-red-500">{detailsErrors.status.message}</p>
              )}
            </div>

            {/* Enterprise selector - shown for IT Admin, Org Admin, Employee */}
            {needsEnterprise && !user.enterprise_id && (
              <div>
                <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
                  Enterprise <span className="text-red-500">*</span>
                </label>
                <select
                  {...registerDetails('enterprise_id')}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
                >
                  <option value="">
                    {enterprisesLoading ? 'Loading...' : 'Select an enterprise...'}
                  </option>
                  {activeEnterprises.map((ent: any) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
                {detailsErrors.enterprise_id && (
                  <p className="mt-1 text-xs text-red-500">{detailsErrors.enterprise_id.message}</p>
                )}
              </div>
            )}

            {/* Branch selector - shown for IT Admin */}
            {needsBranch && user.enterprise_id && (
              <div>
                <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
                  Branch
                </label>
                <select
                  {...registerDetails('branch_id')}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
                >
                  <option value="">
                    {branchesLoading ? 'Loading...' : 'No branch (unassigned)'}
                  </option>
                  {branches.map((branch: any) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_name || branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Logistics Admin selector - shown for Logistics User */}
            {needsLogisticsAdmin && (
              <div>
                <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
                  Logistics Admin <span className="text-red-500">*</span>
                </label>
                <select
                  {...registerDetails('parent_user_id')}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
                >
                  <option value="">
                    {logisticsAdminsLoading ? 'Loading...' : 'Select a logistics admin...'}
                  </option>
                  {logisticsAdmins
                    .filter((u: any) => u.status === 'active')
                    .map((admin: any) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.company_name ? `${admin.company_name} (${admin.name})` : admin.name}
                      </option>
                    ))}
                </select>
                {detailsErrors.parent_user_id && (
                  <p className="mt-1 text-xs text-red-500">{detailsErrors.parent_user_id.message}</p>
                )}
              </div>
            )}
          </div>

          <ModalFooter className="mt-6">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </ModalFooter>
        </form>
      )}

      {/* Password Reset Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
          <div className="space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded">
              <p className={`font-mono text-xs ${text.muted}`}>
                <span className="font-bold">User:</span> {user.name}
              </p>
              <p className={`font-mono text-xs ${text.muted} mt-1`}>
                <span className="font-bold">Email:</span> {user.email}
              </p>
            </div>

            <Input
              label="New Password"
              type="password"
              {...registerPassword('newPassword')}
              error={passwordErrors.newPassword?.message}
              placeholder="Letters, numbers & special chars"
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              {...registerPassword('confirmPassword')}
              error={passwordErrors.confirmPassword?.message}
              placeholder="Re-enter password"
              required
            />

            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded">
              <p className="font-mono text-xs text-emerald-800 dark:text-emerald-200 font-bold mb-1">
                Password Requirements:
              </p>
              <ul className="font-mono text-xs text-emerald-700 dark:text-emerald-300 space-y-1 list-disc list-inside">
                <li>Minimum 8 characters</li>
                <li>At least one letter (a-z, A-Z)</li>
                <li>At least one number (0-9)</li>
                <li>At least one special character (!@#$...)</li>
              </ul>
            </div>
          </div>

          <ModalFooter className="mt-6">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={<Key className="w-4 h-4" />}
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
