import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';

// Validation schema
const createMainAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type CreateMainAdminForm = z.infer<typeof createMainAdminSchema>;

interface CreateMainAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateMainAdminModal({ isOpen, onClose, onSuccess }: CreateMainAdminModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateMainAdminForm>({
    resolver: zodResolver(createMainAdminSchema),
  });

  const onSubmit = async (data: CreateMainAdminForm) => {
    setIsSubmitting(true);
    try {
      // Create user via REST API
      const result = await usersApi.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        password: data.password,
        role: 'ops_admin', // Main admin maps to ops_admin in backend
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create admin');
      }

      addToast({
        type: 'success',
        title: 'Main Admin Created',
        message: `${data.name} (${data.email}) can now log in with their password`,
        duration: 5000,
      });

      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating Main Admin:', error);

      addToast({
        type: 'error',
        title: 'Failed to Create Admin',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Main Admin"
      description="Add a new Main Admin user (OPS/Technician)"
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
            placeholder="john@ecotribe.io"
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
              Role: <span className="font-bold text-slate-800 dark:text-zinc-200">Main Admin (OPS/Technician)</span>
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 mt-1">
              This user will have access to OPS and Technician portals.
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
            {isSubmitting ? 'Creating...' : 'Create Main Admin'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
