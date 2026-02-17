import { Navigate } from 'react-router-dom';

/**
 * route '/' จะเป็นหน้า dashboard ตาม role ของ user ที่ login แล้ว
 * ถ้า user ไม่ได้ login '/' จะเป็นหน้า login
 */
function RoleDashboardRedirect() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || token === 'undefined' || token === 'null') {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'TEACHER':
      return <Navigate to="/me/teacher" replace />;
    case 'STUDENT':
      return <Navigate to="/me/student" replace />;
    case 'ADMIN':
      return <Navigate to="/me/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export default RoleDashboardRedirect;
