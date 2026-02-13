import { Route, Routes } from 'react-router-dom'
import TeacherDash from './components/TeacherDash.jsx'
import StudentDash from './components/StudentDash.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './components/Login.jsx'
import AdminDash from './components/AdminDash.jsx'
import RoleDashboardRedirect from './components/RoleDashboardRedirect.jsx'

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<RoleDashboardRedirect />} />
        <Route path="/login" element={<Login />}></Route>
        <Route path="/teacher" element={
          <ProtectedRoute>
          <TeacherDash />
          </ProtectedRoute>
          }></Route>
        <Route path="/student" element={
          <ProtectedRoute>
          <StudentDash />
          </ProtectedRoute>
          }></Route>
    // AdminDash
    <Route path="/admin" element= {
          <ProtectedRoute allowedRole={['ADMIN']}>
          <AdminDash />
          </ProtectedRoute>
    } ></Route>
    </Routes>
    </>
  )
}

export default App
