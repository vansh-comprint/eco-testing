import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { text } from '@/lib/design-tokens';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Validation schema
const addUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  role: z.string().min(1, 'Role is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  status: z.string().default('active'),
}).refine((data) => {
  // Password required for non-employee roles
  if (data.role !== 'employee' && !data.password) {
    return false;
  }
  return true;
}, {
  message: 'Password is required for admin roles',
  path: ['password'],
});

type AddUserForm = z.infer<typeof addUserSchema>;

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      status: 'active',
    },
  });

  const onSubmit = async (data: AddUserForm) => {
    setIsSubmitting(true);
    try {
      // Call the backend API to create user
      const result = await usersApi.create({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        password: data.password,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create user');
      }

      addToast({
        type: 'success',
        title: 'User Created',
        message: `${data.name} has been added successfully. They can now log in with their credentials.`,
        duration: 5000,
      });

      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('❌ Error creating user:', error);

      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create user. Please try again.',
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'ops_admin', label: 'OPS Admin' },
    { value: 'it_admin', label: 'IT Admin' },
    { value: 'org_admin', label: 'Org Admin' },
    { value: 'logistics_admin', label: 'Logistics Admin' },
    { value: 'logistics_user', label: 'Logistics User' },
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New User"
      description="Create a new user account"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <Input
            label="Full Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="John Doe"
            required
            autoFocus
          />

          <Input
            label="Email Address"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="john@example.com"
            required
          />

          <Input
            label="Phone Number"
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="+91-9876543210"
          />

          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="Min. 8 characters (required for admin roles)"
            required
          />

          <div>
            <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
              Role <span className="text-red-500">*</span>
            </label>
            <select
              {...register('role')}
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
            >
              <option value="">Select a role...</option>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>
            )}
          </div>

          <div>
            <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
              Status
            </label>
            <select
              {...register('status')}
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="font-mono text-xs text-blue-800 dark:text-blue-200 font-bold mb-1">
              Note:
            </p>
            <ul className="font-mono text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>User will be able to log in with their email and password</li>
              <li>Password is required for all admin roles</li>
              <li>Employees use OTP-based login (no password needed)</li>
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
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
