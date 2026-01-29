import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Key, Save } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, Badge, useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { text } from '@/lib/design-tokens';

interface UserData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  enterprise_id?: string;
  created_at: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: UserData;
}

// Validation schemas
const userDetailsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  role: z.string(),
  status: z.string(),
});

const passwordResetSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserDetailsForm = z.infer<typeof userDetailsSchema>;
type PasswordResetForm = z.infer<typeof passwordResetSchema>;

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'password'>('details');
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User Details Form
  const {
    register: registerDetails,
    handleSubmit: handleSubmitDetails,
    formState: { errors: detailsErrors },
    reset: resetDetails,
  } = useForm<UserDetailsForm>({
    resolver: zodResolver(userDetailsSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
    },
  });

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
    setIsSubmitting(true);
    try {
      console.log('📝 Updating user details:', user.id);

      // Update user via API
      await usersApi.update(user.id, {
        name: data.name,
        phone: data.phone || undefined,
        status: data.status,
      });

      console.log('✅ User details updated successfully');

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
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitPassword = async (data: PasswordResetForm) => {
    setIsSubmitting(true);
    try {
      // Use REST API to reset password
      const result = await usersApi.resetPassword(user.id, {
        new_password: data.newPassword,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to reset password');
      }

      console.log('✅ Password reset successfully');

      addToast({
        type: 'success',
        title: 'Password Updated',
        message: `Password for ${user.email} has been changed successfully.`,
        duration: 10000,
      });

      resetPassword();
      setActiveTab('details');
      onSuccess?.();
    } catch (error) {
      console.error('❌ Error resetting password:', error);

      addToast({
        type: 'error',
        title: 'Password Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update password',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetDetails();
      resetPassword();
      setActiveTab('details');
      onClose();
    }
  };

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'main_admin', label: 'Main Admin' },
    { value: 'it_admin', label: 'IT Admin' },
    { value: 'org_admin', label: 'Org Admin' },
    { value: 'logistics_admin', label: 'Logistics Admin' },
    { value: 'logistics_user', label: 'Logistics User' },
    { value: 'sub_user', label: 'Sub User' },
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' },
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
          className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
            activeTab === 'details'
              ? 'border-b-2 border-lime-500 text-lime-600 dark:text-lime-400'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
          }`}
        >
          <User className="w-4 h-4 inline mr-2" />
          User Details
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
            activeTab === 'password'
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
        <form onSubmit={handleSubmitDetails(onSubmitDetails)}>
          <div className="space-y-4">
            <div className="p-4 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded">
              <p className={`font-mono text-xs ${text.muted}`}>
                <span className="font-bold">User ID:</span> {user.id}
              </p>
              <p className={`font-mono text-xs ${text.muted} mt-1`}>
                <span className="font-bold">Created:</span>{' '}
                {new Date(user.created_at).toLocaleDateString()}
              </p>
              {user.enterprise_id && (
                <p className={`font-mono text-xs ${text.muted} mt-1`}>
                  <span className="font-bold">Enterprise ID:</span> {user.enterprise_id}
                </p>
              )}
            </div>

            <Input
              label="Full Name"
              {...registerDetails('name')}
              error={detailsErrors.name?.message}
              placeholder="John Doe"
              required
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
              placeholder="+91-9876543210"
            />

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
              placeholder="Min. 8 characters"
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
                Direct Password Update:
              </p>
              <ul className="font-mono text-xs text-emerald-700 dark:text-emerald-300 space-y-1 list-disc list-inside">
                <li>Password will be updated immediately</li>
                <li>User can log in with new password right away</li>
                <li>Share the new password securely with the user</li>
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
