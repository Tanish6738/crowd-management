import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import data from '../Data/data.json';

/*
  ProtectedRoute
  --------------------------------------------------
  Wrap any element that requires authentication.
  If user not signed in and user state loaded, redirect to /sign-in and preserve attempted path.
*/

/*
  Authorization logic mapping:
  - superAdminDashboard => data.superAdmin array
  - adminDashboard => data.admins array
  - volunteerDashboard => data.volunteers array
  - userDashboard => anyone authenticated (or could add users array if exists)
*/

const routeToArrayKey = {
  '/superAdminDashboard': 'superAdmin',
  '/adminDashboard': 'admins',
  '/volunteerDashboard': 'volunteers',
};

const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="w-full flex items-center justify-center py-20 mk-text-muted text-sm">
        Loading...
      </div>
    );
  }

  if (requireAuth && !isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  if (requireAuth && isSignedIn) {
    const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const arrayKey = routeToArrayKey[location.pathname];
    if (arrayKey) {
      const allowedList = (data[arrayKey] || []).map(e => e.toLowerCase());
      const authorized = email && allowedList.includes(email);
      if (!authorized) {
        // Authenticated but not authorized for this higher-privilege route -> send to user dashboard
        if (location.pathname !== '/userDashboard') {
          return <Navigate to="/userDashboard" state={{ from: location.pathname, reason: 'forbidden' }} replace />;
        }
      }
    }
  }

  return children;
};

export default ProtectedRoute;