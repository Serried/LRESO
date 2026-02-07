import React, {useEffect} from 'react'
import { Link } from 'react-router-dom'

function TeacherDash() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const teacherID = user.refID;
  useEffect(() => {
    if (teacherID) {
      fetch(`http://localhost:3000/api/teachers/${teacherID}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
        .then(res => res.json())
        .then(data => console.log(data))
        .catch(err => console.error(err));
    }
  }, []);
  return (
    <>
    <h1>This is teacher dashboard!</h1>
    <Link to="/login">Back to login</Link>
    </>
  )
}

export default TeacherDash