import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Building2, User, ArrowLeft, Save } from 'lucide-react';
import { Input, Button, Card, PageHeader, useToast } from '@/components/ui';
import { useAuth } from '@/hooks';
import { enterprisesApi } from '@/lib/api/enterprises';
import { usersApi } from '@/lib/api/users';
import { glass, text, iconSize } from '@/lib/design-tokens';

// Validation schema (TEMPORARY: relaxed for testing)
const createEnterpriseSchema = z.object({
  // Enterprise Details
  name: z.string().min(1, 'Company name is required').optional().or(z.literal('')),
  legalName: z.string().optional().or(z.literal('')),
  gstNumber: z.string().optional().or(z.literal('')),
  panNumber: z.string().optional().or(z.literal('')),

  // Address
  addressLine1: z.string().optional().or(z.literal('')),
  addressLine2: z.string().optional(),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pinCode: z.string().optional().or(z.literal('')),
  country: z.string().default('India'),

  // Business Info
  industry: z.string().optional().or(z.literal('')),
  employeeCount: z.coerce.number().optional(),

  // Contact
  contactPerson: z.string().optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  contactPhone: z.string().optional().or(z.literal('')),

  // Org Admin (Optional) - V3: Org Admin manages the enterprise, creates branches & IT Admins
  orgAdminName: z.string().optional(),
  orgAdminEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  orgAdminPhone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
});

type CreateEnterpriseForm = z.infer<typeof createEnterpriseSchema>;

export function CreateEnterprise() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // V3: Use React Query hook for auth
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEnterpriseForm>({
    resolver: zodResolver(createEnterpriseSchema),
    defaultValues: {
      country: 'India',
    },
  });

  const onSubmit = async (data: CreateEnterpriseForm) => {
    setIsSubmitting(true);
    try {
      // Create Enterprise via REST API
      const enterpriseResult = await enterprisesApi.create({
        name: data.name || 'Unnamed Enterprise',
        legal_name: data.legalName,
        gst_number: data.gstNumber,
        pan_number: data.panNumber,
        address: JSON.stringify({
          line1: data.addressLine1,
          line2: data.addressLine2,
          city: data.city,
          state: data.state,
          pinCode: data.pinCode,
          country: data.country,
        }),
        industry: data.industry,
        employee_count: data.employeeCount,
        contact_person: data.contactPerson,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone,
      });

      if (!enterpriseResult.success || !enterpriseResult.data) {
        throw new Error(enterpriseResult.error?.message || 'Failed to create enterprise');
      }

      const enterpriseId = enterpriseResult.data.id;

      // Create Org Admin User (if provided)
      if (data.orgAdminEmail && data.orgAdminName) {
        const orgAdminResult = await usersApi.create({
          enterprise_id: enterpriseId,
          email: data.orgAdminEmail,
          name: data.orgAdminName,
          phone: data.orgAdminPhone || '',
          role: 'org_admin',
          password: 'password123', // Default password - user should change
        });

        if (!orgAdminResult.success) {
          console.error('Failed to create Org Admin:', orgAdminResult.error);
        }
      }

      addToast({
        type: 'success',
        title: 'Enterprise Created',
        message: `${data.name} has been created successfully`,
        duration: 5000,
      });

      // Navigate back
      if (currentUser?.role === 'main_admin' || currentUser?.role === 'ops_admin') {
        navigate('/ops/enterprises');
      } else {
        navigate('/super');
      }
    } catch (error) {
      console.error('Error creating enterprise:', error);

      addToast({
        type: 'error',
        title: 'Failed to Create Enterprise',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Super Admin"
        title="Create Enterprise"
        subtitle="Add a new enterprise (All fields optional for testing)"
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate('/super')}
            leftIcon={<ArrowLeft className={iconSize.sm} />}
          >
            Back to Dashboard
          </Button>
        }
      />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">
          {/* Enterprise Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <Building2 className={`${iconSize.lg} text-lime-500`} />
                  <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>
                    Enterprise Details
                  </h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Company Name"
                    {...register('name')}
                    error={errors.name?.message}
                  />
                  <Input
                    label="Legal Name"
                    {...register('legalName')}
                    error={errors.legalName?.message}
                  />
                  <Input
                    label="GST Number"
                    {...register('gstNumber')}
                    error={errors.gstNumber?.message}
                    placeholder="29AABCT1234H1ZM"
                  />
                  <Input
                    label="PAN Number"
                    {...register('panNumber')}
                    error={errors.panNumber?.message}
                    placeholder="AABCT1234H"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Industry"
                    {...register('industry')}
                    error={errors.industry?.message}
                    placeholder="IT Services"
                  />
                  <Input
                    label="Employee Count"
                    type="number"
                    {...register('employeeCount')}
                    error={errors.employeeCount?.message}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className={`font-display font-bold uppercase text-sm ${text.primary}`}>
                    Address
                  </h3>
                  <Input
                    label="Address Line 1"
                    {...register('addressLine1')}
                    error={errors.addressLine1?.message}
                  />
                  <Input
                    label="Address Line 2"
                    {...register('addressLine2')}
                    error={errors.addressLine2?.message}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="City"
                      {...register('city')}
                      error={errors.city?.message}
                    />
                    <Input
                      label="State"
                      {...register('state')}
                      error={errors.state?.message}
                    />
                    <Input
                      label="PIN Code"
                      {...register('pinCode')}
                      error={errors.pinCode?.message}
                      placeholder="560100"
                    />
                  </div>
                  <Input
                    label="Country"
                    {...register('country')}
                    error={errors.country?.message}
                    disabled
                  />
                </div>

                <div className="space-y-4">
                  <h3 className={`font-display font-bold uppercase text-sm ${text.primary}`}>
                    Primary Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Contact Person"
                      {...register('contactPerson')}
                      error={errors.contactPerson?.message}
                    />
                    <Input
                      label="Contact Email"
                      type="email"
                      {...register('contactEmail')}
                      error={errors.contactEmail?.message}
                    />
                    <Input
                      label="Contact Phone"
                      {...register('contactPhone')}
                      error={errors.contactPhone?.message}
                      placeholder="+91-9876543210"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Org Admin */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className={`${iconSize.lg} text-emerald-500`} />
                    <h2 className={`font-brand font-bold text-lg uppercase tracking-wide ${text.primary}`}>
                      Org Admin Details
                    </h2>
                  </div>
                  <span className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Optional</span>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Org Admin Name"
                    {...register('orgAdminName')}
                    error={errors.orgAdminName?.message}
                  />
                  <Input
                    label="Org Admin Email"
                    type="email"
                    {...register('orgAdminEmail')}
                    error={errors.orgAdminEmail?.message}
                  />
                  <Input
                    label="Org Admin Phone"
                    {...register('orgAdminPhone')}
                    error={errors.orgAdminPhone?.message}
                    placeholder="+91-9876543211"
                  />
                </div>
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded">
                  <p className="font-mono text-xs text-emerald-800 dark:text-emerald-200">
                    The Org Admin manages the enterprise, creates branches, and assigns IT Admins to each branch.
                    For full authentication support, use the "Add User" button on the All Users page.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end gap-4"
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/super')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={<Save className={iconSize.sm} />}
            >
              {isSubmitting ? 'Creating...' : 'Create Enterprise'}
            </Button>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
