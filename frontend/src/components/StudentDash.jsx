import { useEffect, useState } from 'react';
import DashboardLayout from './DashboardLayout';

const ITEMS = [
  { to: '/me/schedule', title: 'ตารางเรียนส่วนบุคคล', description: 'ตรวจสอบตารางเรียนส่วนบุคคล', img: '/cards/student/ViewSchedule.jpg' },
  { to: '/me/data', title: 'ข้อมูลส่วนบุคคล', description: 'ตรวจสอบข้อมูลส่วนบุคคล', img: '/cards/student/Info.png' },
  { to: '/me/news', title: 'ข่าวสาร / ประชาสัมพันธ์', description: 'ติดตามข่าวสาร / ประชาสัมพันธ์', img: '/cards/student/News.png' },
  { to: '/bug-report', title: 'ติดต่อฝ่ายทะเบียน', description: 'ติดต่อฝ่ายทะเบียน', img: '/cards/student/ReportBug.png' },
  { to: '/me/score', title: 'ข้อมูลผลการเรียน', description: 'ตรวจสอบข้อมูลผลการเรียน', img: '/cards/student/ViewScore.png' },
];

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function StudentDash() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [student, setStudent] = useState(null);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/me/student', { headers: auth() }).then((r) => r.json()),
      fetch('/api/me/student/classes', { headers: auth() }).then((r) => r.json()),
    ]).then(([a, b]) => {
      if (a.success) setStudent(a.data);
      if (b.success) setClasses(b.data || []);
    }).catch(console.error);
  }, []);

  const UPLOADS = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
  const avatarUrl = (student?.avatar || user.avatar) ? `${UPLOADS}/uploads/${student?.avatar || user.avatar}` : 'https://placehold.co/80';
  const c = classes[0];
  const age = student?.dob ? new Date().getFullYear() - new Date(student.dob).getFullYear() : null;

  const profile = (
    <>
      <div className="mt-42"><img src={avatarUrl} alt="" className="rounded-full w-3xs" /></div>
      {student && <p className="text-2xl font-bold mt-5">{student.gender === 'M' ? 'นาย' : 'นางสาว'} {student.thai_first_name} {student.thai_last_name}</p>}
      <p className="text-2xl font-bold">{user.username}</p>
      <div className="flex flex-col gap-2">
        <p>ชั้น: {c?.className || 'ไม่พบข้อมูล'}</p>
        <p>แผนการเรียน: {c?.plan ? c.plan.replace(/^แผน/, '') : 'ไม่พบข้อมูล'}</p>
        {age != null && <p>อายุ: {age} ปี</p>}
      </div>
      <p>สถานภาพนักเรียน: {student?.status === 'STUDYING' ? 'เรียน' : 'พ้นสภาพ'}</p>
    </>
  );

  return <DashboardLayout items={ITEMS} profile={profile} loading={!student} />;
}
