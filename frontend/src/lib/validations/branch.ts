import { z } from 'zod';

/**
 * Branch code validation schema
 * - 1-10 characters
 * - Only uppercase letters and numbers
 * - Auto-transforms to uppercase
 */
export const branchCodeSchema = z
  .string()
  .min(1, 'Branch code is required')
  .max(10, 'Maximum 10 characters')
  .transform(val => val.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  .refine(val => /^[A-Z0-9]+$/.test(val), {
    message: 'Only uppercase letters and numbers allowed',
  });

/**
 * Indian PIN code validation
 */
export const pinCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'PIN code must be 6 digits');

/**
 * Phone number validation (Indian format)
 */
export const phoneSchema = z
  .string()
  .optional()
  .refine(val => !val || /^\+?\d{10,}$/.test(val.replace(/\s/g, '')), {
    message: 'Invalid phone number',
  });

/**
 * Branch form validation schema (for add/edit modal)
 */
export const branchFormSchema = z.object({
  branch_name: z
    .string()
    .min(1, 'Branch name is required')
    .max(100, 'Maximum 100 characters'),
  branch_code: branchCodeSchema,
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pin_code: pinCodeSchema,
  site_contact_person: z.string().optional(),
  site_contact_phone: phoneSchema,
  operating_hours: z.string().optional(),
  pickup_point_description: z.string().optional(),
  special_instructions: z.string().optional(),
  it_admin_id: z.string().nullable().optional(),
});

export type BranchFormData = z.infer<typeof branchFormSchema>;

/**
 * Bulk branch upload row schema
 */
export const bulkBranchRowSchema = z.object({
  branch_name: z.string().min(1, 'Branch name is required'),
  branch_code: branchCodeSchema,
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional().default(''),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pin_code: pinCodeSchema,
  site_contact_person: z.string().optional().default(''),
  site_contact_phone: z.string().optional().default(''),
  operating_hours: z.string().optional().default(''),
  it_admin_email: z.string().email('Invalid email').optional().or(z.literal('')),
  it_admin_name: z.string().optional().default(''),
});

export type BulkBranchRow = z.infer<typeof bulkBranchRowSchema>;

/**
 * Validate branch code format (utility function)
 */
export function validateBranchCode(code: string): { valid: boolean; error?: string } {
  const normalized = code.toUpperCase().trim();

  if (!normalized) {
    return { valid: false, error: 'Branch code is required' };
  }

  if (normalized.length > 10) {
    return { valid: false, error: 'Maximum 10 characters' };
  }

  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { valid: false, error: 'Only letters and numbers allowed' };
  }

  return { valid: true };
}
