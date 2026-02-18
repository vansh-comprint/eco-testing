/**
 * Shared validation utilities.
 *
 * Single source of truth for password complexity rules so they stay
 * in sync with the backend (app/schemas/user.py  _validate_password_complexity).
 */

import { z } from 'zod';

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

// ── Password Generation ─────────────────────────────────────────────────────

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

  // Guarantee one from each category
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];

  // Fill remaining with random chars from the full set
  for (let i = required.length; i < length; i++) {
    required.push(pick(all));
  }

  // Shuffle so the guaranteed chars aren't always at the front
  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join('');
}
