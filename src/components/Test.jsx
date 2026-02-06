import React from 'react'
import { Link } from 'react-router-dom'

function Test() {
  return (
    <div>
        <Link to="/student" >To student dashboard route</Link><br></br>
        <Link to="/teacher">To teacher dashboard route</Link>

    </div>
  )
}

export default Test