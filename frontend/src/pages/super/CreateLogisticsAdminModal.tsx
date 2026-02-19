import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Truck } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { useCreateUser } from '@/hooks';
import { nameSchema, emailSchema, passwordSchema, PASSWORD_HINT, phoneSchema } from '@/lib/validation';

// Validation schema
const createLogisticsAdminSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
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
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              e.currentTarget.value = e.currentTarget.value.replace(/[^a-zA-Z\s'.\-]/g, '');
            }}
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
            placeholder={PASSWORD_HINT}
            required
          />
          <Input
            label="Phone Number"
            {...register('phone')}
            error={errors.phone?.message}
            placeholder="9876543210"
            required
            inputMode="numeric"
            maxLength={10}
            onInput={(e: React.FormEvent<HTMLInputElement>) => {
              e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '').slice(0, 10);
            }}
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
