/**
 * Formatting Utilities
 *
 * Safe formatting functions that handle edge cases like NaN, null, undefined.
 * Use these instead of raw number formatting to prevent display issues.
 */

/**
 * Format a number as Indian Rupees.
 * Returns a safe fallback for invalid values.
 *
 * @param value - Number to format
 * @param fallback - String to show for invalid values (default: '₹0')
 */
export function formatCurrency(value: number | null | undefined, fallback = '₹0'): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number with Indian locale (lakhs/crores).
 * Returns a safe fallback for invalid values.
 *
 * @param value - Number to format
 * @param fallback - String to show for invalid values (default: '0')
 */
export function formatNumber(value: number | null | undefined, fallback = '0'): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Format a percentage value.
 * Returns a safe fallback for invalid values.
 *
 * @param value - Percentage value (0-100 or 0-1)
 * @param isDecimal - If true, treats value as decimal (0-1)
 * @param fallback - String to show for invalid values (default: '0%')
 */
export function formatPercent(
  value: number | null | undefined,
  isDecimal = false,
  fallback = '0%'
): string {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
    return fallback;
  }

  const percent = isDecimal ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

/**
 * Format a value range (e.g., "₹10,000 - ₹15,000").
 * Handles cases where min or max might be invalid.
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @param fallback - String to show for invalid range
 */
export function formatCurrencyRange(
  min: number | null | undefined,
  max: number | null | undefined,
  fallback = 'N/A'
): string {
  const minValid = min !== null && min !== undefined && !isNaN(min) && isFinite(min);
  const maxValid = max !== null && max !== undefined && !isNaN(max) && isFinite(max);

  if (!minValid && !maxValid) {
    return fallback;
  }

  if (!minValid) {
    return `Up to ${formatCurrency(max)}`;
  }

  if (!maxValid) {
    return `From ${formatCurrency(min)}`;
  }

  if (min === max) {
    return formatCurrency(min);
  }

  return `${formatCurrency(min)} - ${formatCurrency(max)}`;
}

/**
 * Safely parse a numeric value.
 * Returns 0 for invalid values instead of NaN.
 *
 * @param value - Value to parse
 * @param fallback - Fallback for invalid values (default: 0)
 */
export function safeNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value));

  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  return num;
}

/**
 * Calculate a safe sum of numbers, ignoring invalid values.
 */
export function safeSum(...values: (number | null | undefined)[]): number {
  return values.reduce((acc: number, val) => acc + safeNumber(val), 0);
}

/**
 * Calculate a safe average, ignoring invalid values.
 * Returns 0 if no valid values.
 */
export function safeAverage(...values: (number | null | undefined)[]): number {
  const validValues = values.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v) && isFinite(v)
  );

  if (validValues.length === 0) {
    return 0;
  }

  return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}
