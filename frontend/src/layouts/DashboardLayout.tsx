import { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, Menu, X, LogOut, ToggleLeft, ToggleRight } from 'lucide-react';
import { useThemeStore } from '@/stores';
import { useAuth } from '@/hooks';
import { ThemeToggleCompact, NotificationDropdown, NotificationDropdownMobile } from '@/components/ui';
import { OrgBranchProvider, ITAdminBranchProvider } from '@/contexts';
import { OpsEnterpriseProvider } from '@/contexts/OpsEnterpriseContext';
import { BranchSelector } from '@/components/org-admin';
import { ITAdminBranchSelector } from '@/components/admin/ITAdminBranchSelector';
import { EnterpriseSelector } from '@/components/ops/EnterpriseSelector';
import { usePermission, type PermissionValue } from '@/permissions';
import type { UserRole } from '@/types';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  /** If set, nav item only shown when user has this permission */
  permission?: PermissionValue;
  /** If set, nav item only shown when user has any of these permissions */
  anyPermission?: PermissionValue[];
  children?: NavItem[];
}

const roleDashboardPath: Record<string, string> = {
  super_admin: '/super',
  main_admin: '/ops',
  ops_admin: '/ops',
  technician: '/ops',
  org_admin: '/org-admin',
  it_admin: '/admin',
  sub_user: '/check-in',
  employee: '/check-in',
  logistics_admin: '/logistics-admin',
  logistics_user: '/logistics',
};

interface DashboardLayoutProps {
  role: UserRole;
  title: string;
  navItems: NavItem[];
  itViewNavItems?: NavItem[]; // Optional IT Admin view items for Org Admin toggle
  opsViewNavItems?: NavItem[]; // Optional OPS view items for Super Admin toggle
}

