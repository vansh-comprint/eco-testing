/**
 * useSidebarBadges - Provides action-required badge counts for sidebar navigation
 * Returns counts based on user role for items requiring attention
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useBatches, useBatchesByITAdmin } from './useBatches';
import { usePickupsByITAdmin, useAllPickupRequests } from './usePickups';
import { useEnterpriseApplications } from './useEnterpriseApplications';
import { useLogisticsAdminPickups } from './useLogistics';

export interface SidebarBadges {
  // IT Admin badges
  batches?: number; // Draft batches ready for submission
  assets?: number; // Assets needing action
  pickups?: number; // Pickup requests needing attention

  // Org Admin badges
  approvals?: number; // Batches pending approval
  itAdmins?: number; // IT Admin invites pending

  // OPS/Super Admin badges
  applications?: number; // Enterprise applications pending review
  reviews?: number; // Assets awaiting remote review
  qc?: number; // Assets awaiting facility QC
  opsPickups?: number; // Pickups pending assignment
  disputes?: number; // Open disputes

  // Logistics Admin badges
  assignments?: number; // Pickups needing field user assignment

  // Logistics User badges
  myPickups?: number; // Scheduled pickups to complete
}

export function useSidebarBadges(): SidebarBadges {
  const { user, enterprise } = useAuth();
  const role = user?.role;
  const enterpriseId = enterprise?.id || '';
  const userId = user?.id || '';

  // IT Admin data
  const { data: itBatches = [] } = useBatchesByITAdmin(role === 'it_admin' ? userId : '');
  const { data: itPickups = [] } = usePickupsByITAdmin(role === 'it_admin' ? userId : '');

  // Org Admin data
  const { data: orgBatches = [] } = useBatches(role === 'org_admin' ? enterpriseId : '');

  // OPS/Super Admin data
  const { data: applications = [] } = useEnterpriseApplications(
    role === 'main_admin' || role === 'super_admin' ? 'pending' : ''
  );
  const { data: allPickups = [] } = useAllPickupRequests();

  // Logistics Admin data
  const { data: logisticsPickups = [] } = useLogisticsAdminPickups(
    role === 'logistics_admin' ? userId : ''
  );

  return useMemo(() => {
    const badges: SidebarBadges = {};

    switch (role) {
      case 'it_admin': {
        // Draft batches that have assets and are ready for submission
        const draftBatches = itBatches.filter(b => b.status === 'draft');
        if (draftBatches.length > 0) badges.batches = draftBatches.length;

        // Pending pickup requests
        const pendingPickups = itPickups.filter(p => p.status === 'pending_assignment');
        if (pendingPickups.length > 0) badges.pickups = pendingPickups.length;
        break;
      }

      case 'org_admin': {
        // Batches pending Org Admin approval
        const pendingApproval = orgBatches.filter(b =>
          b.status === 'pending_cfo_approval' || b.status === 'pending_approval'
        );
        if (pendingApproval.length > 0) badges.approvals = pendingApproval.length;
        break;
      }

      case 'main_admin':
      case 'super_admin': {
        // Pending enterprise applications
        const pendingApps = applications.filter(a => a.status === 'pending');
        if (pendingApps.length > 0) badges.applications = pendingApps.length;

        // Pickups pending assignment
        const pendingAssignment = allPickups.filter(p => p.status === 'pending_assignment');
        if (pendingAssignment.length > 0) badges.opsPickups = pendingAssignment.length;
        break;
      }

      case 'logistics_admin': {
        // Pickups assigned to this logistics admin but not yet assigned to a field user
        const needsFieldUser = logisticsPickups.filter(p =>
          p.status === 'assigned' && !p.logistics_user_id
        );
        if (needsFieldUser.length > 0) badges.assignments = needsFieldUser.length;
        break;
      }

      case 'logistics_user': {
        // Scheduled pickups that need completion
        // This would need a different hook - for now we'll skip
        break;
      }
    }

    return badges;
  }, [role, itBatches, itPickups, orgBatches, applications, allPickups, logisticsPickups]);
}

/**
 * Get badge count for a specific nav path
 */
export function getBadgeForPath(badges: SidebarBadges, path: string): number | undefined {
  // Map paths to badge keys
  const pathBadgeMap: Record<string, keyof SidebarBadges> = {
    // IT Admin
    '/admin/batches': 'batches',
    '/admin/pickups': 'pickups',

    // Org Admin
    '/org-admin/approvals': 'approvals',
    '/org-admin/it-admins': 'itAdmins',

    // OPS Admin
    '/ops/applications': 'applications',
    '/ops/pickups': 'opsPickups',
    '/ops/reviews': 'reviews',
    '/ops/qc': 'qc',
    '/ops/disputes': 'disputes',

    // Super Admin
    '/super/applications': 'applications',
    '/super/pickups': 'opsPickups',
    '/super/reviews': 'reviews',
    '/super/qc': 'qc',
    '/super/disputes': 'disputes',

    // Logistics Admin
    '/logistics-admin/assignments': 'assignments',

    // Logistics User
    '/logistics': 'myPickups',
  };

  const badgeKey = pathBadgeMap[path];
  return badgeKey ? badges[badgeKey] : undefined;
}
