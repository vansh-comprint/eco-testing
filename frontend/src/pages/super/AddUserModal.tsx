import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { useCreateUser, useEnterprises, useAllUsers } from '@/hooks';
import { passwordSchema, PASSWORD_HINT } from '@/lib/validation';
import { text } from '@/lib/design-tokens';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Roles that require an enterprise
const ENTERPRISE_ROLES = ['it_admin', 'org_admin', 'employee'];
// Roles that require a parent logistics admin
const LOGISTICS_USER_ROLE = 'logistics_user';

// Validation schema
const addUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .regex(/^[a-zA-Z\s'.\-]+$/, 'Name must contain only letters, spaces, hyphens, or apostrophes'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Phone must be 10-15 digits (optional + prefix)')
    .optional()
    .or(z.literal('')),
  role: z.string().min(1, 'Role is required'),
  password: passwordSchema.optional(),
  status: z.string().default('active'),
  enterprise_id: z.string().optional(),
  parent_user_id: z.string().optional(),
}).refine((data) => {
  // Password required for non-employee roles
  if (data.role !== 'employee' && !data.password) {
    return false;
  }
  return true;
}, {
  message: 'Password is required for admin roles',
  path: ['password'],
}).refine((data) => {
  // Enterprise required for enterprise roles
  if (ENTERPRISE_ROLES.includes(data.role) && !data.enterprise_id) {
    return false;
  }
  return true;
}, {
  message: 'Enterprise is required for this role',
  path: ['enterprise_id'],
}).refine((data) => {
  // Parent logistics admin required for logistics users
  if (data.role === LOGISTICS_USER_ROLE && !data.parent_user_id) {
    return false;
  }
  return true;
}, {
  message: 'Logistics Admin is required for Logistics User',
  path: ['parent_user_id'],
});

type AddUserForm = z.infer<typeof addUserSchema>;

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const { addToast } = useToast();
  const createUserMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema) as any,
    defaultValues: {
      status: 'active',
    },
  });

  // Watch the role field to show/hide conditional fields
  const selectedRole = watch('role');

  // Fetch enterprises for enterprise-role selection
  const { data: enterprises = [], isLoading: enterprisesLoading } = useEnterprises();

  // Fetch logistics admins for logistics-user parent selection
  const { data: logisticsAdmins = [], isLoading: logisticsAdminsLoading } = useAllUsers({
    role: 'logistics_admin',
    limit: 100,
  });

  // Clear conditional fields when role changes
  useEffect(() => {
    if (!ENTERPRISE_ROLES.includes(selectedRole || '')) {
      setValue('enterprise_id', '');
    }
    if (selectedRole !== LOGISTICS_USER_ROLE) {
      setValue('parent_user_id', '');
    }
  }, [selectedRole, setValue]);

  const onSubmit = async (data: AddUserForm) => {
    try {
      await createUserMutation.mutateAsync({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        password: data.password,
        status: data.status,
        enterprise_id: ENTERPRISE_ROLES.includes(data.role) ? data.enterprise_id : undefined,
        parent_user_id: data.role === LOGISTICS_USER_ROLE ? data.parent_user_id : undefined,
      });

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
      console.error('Error creating user:', error);

      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create user. Please try again.',
        duration: 6000,
      });
    }
  };

  const handleClose = () => {
    if (!createUserMutation.isPending) {
      reset();
      onClose();
    }
  };

  const isSubmitting = createUserMutation.isPending;

  const roles = [
    { value: 'ops_admin', label: 'OPS Admin' },
    { value: 'org_admin', label: 'Org Admin' },
    { value: 'it_admin', label: 'IT Admin' },
    { value: 'employee', label: 'Employee' },
    { value: 'logistics_admin', label: 'Logistics Admin' },
    { value: 'logistics_user', label: 'Logistics User' },
  ];

  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const needsEnterprise = ENTERPRISE_ROLES.includes(selectedRole || '');
  const needsLogisticsAdmin = selectedRole === LOGISTICS_USER_ROLE;
  const isEmployee = selectedRole === 'employee';

  // Filter to only active enterprises
  const activeEnterprises = enterprises.filter((e: any) => e.status === 'active' || e.is_active);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New User"
      description="Create a new user account"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit as any)}>
        <div className="space-y-4">
          <Input
            label="Full Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="John Doe"
            required
            autoFocus
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              // Strip numeric characters in real-time
              const input = e.currentTarget;
              input.value = input.value.replace(/[0-9]/g, '');
            }}
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
            placeholder="9876543210"
            inputMode="numeric"
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              // Allow only digits and leading +
              const input = e.currentTarget;
              input.value = input.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '');
            }}
          />

          {!isEmployee && (
            <Input
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder={PASSWORD_HINT}
              required
            />
          )}

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

          {/* Enterprise selector - shown for IT Admin, Org Admin, Employee */}
          {needsEnterprise && (
            <div>
              <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
                Enterprise <span className="text-red-500">*</span>
              </label>
              <select
                {...register('enterprise_id')}
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
              {errors.enterprise_id && (
                <p className="mt-1 text-xs text-red-500">{errors.enterprise_id.message}</p>
              )}
            </div>
          )}

          {/* Logistics Admin selector - shown for Logistics User */}
          {needsLogisticsAdmin && (
            <div>
              <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
                Logistics Admin <span className="text-red-500">*</span>
              </label>
              <select
                {...register('parent_user_id')}
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
              {errors.parent_user_id && (
                <p className="mt-1 text-xs text-red-500">{errors.parent_user_id.message}</p>
              )}
            </div>
          )}

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
              <li>Password is required for all roles except Employee</li>
              <li>Employees use OTP-based login (default password set automatically)</li>
              {needsEnterprise && <li>Selected enterprise determines the user's data scope</li>}
              {needsLogisticsAdmin && <li>Logistics User will be managed by the selected Logistics Admin</li>}
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
