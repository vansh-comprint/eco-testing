/**
 * Enterprise Employee Directory
 * Org Admin view showing ALL employees (sub-users) across all branches
 * Grouped by branch with search and status filtering
 */
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Users,
  Loader2,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Phone,
  Monitor,
  Download,
  Filter,
} from 'lucide-react';
import { useAuth, useSubUsers, useAssets, useBranches } from '@/hooks';
import { PageHeader, DashboardStatGrid } from '@/components/ui';
import type { StatAccent } from '@/components/ui';
import { iconSize } from '@/lib/design-tokens';
import Papa from 'papaparse';

type ViewMode = 'list' | 'by-branch';
type StatusFilter = 'all' | 'active' | 'pending_invite' | 'inactive';

export function EnterpriseEmployees() {
  const { enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  const { data: employees = [], isLoading } = useSubUsers(enterpriseId);
  const { data: assets = [] } = useAssets(enterpriseId);
  const { data: branches = [] } = useBranches(enterpriseId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Branch lookup (API returns branch_name, fallback to name for safety)
  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((b: any) => map.set(b.id, b.branch_name || b.name || ''));
    return map;
  }, [branches]);

  // Count assets per employee
  const employeeAssetCounts = useMemo(() => {
    const counts = new Map<string, { assigned: number; submitted: number }>();
    assets.forEach(a => {
      if (a.assigned_to) {
        const current = counts.get(a.assigned_to) || { assigned: 0, submitted: 0 };
        current.assigned++;
        if (['submitted', 'remote_review', 'facility_review', 'conditionally_accepted', 'final_accepted', 'completed'].includes(a.status)) {
          current.submitted++;
        }
        counts.set(a.assigned_to, current);
      }
    });
    return counts;
  }, [assets]);

  // Stats
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const pending = employees.filter(e => e.status === 'pending_invite').length;
    const inactive = employees.filter(e => e.status === 'inactive').length;
    const totalAssigned = Array.from(employeeAssetCounts.values()).reduce((sum, c) => sum + c.assigned, 0);
    return { total, active, pending, inactive, totalAssigned };
  }, [employees, employeeAssetCounts]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter);
    }

    if (branchFilter !== 'all') {
      result = result.filter(e => e.branch_id === branchFilter);
    }

    result.sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''));
    return result;
  }, [employees, searchQuery, statusFilter, branchFilter]);

  // Group by branch
  const employeesByBranch = useMemo(() => {
    const groups = new Map<string, typeof filteredEmployees>();
    filteredEmployees.forEach(e => {
      const branchId = e.branch_id || 'unassigned';
      const existing = groups.get(branchId) || [];
      existing.push(e);
      groups.set(branchId, existing);
    });
    return groups;
  }, [filteredEmployees]);

  const handleExport = () => {
    const csv = Papa.unparse(filteredEmployees.map(e => ({
      name: e.name || '',
      email: e.email,
      phone: e.phone || '',
      role: (e.role || 'employee').replace(/_/g, ' '),
      department: e.department || '',
      branch: branchMap.get(e.branch_id || '') || '',
      status: e.status,
      assets_assigned: employeeAssetCounts.get(e.id)?.assigned || 0,
      assets_submitted: employeeAssetCounts.get(e.id)?.submitted || 0,
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enterprise-employees-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') return { color: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-500', icon: <CheckCircle className="w-3 h-3" /> };
    if (status === 'pending_invite') return { color: 'border-amber-400/30 bg-amber-400/10 text-amber-500', icon: <Clock className="w-3 h-3" /> };
    return { color: 'border-slate-400/30 bg-slate-400/10 text-slate-500', icon: <XCircle className="w-3 h-3" /> };
  };

  const statItems = [
    { label: 'Total Employees', value: stats.total, icon: <Users className={`${iconSize.lg} text-slate-500`} />, accent: 'neutral' as StatAccent },
    { label: 'Active', value: stats.active, icon: <CheckCircle className={`${iconSize.lg} text-emerald-500`} />, accent: 'success' as StatAccent, onClick: () => setStatusFilter('active') },
    { label: 'Pending Invite', value: stats.pending, icon: <Clock className={`${iconSize.lg} text-amber-500`} />, accent: (stats.pending > 0 ? 'warning' : 'neutral') as StatAccent, onClick: () => setStatusFilter('pending_invite') },
    { label: 'Assets Assigned', value: stats.totalAssigned, icon: <Monitor className={`${iconSize.lg} text-blue-500`} />, accent: 'info' as StatAccent },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ecotribe-primary animate-spin mx-auto mb-4" />
          <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Loading enterprise employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        label="Enterprise Overview"
        title="All Employees"
        subtitle={`${employees.length} employees across ${branches.length} branches`}
        actions={
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono font-bold text-xs uppercase tracking-widest hover:border-blue-500/40 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        }
      />

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DashboardStatGrid items={statItems} columns={4} />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/30" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${statusFilter !== 'all' ? 'text-ecotribe-primary' : 'text-slate-400'}`} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={`pl-9 pr-8 py-3 border bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:border-ecotribe-primary focus:outline-none appearance-none cursor-pointer ${statusFilter !== 'all' ? 'border-ecotribe-primary/50' : 'border-slate-200 dark:border-white/10'}`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending_invite">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="relative">
            <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${branchFilter !== 'all' ? 'text-ecotribe-primary' : 'text-slate-400'}`} />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`pl-9 pr-8 py-3 border bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono text-xs uppercase tracking-widest focus:border-ecotribe-primary focus:outline-none appearance-none cursor-pointer ${branchFilter !== 'all' ? 'border-ecotribe-primary/50' : 'border-slate-200 dark:border-white/10'}`}
            >
              <option value="all">All Branches</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.branch_name || b.name}</option>
              ))}
            </select>
          </div>
          {/* View toggle */}
          <div className="flex border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 font-mono font-bold text-[10px] uppercase tracking-widest transition-colors ${
                viewMode === 'list' ? 'bg-ecotribe-primary text-black' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('by-branch')}
              className={`px-3 py-2 font-mono font-bold text-[10px] uppercase tracking-widest transition-colors ${
                viewMode === 'by-branch' ? 'bg-ecotribe-primary text-black' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              By Branch
            </button>
          </div>
        </div>
      </motion.div>

      {/* Results count + clear filters */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
          {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
        </p>
        {(statusFilter !== 'all' || branchFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => { setStatusFilter('all'); setBranchFilter('all'); setSearchQuery(''); }}
            className="font-mono text-xs text-ecotribe-primary hover:text-ecotribe-primary/70 uppercase tracking-widest transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Employee List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {viewMode === 'by-branch' ? (
          /* Grouped by Branch */
          <div className="space-y-6">
            {Array.from(employeesByBranch.entries()).map(([branchId, branchEmployees]) => (
              <div key={branchId} className="border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-zinc-900/75">
                <div className="p-4 bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-ecotribe-primary" />
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                      {branchId === 'unassigned' ? 'Unassigned' : branchMap.get(branchId) || branchId}
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                    {branchEmployees.length} employee{branchEmployees.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {branchEmployees.map(emp => (
                    <EmployeeRow key={emp.id} employee={emp} assetCounts={employeeAssetCounts.get(emp.id)} getStatusBadge={getStatusBadge} />
                  ))}
                </div>
              </div>
            ))}
            {employeesByBranch.size === 0 && <EmptyState searchQuery={searchQuery} />}
          </div>
        ) : (
          /* Flat List */
          <div className="border border-slate-200 dark:border-white/10 bg-white/98 dark:bg-zinc-900/75 overflow-x-auto">
            <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_100px_120px_80px_80px] gap-3 p-4 bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10">
              <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Employee</p>
              <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Branch</p>
              <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Role</p>
              <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest">Status</p>
              <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest text-center">Assigned</p>
              <p className="font-mono font-bold text-[10px] text-slate-500 dark:text-white/50 uppercase tracking-widest text-center">Submitted</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/5">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const counts = employeeAssetCounts.get(emp.id);
                  const badge = getStatusBadge(emp.status);
                  return (
                    <div key={emp.id} className="grid grid-cols-[1fr_1fr_100px_120px_80px_80px] gap-3 p-4 items-center hover:bg-lime-50/30 dark:hover:bg-lime-500/5 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-ecotribe-primary/10 border border-ecotribe-primary/20 flex items-center justify-center flex-shrink-0">
                          <span className="font-mono font-bold text-xs text-ecotribe-primary uppercase">
                            {(emp.name || emp.email || '?').charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">{emp.name || '—'}</p>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <p className="font-mono text-[11px] text-slate-500 dark:text-zinc-500 truncate">{emp.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <p className="font-mono text-xs text-slate-600 dark:text-zinc-400 truncate">
                          {branchMap.get(emp.branch_id || '') || '—'}
                        </p>
                      </div>
                      <p className="font-mono text-xs text-slate-600 dark:text-zinc-400 capitalize truncate">
                        {(emp.role || 'employee').replace(/_/g, ' ')}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest w-fit ${badge.color}`}>
                        {badge.icon}
                        {emp.status === 'pending_invite' ? 'Pending' : emp.status}
                      </span>
                      <p className="font-mono text-sm text-slate-600 dark:text-zinc-400 text-center">{counts?.assigned || 0}</p>
                      <p className="font-mono text-sm text-ecotribe-primary text-center font-bold">{counts?.submitted || 0}</p>
                    </div>
                  );
                })
              ) : (
                <EmptyState searchQuery={searchQuery} />
              )}
            </div>
            </div>{/* min-w-[700px] */}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function EmployeeRow({ employee: emp, assetCounts, getStatusBadge }: {
  employee: any;
  assetCounts?: { assigned: number; submitted: number };
  getStatusBadge: (s: string) => { color: string; icon: React.ReactElement };
}) {
  const badge = getStatusBadge(emp.status);
  return (
    <div className="p-4 flex items-center gap-4 hover:bg-lime-50/30 dark:hover:bg-lime-500/5 transition-colors">
      <div className="w-9 h-9 bg-ecotribe-primary/10 border border-ecotribe-primary/20 flex items-center justify-center flex-shrink-0">
        <span className="font-mono font-bold text-xs text-ecotribe-primary uppercase">
          {(emp.name || emp.email || '?').charAt(0)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">{emp.name || '—'}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-500">{emp.email}</span>
          </span>
          {emp.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-500">{emp.phone}</span>
            </span>
          )}
          {emp.department && (
            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 font-mono text-[10px] text-slate-500 dark:text-zinc-500 uppercase">
              {emp.department}
            </span>
          )}
        </div>
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${badge.color}`}>
        {badge.icon}
        {emp.status === 'pending_invite' ? 'Pending' : emp.status}
      </span>
      <div className="text-right flex-shrink-0 w-20">
        <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">{assetCounts?.assigned || 0} assigned</p>
        <p className="font-mono text-xs text-ecotribe-primary font-bold">{assetCounts?.submitted || 0} submitted</p>
      </div>
    </div>
  );
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="py-16 text-center">
      <Users className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-4" />
      <p className="font-display font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-wide mb-1">No employees found</p>
      <p className="font-mono text-xs text-slate-400 dark:text-zinc-600">
        {searchQuery ? 'Try adjusting your search.' : 'IT Admins manage employees at the branch level.'}
      </p>
    </div>
  );
}

export default EnterpriseEmployees;
