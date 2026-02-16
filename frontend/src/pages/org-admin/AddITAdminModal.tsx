import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Plus, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { useAuth, useCreateITAdmin, useBranches, useCreateBranch } from '@/hooks';

// Validation schema — phone is optional, branch is optional
const addITAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').or(z.literal('')).optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  branch_id: z.string().optional(),
});

type AddITAdminForm = z.infer<typeof addITAdminSchema>;

interface AddITAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddITAdminModal({ isOpen, onClose, onSuccess }: AddITAdminModalProps) {
  const { enterprise } = useAuth();
  const { addToast } = useToast();
  const createITAdmin = useCreateITAdmin();
  const { data: branches = [], refetch: refetchBranches } = useBranches(enterprise?.id || '');
  const createBranch = useCreateBranch();

  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({
    branch_name: '',
    branch_code: '',
    address_line1: '',
    city: '',
    state: '',
    pin_code: '',
  });
  const [branchErrors, setBranchErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<AddITAdminForm>({
    resolver: zodResolver(addITAdminSchema),
    defaultValues: {
      branch_id: '',
    },
  });

  const validateBranch = () => {
    const errs: Record<string, string> = {};
    if (!newBranch.branch_name.trim()) errs.branch_name = 'Required';
    if (!newBranch.branch_code.trim()) errs.branch_code = 'Required';
    if (!newBranch.address_line1.trim()) errs.address_line1 = 'Required';
    if (!newBranch.city.trim()) errs.city = 'Required';
    if (!newBranch.state.trim()) errs.state = 'Required';
    if (!newBranch.pin_code.trim()) errs.pin_code = 'Required';
    setBranchErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateBranch = async () => {
    if (!validateBranch() || !enterprise?.id) return;

    try {
      const result = await createBranch.mutateAsync({
        enterprise_id: enterprise.id,
        branch_name: newBranch.branch_name,
        branch_code: newBranch.branch_code,
        address_line1: newBranch.address_line1,
        city: newBranch.city,
        state: newBranch.state,
        pin_code: newBranch.pin_code,
      });

      addToast({
        type: 'success',
        title: 'Branch Created',
        message: `${newBranch.branch_name} has been created`,
        duration: 3000,
      });

      // Auto-select the new branch
      await refetchBranches();
      if (result?.id) {
        setValue('branch_id', result.id);
      }

      // Reset and collapse
      setNewBranch({ branch_name: '', branch_code: '', address_line1: '', city: '', state: '', pin_code: '' });
      setBranchErrors({});
      setShowAddBranch(false);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Create Branch',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration: 5000,
      });
    }
  };

