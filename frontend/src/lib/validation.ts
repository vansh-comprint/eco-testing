/**
 * Shared validation utilities — SINGLE SOURCE OF TRUTH.
 *
 * Every form in the app should import schemas from here.
 * Keeps rules in sync with the backend (app/schemas/user.py).
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// BASIC FIELD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

// ── Password ────────────────────────────────────────────────────────────────

/** Reusable Zod schema for a required password field. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

/** Reusable Zod schema for an optional password (e.g. edit forms). */
export const optionalPasswordSchema = z
  .string()
  .refine(
    (val) => {
      if (!val || val.length === 0) return true; // empty is ok
      if (val.length < 8) return false;
      if (!/[a-zA-Z]/.test(val)) return false;
      if (!/[0-9]/.test(val)) return false;
      if (!/[^a-zA-Z0-9]/.test(val)) return false;
      return true;
    },
    { message: 'Password must be 8+ chars with a letter, number, and special character' },
  )
  .optional()
  .or(z.literal(''));

/**
 * Imperative password validation for non-Zod forms.
 * Returns an error string or null if valid.
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

/** Placeholder hint for password input fields. */
export const PASSWORD_HINT = 'Min. 8 chars, letter + number + special';

// ── Name ──────────────────────────────────────────────────────────────────

/** Reusable Zod schema for a required name field (letters, spaces, hyphens, apostrophes, dots). */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .regex(/^[a-zA-Z\s'.\-]+$/, 'Name must contain only letters, spaces, hyphens, or apostrophes');

/** Reusable Zod schema for an optional name field. */
export const optionalNameSchema = z
  .string()
  .regex(/^[a-zA-Z\s'.\-]*$/, 'Name must contain only letters, spaces, hyphens, or apostrophes')
  .optional()
  .or(z.literal(''));

/** Sanitise name input: strip anything that isn't a letter, space, apostrophe, dot, or hyphen. */
export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z\s'.\-]/g, '');
}

// ── Email ─────────────────────────────────────────────────────────────────

/** Reusable Zod schema for a required email field. */
export const emailSchema = z
  .string()
  .email('Invalid email address');

/** Reusable Zod schema for an optional email field. */
export const optionalEmailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal(''));

// ── Phone ──────────────────────────────────────────────────────────────────

/** Reusable Zod schema for a required 10-digit Indian mobile number. */
export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

/** Reusable Zod schema for an optional 10-digit phone. */
export const optionalPhoneSchema = z
  .string()
  .regex(/^\d{10}$/, 'Phone must be exactly 10 digits')
  .optional()
  .or(z.literal(''));

/** Sanitise phone input: strip non-digits and cap at 10 characters. */
export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

// ── Indian Address Fields ─────────────────────────────────────────────────

/** Indian PIN code — exactly 6 digits. */
export const pinCodeSchema = z
  .string()
  .min(1, 'PIN code is required')
  .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits');

/** Optional PIN code. */
export const optionalPinCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'PIN code must be exactly 6 digits')
  .optional()
  .or(z.literal(''));

/** City — letters and spaces only. */
export const citySchema = z
  .string()
  .min(1, 'City is required')
  .regex(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces');

/** State — letters and spaces only. */
export const stateSchema = z
  .string()
  .min(1, 'State is required')
  .regex(/^[a-zA-Z\s]+$/, 'State can only contain letters and spaces');

/** Sanitise PIN code input. */
export function sanitizePinCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6);
}

/** Sanitise city/state input. */
export function sanitizeCityState(value: string): string {
  return value.replace(/[^a-zA-Z\s]/g, '');
}

// ── Indian Document Numbers ───────────────────────────────────────────────

/**
 * GST Number (Indian format).
 * Format: 2-digit state code + 10-char PAN + 1-char entity + Z + 1 check digit.
 * e.g. 29AABCT1234H1Z5
 */
export const gstSchema = z
  .string()
  .refine(
    (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.toUpperCase()),
    { message: 'Invalid GST format (e.g. 29AABCT1234H1Z5)' },
  );

/** Optional GST — empty string or valid format. */
export const optionalGstSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.toUpperCase()),
    { message: 'Invalid GST format (e.g. 29AABCT1234H1Z5)' },
  );

/**
 * PAN Number (Indian format).
 * Format: 5 letters + 4 digits + 1 letter.
 * e.g. AABCT1234H
 */
export const panSchema = z
  .string()
  .refine(
    (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()),
    { message: 'Invalid PAN format (e.g. AABCT1234H)' },
  );

/** Optional PAN — empty string or valid format. */
export const optionalPanSchema = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v.toUpperCase()),
    { message: 'Invalid PAN format (e.g. AABCT1234H)' },
  );

