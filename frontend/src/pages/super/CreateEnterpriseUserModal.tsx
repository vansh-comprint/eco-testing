import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { enterprisesApi } from '@/lib/api/enterprises';
import { branchesApi } from '@/lib/api/branches';
import { text } from '@/lib/design-tokens';

interface Enterprise {
  id: string;
  name: string;
  status: string;
}

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
}

// Validation schema — password required only for it_admin/org_admin, branch required for it_admin
const createEnterpriseUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  password: z.string().optional(),
  enterpriseId: z.string().min(1, 'Enterprise is required'),
  role: z.enum(['it_admin', 'org_admin', 'employee']),
  branchId: z.string().optional(),
}).superRefine((data, ctx) => {
  // Password required for it_admin and org_admin
  if (data.role !== 'employee' && (!data.password || data.password.length < 8)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must be at least 8 characters',
      path: ['password'],
    });
  }
  // Branch required for it_admin
  if (data.role === 'it_admin' && !data.branchId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Branch is required for IT Admin',
      path: ['branchId'],
    });
  }
});

type CreateEnterpriseUserForm = z.infer<typeof createEnterpriseUserSchema>;

interface CreateEnterpriseUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  enterpriseId?: string;
  enterpriseName?: string;
  defaultRole?: 'it_admin' | 'org_admin' | 'employee';
}

