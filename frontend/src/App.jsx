import { Route, Routes } from 'react-router-dom'
import TeacherDash from './components/TeacherDash.jsx'
import StudentDash from './components/StudentDash.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './components/Login.jsx'
import AdminDash from './components/AdminDash.jsx'
import RoleDashboardRedirect from './components/RoleDashboardRedirect.jsx'
import S_ContactStaff from './components/S_ContactStaff.jsx'
import S_Schedule from './components/S_Schedule.jsx'
import S_News from './components/S_News.jsx'
import S_Kormoon from './components/S_Kormoon.jsx'
import BugReport from './components/BugReport.jsx'
import A_AddTeacher from './components/A_AddTeacher.jsx'
import A_AddStudent from './components/A_AddStudent.jsx'
import A_ManageNews from './components/A_ManageNews.jsx'
import A_ManageReport from './components/A_ManageReport.jsx'
import A_ManageSubject from './components/A_ManageSubject.jsx'
import T_Kormoon from './components/T_Kormoon.jsx'
import T_ManageScore from './components/T_ManageScore.jsx'
import T_News from './components/T_News.jsx'
import T_Schedule from './components/T_Schedule.jsx'
import RoleBasedRoute from './components/RoleBasedRoute.jsx'

function App() {

  return (
    <>
<Routes>

  <Route path="/" element={<RoleDashboardRedirect />} />
  <Route path="/login" element={<Login />} />
  <Route path='/bug-report' element={<BugReport />}></Route>

  {/* eacher & student dashboard */}
  <Route element={<ProtectedRoute />}>
    <Route path="/me/teacher" element={<TeacherDash />} />
    <Route path="/me/student" element={<StudentDash />} />

    {/* role-based (teacher vs student) */}
    <Route path="/me/data" element={<RoleBasedRoute teacherComponent={<T_Kormoon />} studentComponent={<S_Kormoon />} />} />
    <Route path="/me/news" element={<RoleBasedRoute teacherComponent={<T_News />} studentComponent={<S_News />} />} />
    <Route path="/me/schedule" element={<RoleBasedRoute teacherComponent={<T_Schedule />} studentComponent={<S_Schedule />} />} />

    {/* student-only */}
    <Route element={<ProtectedRoute allowedRole={['STUDENT']} />}>
      <Route path="/me/help" element={<S_ContactStaff />} />
    </Route>
  </Route>

  {/* teacher-only */}
  <Route element={<ProtectedRoute allowedRole={['TEACHER']} />}>
    <Route path="/me/manage-score" element={<T_ManageScore />} />
  </Route>

  {/* admin */}
  <Route element={<ProtectedRoute allowedRole={['ADMIN']} />}>
    <Route path="/me/admin" element={<AdminDash />} />
  </Route>
  <Route element={<ProtectedRoute allowedRole={['ADMIN']} />}>
    <Route path="/me/manage-subject" element={<A_ManageSubject />} />
  </Route>
  <Route element={<ProtectedRoute allowedRole={['ADMIN']} />}>
    <Route path="/me/manage-news" element={<A_ManageNews />} />
  </Route>
  <Route element={<ProtectedRoute allowedRole={['ADMIN']} />}>
    <Route path="/me/add-student" element={<A_AddStudent />} />
  </Route>
  <Route element={<ProtectedRoute allowedRole={['ADMIN']} />}>
    <Route path="/me/add-teacher" element={<A_AddTeacher />} />
  </Route>
  <Route element={<ProtectedRoute allowedRole={['ADMIN']} />}>
    <Route path="/me/manage-reports" element={<A_ManageReport />} />
  </Route>
</Routes>

    </>
  )
}

export default App
