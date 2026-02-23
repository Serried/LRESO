import { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';

const ITEMS = [
  { to: '/me/manage-subject', title: 'เพิ่ม-ลด รายวิชา', description: 'จัดการการเปิด-ปิดรายวิชาในแต่ละภาคเรียน', img: '/cards/admin/ManageSubject.png' },
  { to: '/me/manage-news', title: 'ข่าวสาร / ประชาสัมพันธ์', description: 'เผยแพร่ประกาศ ข่าวสาร และข้อมูลสำคัญ', img: '/cards/admin/ManageNews.png' },
  { to: '/me/add-student', title: 'จัดการข้อมูลนักเรียน', description: 'เพิ่ม แก้ไข หรือลบข้อมูลนักเรียน', img: '/cards/admin/AddStudent.png' },
  { to: '/me/add-teacher', title: 'จัดการข้อมูลครูผู้สอน', description: 'จัดการข้อมูลครูผู้สอน รายวิชาที่รับผิดชอบ', img: '/cards/admin/AddTeacher.png' },
  { to: '/me/manage-reports', title: 'ตรวจสอบคำร้อง', description: 'พิจารณาและดำเนินการคำร้องต่าง ๆ', img: '/cards/admin/ManageReports.png' },
  { to: '/me/manage-classroom', title: 'จัดการห้องเรียน', description: 'จัดการสร้าง-ลบห้องเรียนในระบบโรงเรียน', img: '/cards/admin/ManageClass.png' },
];

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const name = (u) => [u?.thai_first_name, u?.thai_last_name].filter(Boolean).join(' ') || [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.username;

export default function AdminDash() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/me/admin', { headers: auth() })
      .then((r) => r.json())
      .then((r) => r.success ? setAdmin(r.data) : setError(r.message || 'โหลดไม่สำเร็จ'))
      .catch((e) => { console.error(e); setError('เกิดข้อผิดพลาด'); });
  }, []);

  const avatarUrl = admin?.avatar ? `/uploads/${admin.avatar}` : 'https://placehold.co/80';

  const profile = (
    <>
      <div className="mt-42"><img src={avatarUrl} alt="" className="rounded-full w-3xs" /></div>
      <p className="text-2xl font-bold mt-5">{user.gender === 'M' ? 'นาย' : 'นางสาว'}{name(user)}</p>
      <p className="text-gray-600">ผู้ดูแลระบบ</p>
    </>
  );

  return <DashboardLayout items={ITEMS} profile={profile} loading={!admin} error={error} />;
}
