/**
 * STATUS: COMPLETE
 * Component that conditionally renders children based on user permissions.
 * Supports single permission, any-of, and all-of checks.
 */

import type { ReactNode } from 'react';
import { usePermission } from './usePermission';
import type { PermissionValue } from './constants';

interface PermissionGateProps {
  /** Single permission to check */
  permission?: PermissionValue;
  /** Show children if user has ANY of these permissions */
  anyOf?: PermissionValue[];
  /** Show children if user has ALL of these permissions */
  allOf?: PermissionValue[];
  /** Content to render when permission check passes */
  children: ReactNode;
  /** Optional fallback content when permission check fails */
  fallback?: ReactNode;
}

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  let allowed = false;

  if (permission) {
    allowed = hasPermission(permission);
  } else if (anyOf) {
    allowed = hasAnyPermission(anyOf);
  } else if (allOf) {
    allowed = hasAllPermissions(allOf);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
