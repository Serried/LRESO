import React from 'react'

function NavBar() {
  return (
    <>
    <nav>
    <div className='w-full h-15 bg-[#ff842c] justify-between'>
    <div id="left" className='items-center flex flex-row'>
        <img className='rounded-full justify-center items-center self-center mx-5' src="https://placehold.co/45"></img>
        <p className='text-xl text-white'>โรงเรียนลังกระบาด</p>
    </div>
    </div>
    </nav>
    </>
  )
}

export default NavBar