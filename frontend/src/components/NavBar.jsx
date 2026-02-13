import React from 'react'

function NavBar() {
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
        <p className='text-xl text-white'>โรงเรียนลังกระบาด</p>
    </div>
    {user.id && (
      <div id="right" className="flex items-center gap-2 pr-4">
        <p className='text-xl text-white'>{displayName}</p>
        <img src={avatarUrl} alt="Avatar" className='rounded-full w-[45px] h-[45px] object-cover'></img>
      </div>
    )}
    </div>
    </nav>
    </>
  )
}

export default NavBar