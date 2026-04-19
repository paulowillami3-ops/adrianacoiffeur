import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  authLoading: boolean;
  currentUserRole: 'CUSTOMER' | 'BARBER';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  authLoading,
  currentUserRole,
}) => {
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (currentUserRole !== 'BARBER') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
