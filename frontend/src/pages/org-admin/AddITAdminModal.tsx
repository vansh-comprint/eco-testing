import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { useAuth, useCreateITAdmin } from '@/hooks';

// Validation schema
const addITAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddITAdminForm>({
    resolver: zodResolver(addITAdminSchema),
  });

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
        phone: data.phone,
        password: data.password,
      });

      addToast({
        type: 'success',
        title: 'IT Admin Created',
        message: `${data.name} has been added to your enterprise`,
        duration: 5000,
      });

      reset();
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
    if (!createITAdmin.isPending) {
      reset();
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
            required
          />

          <div className="pt-2">
            <p className="font-mono text-xs text-slate-600 dark:text-zinc-400">
              Role: <span className="font-bold text-slate-800 dark:text-zinc-200">IT Admin</span>
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 mt-1">
              This user will be added to your enterprise and will have access to asset and batch management.
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
            disabled={createITAdmin.isPending}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            {createITAdmin.isPending ? 'Adding...' : 'Add IT Admin'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
