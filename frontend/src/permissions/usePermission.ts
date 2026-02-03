/**
 * STATUS: COMPLETE
 * Hook for checking permissions of the current user.
 * Uses the auth store to get the current user's role, then checks
 * against the role-permission mappings.
 */

import { useMemo, useCallback } from 'react';
import { useUserRole } from '@/stores/authStoreApi';
import type { PermissionValue } from './constants';
import { Permission } from './constants';
import { ROLE_PERMISSIONS } from './role-mappings';

export function usePermission() {
  const role = useUserRole();

  const permissions = useMemo(() => {
    if (!role) return new Set<PermissionValue>();
    return ROLE_PERMISSIONS[role] ?? new Set<PermissionValue>();
  }, [role]);

  const hasPermission = useCallback(
    (permission: PermissionValue): boolean => {
      if (!role) return false;
      // Super admin wildcard
      if (permissions.has(Permission.ALL)) return true;
      return permissions.has(permission);
    },
    [role, permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: PermissionValue[]): boolean => {
      if (!role) return false;
      if (permissions.has(Permission.ALL)) return true;
      return perms.some((p) => permissions.has(p));
    },
    [role, permissions]
  );

  const hasAllPermissions = useCallback(
    (perms: PermissionValue[]): boolean => {
      if (!role) return false;
      if (permissions.has(Permission.ALL)) return true;
      return perms.every((p) => permissions.has(p));
    },
    [role, permissions]
  );

  return { hasPermission, hasAnyPermission, hasAllPermissions, role };
}
