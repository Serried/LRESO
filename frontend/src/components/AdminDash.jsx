import React, { useEffect, useState } from "react";
import NavBar from "./NavBar";
import { Link } from 'react-router-dom';

function AdminDash() {

  const API_BASE = "http://localhost:3000";

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [clientTime, setClientTime] = useState(() => new Date());
  const [serverTime, setServerTime] = useState(null);
  const [clientTimeAtFetch, setClientTimeAtFetch] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const avatarUrl = admin?.avatar
    ? `http://localhost:3000/uploads/${admin.avatar}`
    : "https://placehold.co/80";

  useEffect(() => {
    fetch(`${API_BASE}/api/me/admin`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setAdmin(res.data);
        else setLoadError(res.message || "โหลดไม่สำเร็จ");
      })
      .catch((err) => {
        console.error(err);
        setLoadError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      });
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
  if (!admin) {
    return (
      <>
        <NavBar />
        {loadError ? <p className="p-4 text-red-600">{loadError}</p> : <p className="p-4">กำลังโหลด...</p>}
      </>
    );
  }
  const items = [
    { to: "/me/manage-subject", title: "เพิ่ม-ลด รายวิชา", description: "จัดการการเปิด–ปิดรายวิชาในแต่ละภาคเรียน พร้อมกำหนดรายละเอียดที่เกี่ยวข้องกับการลงทะเบียน" },
    { to: "/me/manage-news", title: "ข่าวสาร / ประชาสัมพันธ์", description: "เผยแพร่ประกาศ ข่าวสาร และข้อมูลสำคัญให้กับนักเรียนและครูผู้สอนภายในระบบ" },
    { to: "/me/add-student", title: "จัดการข้อมูลนักเรียน", description: "เพิ่ม แก้ไข หรือลบข้อมูลนักเรียน รวมถึงตรวจสอบสถานะการลงทะเบียนและประวัติการศึกษา"},
    { to: "/me/add-teacher", title: "จัดการข้อมูลครูผู้สอน", description: "จัดการข้อมูลครูผู้สอน รายวิชาที่รับผิดชอบ" },
    { to: "/me/manage-reports", title: "ตรวจสอบคำร้อง", description: "พิจารณาและดำเนินการคำร้องต่าง ๆ ที่ถูกส่งเข้ามาจากผู้ใช้งานในระบบ" },
  ];
  

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
          <p className="text-2xl font-bold mt-5">{admin.username}</p>
          <p className="text-gray-600">ผู้ดูแลระบบ</p>
        </div>
      </div>
    </>
  );

  
}

export default AdminDash;
