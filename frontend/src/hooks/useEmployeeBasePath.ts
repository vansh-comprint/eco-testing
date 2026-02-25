import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Returns enterprise-aware basePath and enterpriseId for employee pages.
 *
 * For enterprise-nested routes (/super/enterprises/:id/employees/* or /ops/enterprises/:id/employees/*):
 *   basePath = '/super/enterprises/:id', enterpriseId = :id from URL
 *
 * For standard portal routes (/admin/employees/*, /org-admin/employees/*):
 *   basePath = '/admin' or '/org-admin', enterpriseId from auth context
 *
 * Note: We use pathname regex instead of useParams because useParams only gets
 * params from the nearest Route match, and the :id param name may conflict with
 * :subUserId in detail routes.
 */
export function useEmployeeBasePath() {
  const { pathname } = useLocation();
  const params = useParams<{ id?: string }>();
  const { enterprise } = useAuth();

  // Enterprise-nested routes: /super/enterprises/:id/employees/* or /ops/enterprises/:id/employees/*
  const enterpriseNestedMatch = pathname.match(/^\/(super|ops)\/enterprises\/([^/]+)/);
  if (enterpriseNestedMatch) {
    const portalPrefix = enterpriseNestedMatch[1]; // 'super' or 'ops'
    const enterpriseId = enterpriseNestedMatch[2] || params.id || '';
    return {
      enterpriseId,
      basePath: `/${portalPrefix}/enterprises/${enterpriseId}`,
      portalBase: `/${portalPrefix}`,
      isEnterpriseNested: true,
    };
  }

  // Standard portal routes
  const isOrgAdmin = pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';
  return {
    enterpriseId: enterprise?.id || '',
    basePath,
    portalBase: basePath,
    isEnterpriseNested: false,
  };
}