function DashboardLayoutInner({ role, title, navItems, itViewNavItems, opsViewNavItems }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [itAdminViewEnabled, setItAdminViewEnabled] = useState(() => {
    return sessionStorage.getItem('org_branch_ops_enabled') === 'true';
  });
  const [opsViewEnabled, setOpsViewEnabled] = useState(() => {
    return sessionStorage.getItem('super_ops_view_enabled') === 'true';
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Permission-based nav item filtering
  const { hasPermission, hasAnyPermission } = usePermission();

  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.reduce<NavItem[]>((acc, item) => {
      // Check permission gate on this item
      if (item.permission && !hasPermission(item.permission)) return acc;
      if (item.anyPermission && !hasAnyPermission(item.anyPermission)) return acc;
      // Filter children recursively
      const filtered = { ...item };
      if (filtered.children) {
        filtered.children = filterNavItems(filtered.children);
      }
      acc.push(filtered);
      return acc;
    }, []);
  };

  const filteredNavItems = useMemo(() => filterNavItems(navItems), [navItems, hasPermission, hasAnyPermission]);
  const filteredItViewNavItems = useMemo(
    () => (itViewNavItems ? filterNavItems(itViewNavItems) : undefined),
    [itViewNavItems, hasPermission, hasAnyPermission]
  );
  const filteredOpsViewNavItems = useMemo(
    () => (opsViewNavItems ? filterNavItems(opsViewNavItems) : undefined),
    [opsViewNavItems, hasPermission, hasAnyPermission]
  );

  // Persist Branch Ops toggle state
  useEffect(() => {
    sessionStorage.setItem('org_branch_ops_enabled', String(itAdminViewEnabled));
  }, [itAdminViewEnabled]);

  // Persist OPS Operations toggle state
  useEffect(() => {
    sessionStorage.setItem('super_ops_view_enabled', String(opsViewEnabled));
  }, [opsViewEnabled]);
  const location = useLocation();

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Auto-expand group if a child route is active
  const isChildActive = (item: NavItem) =>
    item.children?.some(child =>
      location.pathname === child.path || location.pathname.startsWith(child.path + '/')
    ) ?? false;
  // V3: Use React Query hook for auth
  const { user, logout } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const homePath = roleDashboardPath[user?.role || ''] || '/';

  // V3: logout from useAuth already handles navigation
  const handleLogout = () => {
    logout();
  };

  return (
    <div className={`min-h-screen relative ${isDark ? 'bg-ecotribe-dark text-white' : 'bg-white text-slate-900'}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-out ${
          sidebarOpen ? 'w-64' : 'w-16'
        } hidden lg:block`}
      >
        <div className="h-full flex flex-col bg-white/60 dark:bg-black/60 backdrop-blur-xl border-r border-black/10 dark:border-white/10"
>
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-black/10 dark:border-white/10">
            <Link to={homePath} className="interactive flex flex-col items-start min-w-0">
              <AnimatePresence mode="wait">
                {sidebarOpen ? (
                  <motion.div
                    key="full-logo"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col items-start"
                  >
                    <span className="font-brand font-black text-xl tracking-tight leading-none text-black dark:text-white">
                      ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
                    </span>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="flex items-center gap-1.5 mt-1 opacity-70"
                    >
                      <span className="font-mono text-[8px] uppercase tracking-wider text-black/60 dark:text-zinc-500">a</span>
                      <div className="flex items-baseline tracking-[-0.03em]">
                        <span className="font-brand font-bold text-[9px] uppercase text-slate-900 dark:text-comprint-primary">COM</span>
                        <span className="font-brand font-bold text-[9px] uppercase text-slate-900 dark:text-comprint-primary">PRINT</span>
                        <div className="w-[2px] h-[2px] ml-[2px] rounded-[0.5px] animate-pulse bg-slate-900 dark:bg-comprint-primary"></div>
                      </div>
                      <span className="font-mono text-[8px] uppercase tracking-wider text-black/60 dark:text-zinc-500">brand</span>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="compact-logo"
                    initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex items-center justify-center"
                  >
                    <span className="font-brand font-black text-2xl tracking-tight leading-none text-black dark:text-white">
                      E<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">T</span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="interactive p-1.5 text-black/40 dark:text-zinc-600 hover:text-ecotribe-primary dark:hover:text-ecotribe-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Portal Badge */}
          {sidebarOpen && (
            <div className="px-4 py-4">
              <div className="px-3 py-2.5 border border-ecotribe-primary/30 dark:border-ecotribe-primary/20 bg-ecotribe-primary/10 dark:bg-ecotribe-primary/5 backdrop-blur-sm">
                <p className="font-mono font-bold text-[9px] uppercase tracking-widest mb-0.5 text-ecotribe-primary/70 dark:text-ecotribe-primary/60 flex items-center gap-1">
                  <span className="text-ecotribe-primary text-base font-black">/</span> Portal
                </p>
                <p className="font-brand font-bold text-sm uppercase tracking-wide truncate text-ecotribe-primary">{title}</p>
              </div>
            </div>
          )}

          {/* IT Admin Branch Selector - Above nav since it scopes all data */}
          {role === 'it_admin' && sidebarOpen && (
            <div className="px-3 pb-1">
              <p className="px-2.5 pb-1 font-mono font-bold text-[9px] uppercase tracking-widest text-black/30 dark:text-zinc-600">
                Branch
              </p>
              <ITAdminBranchSelector />
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;

              if (hasChildren) {
                const childActive = isChildActive(item);
                const isExpanded = expandedGroups[item.label] ?? childActive;

                return (
                  <div key={item.path}>
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={`interactive w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-300 group btn-chamfer ${
                        childActive
                          ? 'text-black dark:text-white'
                          : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
                        childActive ? '' : 'opacity-60 group-hover:opacity-100'
                      }`}>
                        {item.icon}
                      </span>
                      {sidebarOpen && (
                        <>
                          <span className="font-brand font-bold text-sm uppercase tracking-wide truncate">{item.label}</span>
                          <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>
                    {sidebarOpen && isExpanded && (
                      <div className="ml-4 pl-4 border-l border-black/10 dark:border-white/10 space-y-0.5 mt-0.5 mb-1">
                        {item.children!.map((child) => {
                          const isChildItemActive = location.pathname === child.path || location.pathname.startsWith(child.path + '/');
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              className={`interactive flex items-center gap-3 px-3 py-2 transition-all duration-300 group btn-chamfer ${
                                isChildItemActive
                                  ? 'bg-ecotribe-primary text-black'
                                  : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
                                isChildItemActive ? '' : 'opacity-60 group-hover:opacity-100'
                              }`}>
                                {child.icon}
                              </span>
                              <span className="font-brand font-bold text-xs uppercase tracking-wide truncate">{child.label}</span>
                              {child.badge && child.badge > 0 && (
                                <span className={`ml-auto font-mono font-bold text-[10px] px-2 py-0.5 ${
                                  isChildItemActive
                                    ? 'bg-black/10 text-black'
                                    : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'
                                }`}>
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular nav item (no children)
              // More precise active check - dashboard should only match exact path
              const isActive = item.path.endsWith('/admin') || item.path.endsWith('/ops') || item.path.endsWith('/review') || item.path.endsWith('/org-admin') || item.path.endsWith('/super')
                ? location.pathname === item.path
                : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`interactive flex items-center gap-3 px-3 py-2.5 transition-all duration-300 group btn-chamfer ${
                    isActive
                      ? 'bg-ecotribe-primary text-black'
                      : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
                    isActive ? '' : 'opacity-60 group-hover:opacity-100'
                  }`}>
                    {item.icon}
                  </span>
                  {sidebarOpen && (
                    <span className="font-brand font-bold text-sm uppercase tracking-wide truncate">{item.label}</span>
                  )}
                  {sidebarOpen && item.badge && item.badge > 0 && (
                    <span className={`ml-auto font-mono font-bold text-[10px] px-2 py-0.5 ${
                      isActive
                        ? 'bg-black/10 text-black'
                        : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Branch Operations Toggle - Only for Org Admin */}
            {role === 'org_admin' && filteredItViewNavItems && sidebarOpen && (
              <>
                <div className="my-3 border-t border-black/10 dark:border-white/10" />
                <button
                  onClick={() => setItAdminViewEnabled(!itAdminViewEnabled)}
                  className={`interactive w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ${
                    itAdminViewEnabled
                      ? 'text-ecotribe-primary'
                      : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {itAdminViewEnabled ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  <span className="font-mono font-bold text-xs uppercase tracking-widest">Branch Ops</span>
                </button>

                {/* V3.2: Branch Selector - when IT Admin View is enabled */}
                <AnimatePresence>
                  {itAdminViewEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 mb-2"
                    >
                      <p className="px-3 py-1 font-mono font-bold text-[9px] uppercase tracking-widest text-black/40 dark:text-zinc-600">
                        Filter by Branch
                      </p>
                      <div className="mt-1">
                        <BranchSelector />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Nested IT Admin Nav Items */}
                <AnimatePresence>
                  {itAdminViewEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-2 pl-2 border-l-2 border-ecotribe-primary/30 space-y-1"
                    >
                      {filteredItViewNavItems.map((item) => {
                        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`interactive flex items-center gap-3 px-3 py-2 transition-all duration-300 group ${
                              isActive
                                ? 'bg-ecotribe-primary/20 text-ecotribe-primary'
                                : 'text-black/50 dark:text-zinc-600 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
                              isActive ? '' : 'opacity-60 group-hover:opacity-100'
                            }`}>
                              {item.icon}
                            </span>
                            <span className="font-brand font-bold text-xs uppercase tracking-wide truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* OPS Operations Toggle - Only for Super Admin */}
            {role === 'super_admin' && filteredOpsViewNavItems && sidebarOpen && (
              <>
                <div className="my-3 border-t border-black/10 dark:border-white/10" />
                <button
                  onClick={() => setOpsViewEnabled(!opsViewEnabled)}
                  className={`interactive w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ${
                    opsViewEnabled
                      ? 'text-ecotribe-primary'
                      : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {opsViewEnabled ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  <span className="font-mono font-bold text-xs uppercase tracking-widest">OPS Operations</span>
                </button>

                {/* Enterprise Selector - when OPS view is enabled */}
                <AnimatePresence>
                  {opsViewEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 mb-2"
                    >
                      <p className="px-3 py-1 font-mono font-bold text-[9px] uppercase tracking-widest text-black/40 dark:text-zinc-600">
                        Filter by Enterprise
                      </p>
                      <div className="mt-1">
                        <EnterpriseSelector />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Nested OPS Nav Items */}
                <AnimatePresence>
                  {opsViewEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-2 pl-2 border-l-2 border-ecotribe-primary/30 space-y-1"
                    >
                      {filteredOpsViewNavItems.map((item) => {
                        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`interactive flex items-center gap-3 px-3 py-2 transition-all duration-300 group ${
                              isActive
                                ? 'bg-ecotribe-primary/20 text-ecotribe-primary'
                                : 'text-black/50 dark:text-zinc-600 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
                              isActive ? '' : 'opacity-60 group-hover:opacity-100'
                            }`}>
                              {item.icon}
                            </span>
                            <span className="font-brand font-bold text-xs uppercase tracking-wide truncate">{item.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="p-3 border-t border-black/10 dark:border-white/10">
            <div className={`flex items-center gap-3 px-2 py-2 ${sidebarOpen ? '' : 'justify-center'}`}>
              <div className="w-10 h-10 border border-ecotribe-primary/30 dark:border-ecotribe-primary/20 bg-ecotribe-primary/10 dark:bg-ecotribe-primary/5 flex items-center justify-center font-brand font-bold text-sm flex-shrink-0 text-ecotribe-primary">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="font-brand font-bold text-sm uppercase truncate text-black dark:text-white">{user?.name}</p>
                  <p className="font-mono text-[10px] truncate uppercase tracking-widest text-black/40 dark:text-zinc-600">{user?.email}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                type="button"
                onClick={handleLogout}
                className="interactive mt-2 w-full flex items-center gap-2 px-3 py-2.5 font-mono font-bold text-xs border border-transparent uppercase tracking-widest transition-all text-black/60 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/30 dark:hover:border-red-500/20 hover:bg-red-500/10 dark:hover:bg-red-500/5"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/10 dark:border-white/10">
        <div className="h-full flex items-center justify-between px-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="interactive p-2 -ml-2 text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to={homePath} className="interactive">
            <span className="font-brand font-black text-lg tracking-tight text-black dark:text-white">
              ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggleCompact />
            <NotificationDropdownMobile />
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/80 dark:bg-black/90 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-r border-black/10 dark:border-white/10"
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-black/10 dark:border-white/10">
                <Link to={homePath} className="interactive">
                  <span className="font-brand font-black text-xl tracking-tight text-black dark:text-white">
                    ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
                  </span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="interactive p-2 -mr-2 text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Portal Badge */}
              <div className="px-4 py-4 border-b border-black/10 dark:border-white/10">
                <div className="px-3 py-2.5 border border-ecotribe-primary/30 dark:border-ecotribe-primary/20 bg-ecotribe-primary/10 dark:bg-ecotribe-primary/5 backdrop-blur-sm">
                  <p className="font-mono font-bold text-[9px] uppercase tracking-widest mb-0.5 text-ecotribe-primary/70 dark:text-ecotribe-primary/60 flex items-center gap-1">
                    <span className="text-ecotribe-primary text-base font-black">/</span> Portal
                  </p>
                  <p className="font-brand font-bold text-sm uppercase tracking-wide text-ecotribe-primary">{title}</p>
                </div>
              </div>

              <nav className="p-3 space-y-1">
                {filteredNavItems.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;

                  if (hasChildren) {
                    const childActive = isChildActive(item);
                    const isExpanded = expandedGroups[item.label] ?? childActive;
                    return (
                      <div key={item.path}>
                        <button
                          onClick={() => toggleGroup(item.label)}
                          className={`interactive w-full flex items-center gap-3 px-3 py-3 transition-all duration-300 ${
                            childActive
                              ? 'text-black dark:text-white'
                              : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          <span className="w-5 h-5">{item.icon}</span>
                          <span className="font-brand font-bold text-sm uppercase tracking-wide">{item.label}</span>
                          <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {isExpanded && (
                          <div className="ml-4 pl-4 border-l border-black/10 dark:border-white/10 space-y-0.5 mt-0.5 mb-1">
                            {item.children!.map((child) => {
                              const isChildItemActive = location.pathname === child.path || location.pathname.startsWith(child.path + '/');
                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`interactive flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ${
                                    isChildItemActive
                                      ? 'bg-ecotribe-primary text-black'
                                      : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                  }`}
                                >
                                  <span className="w-4 h-4">{child.icon}</span>
                                  <span className="font-brand font-bold text-xs uppercase tracking-wide">{child.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`interactive flex items-center gap-3 px-3 py-3 transition-all duration-300 ${
                        isActive
                          ? 'bg-ecotribe-primary text-black'
                          : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="w-5 h-5">{item.icon}</span>
                      <span className="font-brand font-bold text-sm uppercase tracking-wide">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className={`ml-auto font-mono font-bold text-[10px] px-2 py-0.5 ${
                          isActive
                            ? 'bg-black/10 text-black'
                            : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Branch Ops Toggle - Only for Org Admin */}
              {role === 'org_admin' && filteredItViewNavItems && (
                <div className="px-3 pb-3">
                  <div className="my-2 border-t border-black/10 dark:border-white/10" />
                  <button
                    onClick={() => setItAdminViewEnabled(!itAdminViewEnabled)}
                    className={`interactive w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ${
                      itAdminViewEnabled
                        ? 'text-ecotribe-primary'
                        : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {itAdminViewEnabled ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                    <span className="font-mono font-bold text-xs uppercase tracking-widest">Branch Ops</span>
                  </button>

                  {itAdminViewEnabled && (
                    <>
                      <div className="mt-2 mb-2">
                        <p className="px-3 py-1 font-mono font-bold text-[9px] uppercase tracking-widest text-black/40 dark:text-zinc-600">
                          Filter by Branch
                        </p>
                        <div className="mt-1">
                          <BranchSelector />
                        </div>
                      </div>
                      <div className="ml-2 pl-2 border-l-2 border-ecotribe-primary/30 space-y-1">
                        {filteredItViewNavItems.map((item) => {
                          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`interactive flex items-center gap-3 px-3 py-2 transition-all duration-300 ${
                                isActive
                                  ? 'bg-ecotribe-primary/20 text-ecotribe-primary'
                                  : 'text-black/50 dark:text-zinc-600 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{item.icon}</span>
                              <span className="font-brand font-bold text-xs uppercase tracking-wide truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile OPS Operations Toggle - Only for Super Admin */}
              {role === 'super_admin' && filteredOpsViewNavItems && (
                <div className="px-3 pb-3">
                  <div className="my-2 border-t border-black/10 dark:border-white/10" />
                  <button
                    onClick={() => setOpsViewEnabled(!opsViewEnabled)}
                    className={`interactive w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-300 ${
                      opsViewEnabled
                        ? 'text-ecotribe-primary'
                        : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {opsViewEnabled ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                    <span className="font-mono font-bold text-xs uppercase tracking-widest">OPS Operations</span>
                  </button>

                  {opsViewEnabled && (
                    <>
                      <div className="mt-2 mb-2">
                        <p className="px-3 py-1 font-mono font-bold text-[9px] uppercase tracking-widest text-black/40 dark:text-zinc-600">
                          Filter by Enterprise
                        </p>
                        <div className="mt-1">
                          <EnterpriseSelector />
                        </div>
                      </div>
                      <div className="ml-2 pl-2 border-l-2 border-ecotribe-primary/30 space-y-1">
                        {filteredOpsViewNavItems.map((item) => {
                          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`interactive flex items-center gap-3 px-3 py-2 transition-all duration-300 ${
                                isActive
                                  ? 'bg-ecotribe-primary/20 text-ecotribe-primary'
                                  : 'text-black/50 dark:text-zinc-600 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">{item.icon}</span>
                              <span className="font-brand font-bold text-xs uppercase tracking-wide truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile User Info */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 border border-ecotribe-primary/30 dark:border-ecotribe-primary/20 bg-ecotribe-primary/10 dark:bg-ecotribe-primary/5 flex items-center justify-center font-brand font-bold text-ecotribe-primary">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-brand font-bold text-sm uppercase truncate text-black dark:text-white">{user?.name}</p>
                    <p className="font-mono text-[10px] truncate uppercase tracking-widest text-black/40 dark:text-zinc-600">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="interactive w-full flex items-center justify-center gap-2 px-3 py-2.5 font-mono font-bold text-xs border border-black/10 dark:border-white/10 uppercase tracking-widest transition-all text-black/60 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/30 dark:hover:border-red-500/20 hover:bg-red-500/10 dark:hover:bg-red-500/5"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} pt-14 lg:pt-0`}>
        <div className="min-h-screen">
          {/* Top Bar */}
          <header className="hidden lg:flex h-16 items-center justify-between px-8 border-b border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-xl relative z-50">
            <div className="flex items-center gap-3">
              <span className="text-ecotribe-primary text-2xl font-black leading-none -translate-y-[3px]">/</span>
              <h1 className="font-brand font-bold text-lg uppercase tracking-wide text-black dark:text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggleCompact />
              <NotificationDropdown />
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * DashboardLayout Wrapper
 * V3.2: Wraps Org Admin portal with OrgBranchProvider for branch filtering
 */
export function DashboardLayout(props: DashboardLayoutProps) {
  // Wrap Org Admin portal with OrgBranchProvider for branch filtering
  if (props.role === 'org_admin') {
    return (
      <OrgBranchProvider>
        <DashboardLayoutInner {...props} />
      </OrgBranchProvider>
    );
  }

  // Wrap IT Admin portal with ITAdminBranchProvider for branch filtering
  if (props.role === 'it_admin') {
    return (
      <ITAdminBranchProvider>
        <DashboardLayoutInner {...props} />
      </ITAdminBranchProvider>
    );
  }

  // Wrap Super Admin portal with OpsEnterpriseProvider for enterprise filtering
  if (props.role === 'super_admin') {
    return (
      <OpsEnterpriseProvider>
        <DashboardLayoutInner {...props} />
      </OpsEnterpriseProvider>
    );
  }

  // Other roles don't need extra context
  return <DashboardLayoutInner {...props} />;
}
