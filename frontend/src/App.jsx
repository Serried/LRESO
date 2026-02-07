import { useState } from 'react'
import Test from './components/Test.jsx'
import { Route, Routes } from 'react-router-dom'
import TeacherDash from './components/TeacherDash.jsx'
import StudentDash from './components/StudentDash.jsx'

function App() {

  return (
    <>
      <Routes>
        <Route path="/" element={<Test />}></Route>
        <Route path="/teacher" element={<TeacherDash />}></Route>
        <Route path="/student" element={<StudentDash />}></Route>
    </Routes>
    </>
  )
}

export default App
