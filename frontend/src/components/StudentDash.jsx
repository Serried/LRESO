import React, {useEffect} from 'react'
import { Link } from 'react-router-dom'



function StudentDash() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const studentID = user.refID;
    
    useEffect(() => {
      if (studentID) {
        fetch(`http://localhost:3000/api/students/${studentID}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
          .then(res => res.json())
          .then(data => console.log(data))
          .catch(err => console.error(err));
      }
    }, []);
  return (
    <>
    <h1>This is student dashboard!</h1>
    <Link to='/login'>Back to login</Link>
    </>
  )
}

export default StudentDash