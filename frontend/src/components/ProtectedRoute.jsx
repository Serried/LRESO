import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

function ProtectedRoute({children, allowedRole}) {

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRole && !allowedRole.includes(user.role)) {
      return <Navigate to="/" replace />
    }
  return children;
}

export default ProtectedRoute