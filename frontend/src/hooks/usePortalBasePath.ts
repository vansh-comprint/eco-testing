import { useLocation } from 'react-router-dom';

/**
 * Returns the base path of the current portal based on the URL.
 * Used by shared pages (review, QC, assets, etc.) to generate correct
 * navigation links regardless of which portal they're rendered in.
 */
export function usePortalBasePath() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/super')) return '/super';
  if (pathname.startsWith('/ops')) return '/ops';
  if (pathname.startsWith('/review')) return '/review';
  if (pathname.startsWith('/org-admin')) return '/org-admin';
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/logistics-admin')) return '/logistics-admin';
  if (pathname.startsWith('/logistics')) return '/logistics';
  if (pathname.startsWith('/check-in')) return '/check-in';
  return '';
}
