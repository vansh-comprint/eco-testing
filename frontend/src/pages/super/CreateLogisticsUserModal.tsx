import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { useQueryClient } from '@tanstack/react-query';

// Validation schema
const createLogisticsUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9\s\-]{10,15}$/, 'Invalid phone number (10-15 digits)'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  logistics_admin_id: z.string().min(1, 'Please select a logistics admin'),
});

type CreateLogisticsUserForm = z.infer<typeof createLogisticsUserSchema>;

interface CreateLogisticsUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  logisticsAdminId?: string; // Pre-select a specific logistics admin
}

export function CreateLogisticsUserModal({ isOpen, onClose, onSuccess, logisticsAdminId }: CreateLogisticsUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logisticsAdmins, setLogisticsAdmins] = useState<Array<{ id: string; name: string }>>([]);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CreateLogisticsUserForm>({
    resolver: zodResolver(createLogisticsUserSchema),
    defaultValues: {
      logistics_admin_id: logisticsAdminId || '',
    },
  });

  // Fetch logistics admins when modal opens
  useEffect(() => {
    if (isOpen) {
      usersApi.list({ role: 'logistics_admin', limit: 100 }).then((response: any) => {
        const admins = response.data || [];
        setLogisticsAdmins(admins);
        // If no admin pre-selected and we have admins, select first one
        if (!logisticsAdminId && admins.length > 0) {
          setValue('logistics_admin_id', admins[0].id);
        }
      }).catch(console.error);
    }
  }, [isOpen, logisticsAdminId, setValue]);

  // Update form when logisticsAdminId prop changes
  useEffect(() => {
    if (logisticsAdminId) {
      setValue('logistics_admin_id', logisticsAdminId);
    }
  }, [logisticsAdminId, setValue]);

  const onSubmit = async (data: CreateLogisticsUserForm) => {
    setIsSubmitting(true);
    try {
      console.log('👤 Creating Logistics User');

      // Create user via API with logistics_user role and parent_user_id
      await usersApi.create({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: 'logistics_user',
        parent_user_id: data.logistics_admin_id,  // Link to logistics admin
      });

      console.log('✅ Logistics User created successfully');

      addToast({
        type: 'success',
        title: 'Field User Created',
        message: `${data.name} (${data.email}) can now log in with their password`,
        duration: 5000,
      });

      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['logistics'] });
      // Reset form and close modal
      reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('❌ Error creating Logistics User:', error);

      addToast({
        type: 'error',
        title: 'Failed to Create User',
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Field User"
      description="Add a new field user for logistics operations"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          {/* Logistics Admin Selection - only show if not pre-selected */}
          {!logisticsAdminId && (
            <div>
              <label className="block font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-2">
                Logistics Admin <span className="text-red-400">*</span>
              </label>
              <select
                {...register('logistics_admin_id')}
                className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50"
              >
                <option value="">Select a logistics admin...</option>
                {logisticsAdmins.map(admin => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name}
                  </option>
                ))}
              </select>
              {errors.logistics_admin_id && (
                <p className="text-red-500 text-xs mt-1">{errors.logistics_admin_id.message}</p>
              )}
            </div>
          )}

          <Input
            label="Full Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="John Smith"
            required
            autoFocus={!!logisticsAdminId}
          />
          <Input
            label="Email Address"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="john@logistics.com"
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
              Role: <span className="font-bold text-slate-800 dark:text-zinc-200">Logistics User (Field)</span>
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 mt-1">
              This user will handle pickup assignments, on-site QC, and proof uploads.
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
            {isSubmitting ? 'Creating...' : 'Create Field User'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
