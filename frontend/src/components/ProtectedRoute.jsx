import React from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'

function ProtectedRoute({ allowedRole}) {

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const location = useLocation();

    if (!token || token === 'undefined' || token === 'null') {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRole && !allowedRole.includes(user.role)) {
      return <Navigate to="/" replace />
    }
  return <Outlet />;
}

export default ProtectedRoute