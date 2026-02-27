import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const DASH = { ADMIN: '/me/admin', TEACHER: '/me/teacher', STUDENT: '/me/student' };
const API = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function NavBar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [avatarPath, setAvatarPath] = useState(user.avatar || 'avatars/avatar-placeholder.jpg');

  useEffect(() => {
    if (!user.id || !localStorage.getItem('token')) return;
    const role = user.role;
    const path = role === 'ADMIN' ? '/api/me/admin' : role === 'TEACHER' ? '/api/me/teacher' : role === 'STUDENT' ? '/api/me/student' : null;
    if (!path) return;
    fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((r) => r.json())
      .then((res) => res.success && res.data?.avatar && setAvatarPath(res.data.avatar))
      .catch(() => {});
  }, [user.id, user.role]);

  const path = DASH[user.role] || '/';
  const name = [user.thai_first_name, user.thai_last_name].filter(Boolean).join(' ') || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'ผู้ใช้';
  const avatar = `${API}/uploads/${avatarPath}`;
  const location = useLocation();

  return (
    <nav>
      <div className="w-full h-15 bg-[#ff842c] flex justify-between items-center">
        <div className="items-center flex flex-row gap-4">
          <Link to={path} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img className="rounded-full w-[45px] h-[45px] object-cover mx-5" src="/kmitl.svg" alt="school" />
            <p className="text-xl text-white font-semibold">ระบบบริหารจัดการข้อมูลโรงเรียนคลาสโซลา</p>
          </Link>
          {location.pathname !== path && user.id && <Link to={path} className="text-white/90 hover:text-white text-sm font-medium px-3 py-1.5 rounded hover:bg-white/10">← กลับหน้าแรก</Link>}
        </div>
        {user.id && (
          <div className="flex items-center gap-2 pr-4">
            <p className="text-xl text-white font-semibold">{name}</p>
            <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} type="button" className="cursor-pointer mx-5" title="ออกจากระบบ">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
            </button>
            <img src={avatar} alt="" className="rounded-full w-[45px] h-[45px] object-cover" />
          </div>
        )}
      </div>
    </nav>
  );
}
