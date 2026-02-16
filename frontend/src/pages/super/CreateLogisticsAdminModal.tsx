import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Truck } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { useCreateUser } from '@/hooks';

// Validation schema
const createLogisticsAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9\s\-]{10,15}$/, 'Invalid phone number (10-15 digits)'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  companyName: z.string().optional(),
});

type CreateLogisticsAdminForm = z.infer<typeof createLogisticsAdminSchema>;

interface CreateLogisticsAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateLogisticsAdminModal({ isOpen, onClose, onSuccess }: CreateLogisticsAdminModalProps) {
  const { addToast } = useToast();
  const createUserMutation = useCreateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateLogisticsAdminForm>({
    resolver: zodResolver(createLogisticsAdminSchema),
  });

  const onSubmit = async (data: CreateLogisticsAdminForm) => {
    try {
      console.log('🚚 Creating Logistics Admin');

      await createUserMutation.mutateAsync({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: 'logistics_admin',
      });

      console.log('✅ Logistics Admin created successfully');

      addToast({
        type: 'success',
        title: 'Logistics Admin Created',
        message: `${data.name} (${data.email}) can now log in with their password`,
        duration: 5000,
      });

      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('❌ Error creating Logistics Admin:', error);

      addToast({
        type: 'error',
        title: 'Failed to Create Admin',
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Logistics Admin"
      description="Add a new Logistics Admin user"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <Input
            label="Full Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Jane Smith"
            required
            autoFocus
          />
          <Input
            label="Email Address"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="jane@logistics.com"
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
          <Input
            label="Logistics Company (Optional)"
            {...register('companyName')}
            error={errors.companyName?.message}
            placeholder="ABC Logistics"
          />

          <div className="pt-2">
            <p className="font-mono text-xs text-slate-600 dark:text-zinc-400">
              Role: <span className="font-bold text-slate-800 dark:text-zinc-200">Logistics Admin</span>
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 mt-1">
              This user will be able to assign pickups and manage logistics users.
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
            leftIcon={<Truck className="w-4 h-4" />}
          >
            {isSubmitting ? 'Creating...' : 'Create Logistics Admin'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