export function CreateEnterpriseUserModal({
  isOpen,
  onClose,
  onSuccess,
  enterpriseId,
  enterpriseName,
  defaultRole = 'it_admin'
}: CreateEnterpriseUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
  } = useForm<CreateEnterpriseUserForm>({
    resolver: zodResolver(createEnterpriseUserSchema),
    defaultValues: {
      role: defaultRole,
      enterpriseId: enterpriseId || '',
      branchId: '',
    },
  });

  const selectedRole = watch('role');
  const selectedEnterpriseId = watch('enterpriseId');

  // Fetch active enterprises (only if not pre-filled)
  useEffect(() => {
    const fetchEnterprises = async () => {
      const result = await enterprisesApi.list({ limit: 100, status: 'active' });
      if (result.success && result.data) {
        setEnterprises(result.data.map(e => ({
          id: e.id,
          name: e.name,
          status: e.status,
        })));
      }
    };

    if (isOpen && !enterpriseId) {
      fetchEnterprises();
    }
  }, [isOpen, enterpriseId]);

  // Fetch branches when enterprise is selected and role is it_admin
  useEffect(() => {
    const fetchBranches = async (entId: string) => {
      const result = await branchesApi.list({ enterprise_id: entId, limit: 100 });
      if (result.success && result.data) {
        setBranches(result.data.map(b => ({
          id: b.id,
          branch_name: b.branch_name,
          branch_code: b.branch_code,
        })));
      }
    };

    const entId = enterpriseId || selectedEnterpriseId;
    if (isOpen && entId && selectedRole === 'it_admin') {
      fetchBranches(entId);
    } else {
      setBranches([]);
    }
  }, [isOpen, enterpriseId, selectedEnterpriseId, selectedRole]);

  // Set default values when modal opens with pre-filled data
  useEffect(() => {
    if (isOpen && enterpriseId) {
      setValue('enterpriseId', enterpriseId);
      setValue('role', defaultRole);
    }
  }, [isOpen, enterpriseId, defaultRole, setValue]);

  const onSubmit = async (data: CreateEnterpriseUserForm) => {
    setIsSubmitting(true);
    try {
      const roleLabel = data.role === 'it_admin' ? 'IT Admin' : data.role === 'org_admin' ? 'Org Admin' : 'Employee';

      // Role is already 'employee' for the backend
      const backendRole = data.role;

      // Create user via REST API
      const result = await usersApi.create({
        enterprise_id: data.enterpriseId,
        email: data.email,
        name: data.name,
        phone: data.phone || '',
        password: data.role === 'employee' ? undefined : data.password,
        role: backendRole,
        branch_id: data.role === 'it_admin' ? data.branchId : undefined,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create user');
      }

      const enterprise = enterprises.find(e => e.id === data.enterpriseId);
      const displayEnterpriseName = enterprise?.name || enterpriseName || 'Unknown';

      addToast({
        type: 'success',
        title: `${roleLabel} Created Successfully`,
        message: data.role === 'employee'
          ? `${data.name} (${data.email}) at ${displayEnterpriseName} can now log in via OTP`
          : `${data.name} (${data.email}) at ${displayEnterpriseName} can now log in with their password`,
        duration: 5000,
      });

      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      const roleLabel = selectedRole === 'it_admin' ? 'IT Admin' : selectedRole === 'org_admin' ? 'Org Admin' : 'Employee';
      console.error(`Error creating ${roleLabel}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const lowerMsg = errorMessage.toLowerCase();

      // Show inline form error for email conflicts
      if (lowerMsg.includes('email') && (lowerMsg.includes('already exists') || lowerMsg.includes('duplicate') || lowerMsg.includes('conflict'))) {
        setError('email', { type: 'manual', message: errorMessage });
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Create User',
          message: errorMessage,
          duration: 6000,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setBranches([]);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Enterprise User"
      description="Create IT Admin or Org Admin for an enterprise"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {/* Enterprise Selection */}
          <div>
            <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
              Enterprise *
            </label>
            {enterpriseId && enterpriseName ? (
              <>
                <div className="w-full px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 font-mono text-xs uppercase tracking-widest cursor-not-allowed">
                  {enterpriseName}
                </div>
                <input type="hidden" {...register('enterpriseId')} value={enterpriseId} />
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                  Enterprise is locked for this view
                </p>
              </>
            ) : (
              <>
                <select
                  {...register('enterpriseId')}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
                >
                  <option value="">Select Enterprise</option>
                  {enterprises.map((enterprise) => (
                    <option key={enterprise.id} value={enterprise.id}>
                      {enterprise.name}
                    </option>
                  ))}
                </select>
                {errors.enterpriseId && (
                  <p className="mt-1 text-xs text-red-500">{errors.enterpriseId.message}</p>
                )}
              </>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
              Role *
            </label>
            <select
              {...register('role')}
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
              disabled={!!enterpriseId}
            >
              <option value="it_admin">IT Admin</option>
              <option value="org_admin">Org Admin</option>
              <option value="employee">Employee</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>
            )}
          </div>

          {/* Branch Selection — required for IT Admin */}
          {selectedRole === 'it_admin' && (
            <div>
              <label className={`block font-display text-sm font-bold uppercase ${text.primary} mb-2`}>
                Branch *
              </label>
              <select
                {...register('branchId')}
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name} ({branch.branch_code})
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="mt-1 text-xs text-red-500">{errors.branchId.message}</p>
              )}
              {branches.length === 0 && (
                <p className="mt-1 text-xs text-amber-500">
                  No branches found. Create a branch first before adding an IT Admin.
                </p>
              )}
            </div>
          )}

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
            placeholder="john@company.com"
            required
          />

          {/* Password — hidden for employee (employees use OTP) */}
          {selectedRole !== 'employee' && (
            <Input
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="Min. 8 characters"
              required
            />
          )}

          <Input
            label="Phone Number"
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="+91-9876543210"
          />

          <div className="pt-2 p-4 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded">
            <p className={`font-mono text-xs ${text.muted}`}>
              <span className="font-bold">Creating:</span>{' '}
              {selectedRole === 'it_admin' ? 'IT Admin' : selectedRole === 'org_admin' ? 'Org Admin' : 'Employee'}
            </p>
            <p className={`font-mono text-xs ${text.muted} mt-1`}>
              {selectedRole === 'it_admin'
                ? 'IT Admins can manage assets, batches, and employees for their enterprise.'
                : selectedRole === 'org_admin'
                ? 'Org Admins can approve pickups, manage branches, and view financial reports for their enterprise.'
                : 'Employees can submit device information and track their asset submissions. They will use OTP-based login.'}
            </p>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            {isSubmitting ? 'Creating...' : `Create ${selectedRole === 'it_admin' ? 'IT Admin' : selectedRole === 'org_admin' ? 'Org Admin' : 'Employee'}`}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
