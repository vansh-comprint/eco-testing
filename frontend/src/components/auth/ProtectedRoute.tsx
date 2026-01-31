import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks';
import type { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  // V3: Use React Query hook for auth
  const { isAuthenticated, isInitialized, user } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500 dark:text-white/50">
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on role
      const redirectPath = getRoleDefaultPath(user.role);
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}

function getRoleDefaultPath(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/super';
    case 'ops_admin':
      return '/ops';
    case 'org_admin':
      return '/org-admin';
    case 'it_admin':
      return '/admin';
    case 'logistics_admin':
      return '/logistics-admin';
    case 'logistics_user':
      return '/logistics';
    case 'employee':
      return '/check-in';
    default:
      return '/login';
  }
}

// Higher-order component for route protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: UserRole[]
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute allowedRoles={allowedRoles}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
