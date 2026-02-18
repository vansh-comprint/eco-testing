import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Key } from 'lucide-react';
import { Modal, ModalFooter, Input, Button, useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { passwordSchema } from '@/lib/validation';

// Validation schema
const editPasswordSchema = z.object({
  newPassword: passwordSchema,
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EditPasswordForm = z.infer<typeof editPasswordSchema>;

interface EditPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId?: string;
  userEmail: string;
  userName: string;
}

export function EditPasswordModal({ isOpen, onClose, onSuccess, userId, userEmail, userName }: EditPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditPasswordForm>({
    resolver: zodResolver(editPasswordSchema),
  });

  const onSubmit = async (data: EditPasswordForm) => {
    if (!userId) {
      addToast({
        type: 'error',
        title: 'User ID Missing',
        message: 'Cannot reset password without a valid user ID',
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Use REST API to reset password
      const result = await usersApi.resetPassword(userId, {
        new_password: data.newPassword,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to reset password');
      }

      console.log('✅ Password reset successfully');

      addToast({
        type: 'success',
        title: 'Password Updated',
        message: `Password for ${userEmail} has been changed successfully.`,
        duration: 10000,
      });

      reset();
      onClose();
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
      reset();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit User Password"
      description={`Reset password for ${userName}`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div className="p-4 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded">
            <p className="font-mono text-xs text-slate-600 dark:text-zinc-400">
              <span className="font-bold">User:</span> {userName}
            </p>
            <p className="font-mono text-xs text-slate-600 dark:text-zinc-400 mt-1">
              <span className="font-bold">Email:</span> {userEmail}
            </p>
          </div>

          <Input
            label="New Password"
            type="password"
            {...register('newPassword')}
            error={errors.newPassword?.message}
            placeholder="Letters, numbers & special chars"
            required
            autoFocus
          />

          <Input
            label="Confirm Password"
            type="password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            placeholder="Re-enter password"
            required
          />

          <div className="pt-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded">
            <p className="font-mono text-xs text-emerald-800 dark:text-emerald-200 font-bold mb-1">
              Password Requirements:
            </p>
            <ul className="font-mono text-xs text-emerald-700 dark:text-emerald-300 space-y-1 list-disc list-inside">
              <li>Minimum 8 characters</li>
              <li>At least one letter (a-z, A-Z)</li>
              <li>At least one number (0-9)</li>
              <li>At least one special character (!@#$...)</li>
            </ul>
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
            leftIcon={<Key className="w-4 h-4" />}
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
