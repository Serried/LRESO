import React from 'react'
import { useNavigate } from 'react-router-dom';

function NavBar() {
  const navigate = useNavigate();

  const handleLogOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login")
  }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.username || 'ผู้ใช้';
  const avatarUrl = user.avatar
    ? `http://localhost:3000/uploads/${user.avatar}`
    : 'https://placehold.co/45';
  return (
    <>
    <nav>
    <div className='w-full h-15 bg-[#ff842c] flex justify-between items-center'>
    <div id="left" className='items-center flex flex-row'>
        <img className='rounded-full w-[45px] h-[45px] object-cover mx-5' src="https://placehold.co/45" alt="school logo"></img>
        <p className='text-xl text-white font-semibold'>โรงเรียนลังกระบาด</p>
    </div>
    {user.id && (
      <div id="right" className="flex items-center gap-2 pr-4">
        <p className='text-xl text-white font-semibold'>{displayName}</p>
        
        <button onClick={handleLogOut} type="button" id="logout" className='cursor-pointer mx-5 tooltip tooltip-bottom' data-tip='ออกจากระบบ'>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
        </svg>
        </button>
        <img src={avatarUrl} alt="Avatar" className='rounded-full w-[45px] h-[45px] object-cover'></img>
      </div>
    )}
    </div>
    </nav>
    </>
  )
}

export default NavBar