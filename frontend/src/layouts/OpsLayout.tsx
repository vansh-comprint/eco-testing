/**
 * OPS Admin Layout
 * V3: Custom layout for OPS Admin portal with enterprise selector
 * Wraps the standard DashboardLayout with OpsEnterpriseProvider
 */

import { useState, ReactNode } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Menu, X, LogOut } from 'lucide-react';
import { useThemeStore } from '@/stores';
import { useAuth } from '@/hooks';
import { ThemeToggleCompact, NotificationDropdown, NotificationDropdownMobile } from '@/components/ui';
import { EnterpriseSelector } from '@/components/ops';
import { OpsEnterpriseProvider, useOpsEnterprise } from '@/contexts/OpsEnterpriseContext';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface OpsLayoutProps {
  title: string;
  adminNavItems: NavItem[];       // Always visible, not filtered
  enterpriseNavItems: NavItem[];  // Only shown when enterprise selected, filtered
}

function OpsLayoutInner({ title, adminNavItems, enterpriseNavItems }: OpsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  // V3: Use React Query hook for auth
  const { user, logout } = useAuth();
  const { theme } = useThemeStore();
  const { selectedEnterprise, isAllEnterprises } = useOpsEnterprise();
  const isDark = theme === 'dark';

  // V3: logout from useAuth already handles navigation
  const handleLogout = () => {
    logout();
  };

  // Dynamic title based on selected enterprise
  const displayTitle = isAllEnterprises
    ? title
    : `${selectedEnterprise?.name || 'Enterprise'}`;

  // Render a nav item
  const renderNavItem = (item: NavItem, onClick?: () => void) => {
    const isActive = item.path.endsWith('/ops')
      ? location.pathname === item.path
      : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onClick}
        className={`interactive flex items-center gap-3 px-3 py-2 transition-all duration-300 group ${
          isActive
            ? 'bg-ecotribe-primary text-black'
            : 'text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
        }`}
      >
        <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
          isActive ? '' : 'opacity-60 group-hover:opacity-100'
        }`}>
          {item.icon}
        </span>
        {sidebarOpen && (
          <span className="font-brand font-bold text-xs uppercase tracking-wide truncate">{item.label}</span>
        )}
        {sidebarOpen && item.badge && item.badge > 0 && (
          <span className={`ml-auto font-mono font-bold text-[10px] px-1.5 py-0.5 ${
            isActive
              ? 'bg-black/10 text-black'
              : 'bg-black/10 dark:bg-white/10 text-black dark:text-white'
          }`}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className={`min-h-screen relative ${isDark ? 'bg-ecotribe-dark text-white' : 'bg-white text-slate-900'}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-out ${
          sidebarOpen ? 'w-72' : 'w-16'
        } hidden lg:block`}
      >
        <div className="h-full flex flex-col bg-white/60 dark:bg-black/60 backdrop-blur-xl border-r border-black/10 dark:border-white/10">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-black/10 dark:border-white/10">
            <Link to="/" className="interactive flex flex-col items-start min-w-0">
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
            <div className="px-4 py-3">
              <div className="px-3 py-2 border border-ecotribe-primary/30 dark:border-ecotribe-primary/20 bg-ecotribe-primary/10 dark:bg-ecotribe-primary/5 backdrop-blur-sm">
                <p className="font-mono font-bold text-[9px] uppercase tracking-widest text-ecotribe-primary/70 dark:text-ecotribe-primary/60 flex items-center gap-1">
                  <span className="text-ecotribe-primary text-base font-black">/</span> OPS Portal
                </p>
              </div>
            </div>
          )}

          {/* Navigation - Admin Section */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto">
            {/* Admin Section - Always visible */}
            <div className="space-y-1">
              {adminNavItems.map((item) => renderNavItem(item))}
            </div>

            {/* Divider */}
            <div className="my-3 mx-1 border-t border-black/10 dark:border-white/10" />

            {/* Enterprise Section Header with Selector */}
            {sidebarOpen && (
              <div className="mb-2">
                <p className="px-3 py-1 font-mono font-bold text-[9px] uppercase tracking-widest text-black/40 dark:text-zinc-600">
                  Enterprise Data
                </p>
                <div className="mt-2">
                  <EnterpriseSelector />
                </div>
              </div>
            )}

            {/* Enterprise Section - Only when enterprise selected OR viewing all */}
            <div className="space-y-1">
              {enterpriseNavItems.map((item) => renderNavItem(item))}
            </div>
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
        <div className="h-full flex items-center justify-between px-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="interactive p-2.5 -ml-2 text-black/60 dark:text-zinc-500 hover:text-black dark:hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="interactive">
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
                <Link to="/" className="interactive">
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
              <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
                <div className="px-3 py-2 border border-ecotribe-primary/30 dark:border-ecotribe-primary/20 bg-ecotribe-primary/10 dark:bg-ecotribe-primary/5 backdrop-blur-sm">
                  <p className="font-mono font-bold text-[9px] uppercase tracking-widest text-ecotribe-primary/70 dark:text-ecotribe-primary/60 flex items-center gap-1">
                    <span className="text-ecotribe-primary text-base font-black">/</span> OPS Portal
                  </p>
                </div>
              </div>

              <nav className="p-3">
                {/* Admin Section */}
                <div className="space-y-1 mb-4">
                  {adminNavItems.map((item) => renderNavItem(item, () => setMobileMenuOpen(false)))}
                </div>

                {/* Divider */}
                <div className="my-3 border-t border-black/10 dark:border-white/10" />

                {/* Enterprise Section */}
                <div className="mb-3">
                  <p className="px-3 py-1 font-mono font-bold text-[9px] uppercase tracking-widest text-black/40 dark:text-zinc-600">
                    Enterprise Data
                  </p>
                  <div className="mt-2 px-1">
                    <EnterpriseSelector />
                  </div>
                </div>

                <div className="space-y-1">
                  {enterpriseNavItems.map((item) => renderNavItem(item, () => setMobileMenuOpen(false)))}
                </div>
              </nav>

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
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-16'} pt-14 lg:pt-0`}>
        <div className="min-h-screen">
          {/* Top Bar */}
          <header className="hidden lg:flex h-16 items-center justify-between px-8 border-b border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-xl relative z-50">
            <div className="flex items-center gap-3">
              <span className="text-ecotribe-primary text-2xl font-black leading-none -translate-y-[3px]">/</span>
              <h1 className="font-brand font-bold text-lg uppercase tracking-wide text-black dark:text-white">{displayTitle}</h1>
              {!isAllEnterprises && selectedEnterprise && (
                <span className="px-2 py-0.5 border border-ecotribe-primary/30 bg-ecotribe-primary/10 font-mono text-[10px] text-ecotribe-primary uppercase tracking-wide">
                  {selectedEnterprise.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggleCompact />
              <NotificationDropdown />
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export function OpsLayout(props: OpsLayoutProps) {
  return (
    <OpsEnterpriseProvider>
      <OpsLayoutInner {...props} />
    </OpsEnterpriseProvider>
  );
}

export default OpsLayout;
