import React, { useEffect, useState } from "react";
import NavBar from "./NavBar";
import { Link } from 'react-router-dom';

const API_BASE = "http://localhost:3000";

function TeacherDash() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const first_name = user.first_name;
  const last_name = user.last_name;
  const ID = user.refID;

  const [clientTime, setClientTime] = useState(() => new Date());
  const [serverTime, setServerTime] = useState(null);
  const [clientTimeAtFetch, setClientTimeAtFetch] = useState(null);
  const [teacher, setTeacher] = useState(null);

  const avatarUrl = (teacher?.avatar || user?.avatar)
    ? `http://localhost:3000/uploads/${teacher?.avatar || user?.avatar}`
    : "https://placehold.co/80";

useEffect(() => {

  fetch(`${API_BASE}/api/me/teacher`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
  })
    .then((res) => res.json())
    .then((res) => res.success && setTeacher(res.data))
    .catch(console.error);
}, []);

  useEffect(() => {
    const tick = setInterval(() => setClientTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const fetchServerTime = () => {
      const clientNow = new Date();
      fetch(`${API_BASE}/api/time`)
        .then((res) => res.json())
        .then(({ serverTime: serverTimeIso }) => {
          if (serverTimeIso) {
            setServerTime(new Date(serverTimeIso));
            setClientTimeAtFetch(clientNow);
          }
        })
        .catch(() => {});
    };
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d) => (d ? d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "medium" }) : "—");

  const runningServerTime = serverTime && clientTimeAtFetch ? new Date(serverTime.getTime() + (clientTime.getTime() - clientTimeAtFetch.getTime())) : serverTime;
  if (!teacher) {
    return (
      <>
        <NavBar />
        <p>Loading...</p>
      </>
    );
  }
  const currentYear = new Date().getFullYear();
  const birthYear = new Date(teacher.dob).getFullYear();
  const age = currentYear - birthYear;

  const items = [
    { to: "/me/schedule", title: "ตารางสอนส่วนบุคคล", description: "ตรวจสอบตารางสอนของรายวิชาที่รับผิดชอบในแต่ละวันและภาคเรียน" },
    { to: "/me/news", title: "ข่าวสาร / ประชาสัมพันธ์", description: "ติดตามประกาศและข้อมูลสำคัญจากทางโรงเรียนหรือฝ่ายวิชาการ" },
    { to: "/me/manage-score", title: "จัดการคะแนนนักเรียน", description: "บันทึก แก้ไข และตรวจสอบผลการเรียนของนักเรียนในรายวิชาที่สอน"},
    { to: "/me/data", title: "ข้อมูลส่วนบุคคล", description: "ตรวจสอบข้อมูลส่วนบุคคล" },  ];

  return (
    <>
      <NavBar />
      <div id="container" className="flex min-h-screen w-full gap-6 bg-gray-100">
        <div id="left" className="w-1/5 bg-white border border-[#ddd] rounded-xl p-5">
          <p>
            เวลาของคุณ: <strong>{formatTime(clientTime)}</strong>
          </p>
          <p>
            เวลาของเซิร์ฟเวอร์: <strong>{formatTime(serverTime)}</strong>
          </p>
        </div>
        <div id="middle" className="w-3/5 min-w-0 grid grid-cols-2 p-6 gap-6 content-start">
  {items.map((item, i) => (
    <Link
      key={i}
      to={item.to}
      className={`
        block w-full h-full
        ${items.length % 2 !== 0 && i === items.length - 1 ? "col-span-2" : ""}
      `}
    >
      <div className="w-full h-full overflow-hidden border border-[#ddd] shadow-xl/30 rounded-xl bg-white">
        <img
          src="https://placehold.co/600x400"
          alt=""
          className="w-full h-48 object-cover object-center"
        />
        <div className="p-4">
          <h5 className="text-lg font-bold">{item.title}</h5>
          <p className="text-md mb-10">{item.description}</p>
        </div>
      </div>
    </Link>
  ))}
</div>
        <div id="right" className="w-1/5 bg-white border border-[#ddd] rounded-xl flex flex-col items-center justify-start">
          <div className="mt-42">
          <img src={avatarUrl} alt="" className="rounded-full w-3xs" />
          </div>
          {teacher && (
            <p className="text-2xl font-bold mt-5">
              {teacher.gender == "M" ? "นาย" : "นางสาว"}
              {teacher.first_name} {teacher.last_name}
            </p>
          )}
          
          <Link to="/bug-report">
          <button type="submit" className="mt-5 btn w-full text-white bg-[#FF842C] border-none">
            แจ้งปัญหา
          </button>
          </Link>
        </div>
      </div>
    </>
  );
}

export default TeacherDash;