  const onSubmit = async (data: AddITAdminForm) => {
    if (!enterprise?.id) {
      addToast({
        type: 'error',
        title: 'No Enterprise Found',
        message: 'No enterprise associated with your account',
        duration: 5000,
      });
      return;
    }

    try {
      await createITAdmin.mutateAsync({
        enterprise_id: enterprise.id,
        email: data.email,
        name: data.name,
        phone: data.phone || undefined,
        password: data.password,
        branch_id: data.branch_id || undefined,
      });

      addToast({
        type: 'success',
        title: 'IT Admin Created',
        message: `${data.name} has been added to your enterprise${data.branch_id ? '' : '. Assign a branch to activate their access.'}`,
        duration: 5000,
      });

      reset();
      setShowAddBranch(false);
      onClose();
      onSuccess?.();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Create IT Admin',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 6000,
      });
    }
  };

  const handleClose = () => {
    if (!createITAdmin.isPending && !createBranch.isPending) {
      reset();
      setShowAddBranch(false);
      setNewBranch({ branch_name: '', branch_code: '', address_line1: '', city: '', state: '', pin_code: '' });
      setBranchErrors({});
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add IT Admin"
      description="Add a new IT Admin to your enterprise"
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
            placeholder="john@company.com"
            required
          />
          <Input
            label="Password"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="Min. 8 characters"
            required
          />
          <Input
            label="Phone Number"
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="+91-9876543210"
          />

          {/* Branch selector — optional */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-zinc-300">
              Assign to Branch
            </label>
            <select
              {...register('branch_id')}
              className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-md text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/30 focus:border-lime-500 appearance-none cursor-pointer"
            >
              <option value="">No branch (assign later)</option>
              {branches.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.branch_name} {branch.branch_code ? `(${branch.branch_code})` : ''}
                </option>
              ))}
            </select>

            {/* Quick Add Branch toggle */}
            <button
              type="button"
              onClick={() => setShowAddBranch(!showAddBranch)}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-lime-600 dark:text-lime-400 hover:text-lime-700 dark:hover:text-lime-300 transition-colors"
            >
              {showAddBranch ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showAddBranch ? 'Cancel new branch' : 'Create a new branch'}
            </button>

            {/* Inline branch creation form */}
            {showAddBranch && (
              <div className="mt-3 p-3 border border-slate-200 dark:border-zinc-700 rounded-md bg-slate-50 dark:bg-zinc-800/50 space-y-3">
                <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wide">
                  Quick Add Branch
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={newBranch.branch_name}
                      onChange={(e) => { setNewBranch(p => ({ ...p, branch_name: e.target.value })); setBranchErrors(p => ({ ...p, branch_name: '' })); }}
                      placeholder="Branch Name *"
                      className={`w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:border-lime-500 ${branchErrors.branch_name ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700'}`}
                    />
                    {branchErrors.branch_name && <p className="text-[10px] text-red-500 mt-0.5">{branchErrors.branch_name}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newBranch.branch_code}
                      onChange={(e) => { setNewBranch(p => ({ ...p, branch_code: e.target.value.toUpperCase() })); setBranchErrors(p => ({ ...p, branch_code: '' })); }}
                      placeholder="Code (e.g. MUM-HQ) *"
                      className={`w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:border-lime-500 ${branchErrors.branch_code ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700'}`}
                    />
                    {branchErrors.branch_code && <p className="text-[10px] text-red-500 mt-0.5">{branchErrors.branch_code}</p>}
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={newBranch.address_line1}
                    onChange={(e) => { setNewBranch(p => ({ ...p, address_line1: e.target.value })); setBranchErrors(p => ({ ...p, address_line1: '' })); }}
                    placeholder="Address *"
                    className={`w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:border-lime-500 ${branchErrors.address_line1 ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700'}`}
                  />
                  {branchErrors.address_line1 && <p className="text-[10px] text-red-500 mt-0.5">{branchErrors.address_line1}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      value={newBranch.city}
                      onChange={(e) => { setNewBranch(p => ({ ...p, city: e.target.value })); setBranchErrors(p => ({ ...p, city: '' })); }}
                      placeholder="City *"
                      className={`w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:border-lime-500 ${branchErrors.city ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700'}`}
                    />
                    {branchErrors.city && <p className="text-[10px] text-red-500 mt-0.5">{branchErrors.city}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newBranch.state}
                      onChange={(e) => { setNewBranch(p => ({ ...p, state: e.target.value })); setBranchErrors(p => ({ ...p, state: '' })); }}
                      placeholder="State *"
                      className={`w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:border-lime-500 ${branchErrors.state ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700'}`}
                    />
                    {branchErrors.state && <p className="text-[10px] text-red-500 mt-0.5">{branchErrors.state}</p>}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={newBranch.pin_code}
                      onChange={(e) => { setNewBranch(p => ({ ...p, pin_code: e.target.value })); setBranchErrors(p => ({ ...p, pin_code: '' })); }}
                      placeholder="PIN *"
                      className={`w-full px-2.5 py-2 bg-white dark:bg-zinc-900 border rounded text-sm text-slate-900 dark:text-white focus:outline-none focus:border-lime-500 ${branchErrors.pin_code ? 'border-red-400' : 'border-slate-200 dark:border-zinc-700'}`}
                    />
                    {branchErrors.pin_code && <p className="text-[10px] text-red-500 mt-0.5">{branchErrors.pin_code}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateBranch}
                  disabled={createBranch.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black text-xs font-semibold rounded transition-colors"
                >
                  {createBranch.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {createBranch.isPending ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            )}
          </div>

          <div className="pt-2">
            <p className="font-mono text-xs text-slate-600 dark:text-zinc-400">
              Role: <span className="font-bold text-slate-800 dark:text-zinc-200">IT Admin</span>
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 mt-1">
              Branch assignment is optional. IT Admin will have access to asset and batch management once a branch is assigned.
            </p>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={createITAdmin.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createITAdmin.isPending || createBranch.isPending}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            {createITAdmin.isPending ? 'Adding...' : 'Add IT Admin'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
