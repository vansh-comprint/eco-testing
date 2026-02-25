/**
 * Shared asset status constants
 */

/**
 * Asset statuses that represent a terminal/completed workflow state.
 * Used to determine if progress bars should show fully filled, etc.
 */
export const TERMINAL_ASSET_STATUSES = [
  'completed',
  'final_accepted',
  'final_rejected',
  'payout_pending',
] as const;

export type TerminalAssetStatus = (typeof TERMINAL_ASSET_STATUSES)[number];
