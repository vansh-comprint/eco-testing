import { z } from 'zod';

/**
 * Common Validation Schemas
 *
 * Centralized validation patterns for the entire application.
 * These should be used across all forms to ensure consistent validation.
 *
 * SECURITY: All patterns include sanitization to prevent injection attacks.
 */

// ============================================================================
// BASIC FIELD VALIDATORS
// ============================================================================

/**
 * Email validation with strict format checking
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email is too long')
  .transform(val => val.toLowerCase().trim());

/**
 * Password validation with security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

/**
 * Simple password (for login only - less strict)
 */
export const loginPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

/**
 * Name validation (no numbers or special characters except spaces, hyphens, apostrophes)
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .transform(val => val.trim());

/**
 * Indian phone number validation
 * Accepts: 10 digits starting with 6-9, optionally with +91
 */
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .transform(val => val.replace(/[\s\-]/g, '')) // Remove spaces and dashes
  .refine(val => /^(\+91)?[6-9]\d{9}$/.test(val), {
    message: 'Please enter a valid Indian mobile number (10 digits starting with 6-9)',
  });

/**
 * Optional phone number
 */
export const optionalPhoneSchema = z
  .string()
  .optional()
  .transform(val => val?.replace(/[\s\-]/g, '') || '')
  .refine(val => !val || /^(\+91)?[6-9]\d{9}$/.test(val), {
    message: 'Please enter a valid Indian mobile number',
  });

/**
 * Indian PIN code (6 digits)
 */
export const pinCodeSchema = z
  .string()
  .min(1, 'PIN code is required')
  .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits');

/**
 * City name (letters and spaces only)
 */
export const citySchema = z
  .string()
  .min(1, 'City is required')
  .max(100, 'City name is too long')
  .regex(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces')
  .transform(val => val.trim());

/**
 * State name (letters and spaces only)
 */
export const stateSchema = z
  .string()
  .min(1, 'State is required')
  .max(100, 'State name is too long')
  .regex(/^[a-zA-Z\s]+$/, 'State can only contain letters and spaces')
  .transform(val => val.trim());

/**
 * Company/Enterprise name with sanitization
 * SECURITY: Strips dangerous characters to prevent XSS/injection
 */
export const companyNameSchema = z
  .string()
  .min(1, 'Company name is required')
  .max(200, 'Company name is too long')
  .transform(val => val.trim())
  .refine(val => !/[<>'"`;${}()[\]\\]/.test(val), {
    message: 'Company name contains invalid characters',
  });

/**
 * GST Number validation (Indian format)
 * Format: 2-digit state code + 10-char PAN + 1-char entity + Z + 1 check digit
 */
export const gstSchema = z
  .string()
  .min(1, 'GST number is required')
  .transform(val => val.toUpperCase().trim())
  .refine(val => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/.test(val), {
    message: 'Please enter a valid GST number',
  });

/**
 * PAN Number validation (Indian format)
 */
export const panSchema = z
  .string()
  .min(1, 'PAN number is required')
  .transform(val => val.toUpperCase().trim())
  .refine(val => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val), {
    message: 'Please enter a valid PAN number',
  });

/**
 * Bank IFSC code validation
 */
export const ifscSchema = z
  .string()
  .min(1, 'IFSC code is required')
  .transform(val => val.toUpperCase().trim())
  .refine(val => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val), {
    message: 'Please enter a valid IFSC code (e.g., SBIN0001234)',
  });

/**
 * UPI ID validation
 */
export const upiSchema = z
  .string()
  .min(1, 'UPI ID is required')
  .transform(val => val.toLowerCase().trim())
  .refine(val => /^[\w.\-]+@[\w]+$/.test(val), {
    message: 'Please enter a valid UPI ID (e.g., name@upi)',
  });

/**
 * Bank account number (9-18 digits)
 */
export const bankAccountSchema = z
  .string()
  .min(1, 'Account number is required')
  .refine(val => /^\d{9,18}$/.test(val.replace(/\s/g, '')), {
    message: 'Account number must be 9-18 digits',
  });

/**
 * Amount validation (positive, reasonable range)
 */
export const amountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .max(10000000, 'Amount cannot exceed ₹1 Crore');

/**
 * Text area with sanitization (for descriptions, notes, etc.)
 * SECURITY: Prevents script injection
 */
export const textAreaSchema = z
  .string()
  .max(5000, 'Text is too long')
  .transform(val => val.trim())
  .refine(val => !/[<>]/.test(val), {
    message: 'Text contains invalid characters',
  });

/**
 * URL validation (only http/https)
 */
export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .refine(val => val.startsWith('http://') || val.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
  });

// ============================================================================
// COMPOSITE SCHEMAS (Common form patterns)
// ============================================================================

/**
 * Login form schema
 */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

/**
 * User creation schema (for admin creating users)
 */
export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Address schema (commonly used across forms)
 */
export const addressSchema = z.object({
  address_line1: z.string().min(1, 'Address is required').max(200),
  address_line2: z.string().max(200).optional(),
  city: citySchema,
  state: stateSchema,
  pin_code: pinCodeSchema,
  country: z.string().default('India'),
});

/**
 * Logistics user creation schema
 */
export const createLogisticsUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

/**
 * Enterprise registration schema
 */
export const enterpriseRegistrationSchema = z.object({
  // Admin details
  admin_name: nameSchema,
  admin_email: emailSchema,
  admin_password: passwordSchema,
  confirm_password: z.string(),

  // Company details
  company_name: companyNameSchema,
  industry: z.string().min(1, 'Industry is required'),
  company_size: z.string().min(1, 'Company size is required'),
  contact_phone: phoneSchema,

  // Address
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: citySchema,
  state: stateSchema,
  pin_code: pinCodeSchema,
}).refine(data => data.admin_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Allowed file types for document uploads
 */
export const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

/**
 * Max file sizes
 */
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate file type and size
 */
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSize: number
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate document file (PDF, JPG, PNG)
 */
export function validateDocument(file: File): { valid: boolean; error?: string } {
  return validateFile(file, ALLOWED_DOC_TYPES, MAX_DOC_SIZE);
}

/**
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  return validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type AddressData = z.infer<typeof addressSchema>;
export type CreateLogisticsUserData = z.infer<typeof createLogisticsUserSchema>;
export type EnterpriseRegistrationData = z.infer<typeof enterpriseRegistrationSchema>;