/** Sanitise GST/PAN input: allow only alphanumeric, uppercase. */
export function sanitizeDocNumber(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

// ── Banking ──────────────────────────────────────────────────────────────

/** Bank IFSC code — 4 letters + 0 + 6 alphanumeric. */
export const ifscSchema = z
  .string()
  .min(1, 'IFSC code is required')
  .refine((val) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val.toUpperCase()), {
    message: 'Please enter a valid IFSC code (e.g. SBIN0001234)',
  });

/** UPI ID — handle@provider. */
export const upiSchema = z
  .string()
  .min(1, 'UPI ID is required')
  .refine((val) => /^[\w.\-]+@[\w]+$/.test(val.toLowerCase()), {
    message: 'Please enter a valid UPI ID (e.g. name@upi)',
  });

/** Bank account number — 9-18 digits. */
export const bankAccountSchema = z
  .string()
  .min(1, 'Account number is required')
  .refine((val) => /^\d{9,18}$/.test(val.replace(/\s/g, '')), {
    message: 'Account number must be 9-18 digits',
  });

/** Amount — positive number, max ₹1 Crore. */
export const amountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .max(10000000, 'Amount cannot exceed ₹1 Crore');

// ── Branch Code ──────────────────────────────────────────────────────────

/** Branch code — 1-10 uppercase alphanumeric characters. */
export const branchCodeSchema = z
  .string()
  .min(1, 'Branch code is required')
  .max(10, 'Maximum 10 characters')
  .refine((val) => /^[A-Z0-9]+$/.test(val.toUpperCase()), {
    message: 'Only uppercase letters and numbers allowed',
  });

/** Imperative branch code validation for non-Zod forms. */
export function validateBranchCode(code: string): { valid: boolean; error?: string } {
  const normalized = code.toUpperCase().trim();
  if (!normalized) return { valid: false, error: 'Branch code is required' };
  if (normalized.length > 10) return { valid: false, error: 'Maximum 10 characters' };
  if (!/^[A-Z0-9]+$/.test(normalized)) return { valid: false, error: 'Only letters and numbers allowed' };
  return { valid: true };
}

/** Sanitise branch code input. */
export function sanitizeBranchCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

// ── Text & URL ───────────────────────────────────────────────────────────

/** Text area — max 5000 chars, no angle brackets (XSS prevention). */
export const textAreaSchema = z
  .string()
  .max(5000, 'Text is too long')
  .refine((val) => !/[<>]/.test(val), { message: 'Text contains invalid characters' });

/** URL — must be http or https. */
export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .refine((val) => val.startsWith('http://') || val.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
  });

// ═══════════════════════════════════════════════════════════════════════════
// FILE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
export const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

/** Validate file type and size. */
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSize: number,
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.map((t) => t.split('/')[1]).join(', ')}`,
    };
  }
  if (file.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return { valid: false, error: `File too large. Maximum size: ${maxMB}MB` };
  }
  return { valid: true };
}

/** Validate document (PDF, JPG, PNG — max 10 MB). */
export function validateDocument(file: File): { valid: boolean; error?: string } {
  return validateFile(file, ALLOWED_DOC_TYPES, MAX_DOC_SIZE);
}

/** Validate image (JPG, PNG, WebP — max 5 MB). */
export function validateImage(file: File): { valid: boolean; error?: string } {
  return validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/** Standard Indian address block. */
export const addressSchema = z.object({
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: citySchema,
  state: stateSchema,
  pin_code: pinCodeSchema,
  country: z.string().default('India'),
});

/** Branch form (add/edit). */
export const branchFormSchema = z.object({
  branch_name: z.string().min(1, 'Branch name is required').max(100, 'Maximum 100 characters'),
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

/** Bulk branch upload row. */
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
  it_admin_email: optionalEmailSchema,
  it_admin_name: z.string().optional().default(''),
});

// ═══════════════════════════════════════════════════════════════════════════
// PASSWORD GENERATION
// ═══════════════════════════════════════════════════════════════════════════

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*';

/**
 * Generate a random password that always satisfies complexity rules.
 * Guarantees at least 1 uppercase, 1 lowercase, 1 digit, 1 special char.
 */
export function generatePassword(length = 12): string {
  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
  const all = UPPER + LOWER + DIGITS + SPECIAL;

  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  for (let i = required.length; i < length; i++) {
    required.push(pick(all));
  }

  // Shuffle so guaranteed chars aren't always at the front
  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type AddressData = z.infer<typeof addressSchema>;
export type BranchFormData = z.infer<typeof branchFormSchema>;
export type BulkBranchRow = z.infer<typeof bulkBranchRowSchema>;
