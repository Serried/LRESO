import React, { useEffect, useState } from "react";
import NavBar from "./NavBar";
import { Link } from 'react-router-dom';

const API_BASE = "http://localhost:3000";

function StudentDash() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const first_name = user.first_name;
  const last_name = user.last_name;
  const ID = user.refID;

  const avatarUrl = `http://localhost:3000/uploads/${user.avatar}`;
  const [clientTime, setClientTime] = useState(() => new Date());
  const [serverTime, setServerTime] = useState(null);
  const [clientTimeAtFetch, setClientTimeAtFetch] = useState(null);
  const [student, setStudent] = useState(null);
  const [studentClasses, setStudentClasses] = useState([]);

useEffect(() => {

  fetch(`${API_BASE}/api/me/student`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
  })
    .then((res) => res.json())
    .then((res) => res.success && setStudent(res.data))
    .catch(console.error);

  fetch(`${API_BASE}/api/me/student/classes`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
  })
    .then((res) => res.json())
    .then((res) => res.success && setStudentClasses(res.data || []))
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
  if (!student) {
    return (
      <>
        <NavBar />
        <p>Loading...</p>
      </>
    );
  }
  const currentYear = new Date().getFullYear();
  const birthYear = new Date(student.dob).getFullYear();
  const age = currentYear - birthYear;

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
        <div id="middle" className="w-3/5 min-w-0 grid grid-cols-2 p-6 gap-6 content-start ">
          {(() => {
            const cards = [
              { to: "/me/schedule", title: "ตารางเรียนส่วนบุคคล", description: "ตรวจสอบตารางเรียนส่วนบุคคล", img: "/cards/student/ViewSchedule.jpg" },
              { to: "/me/data", title: "ข้อมูลส่วนบุคคล", description: "ตรวจสอบข้อมูลส่วนบุคคล", img: "/cards/student/Info.png" },
              { to: "/me/news", title: "ข่าวสาร / ประชาสัมพันธ์", description: "ติดตามข่าวสาร / ประชาสัมพันธ์", img: "/cards/student/News.png" },
              { to: "/bug-report", title: "ติดต่อฝ่ายทะเบียน", description: "ติดต่อฝ่ายทะเบียน", img: "/cards/student/ReportBug.png" },
              { to: "/me/score", title: "ข้อมูลผลการเรียน", description: "ตรวจสอบข้อมูลผลการเรียน", img: "/cards/student/ViewScore.png" },
            ];
            return cards.map((card, i) => (
            <Link key={i} to={card.to} className={`block w-full h-full ${cards.length % 2 != 0 && i === cards.length - 1 ? "col-span-2" : ""}`}>
              <div className="w-full h-full overflow-hidden border border-[#ddd] shadow-xl/30 rounded-xl bg-white">
                <img src={card.img} alt="" className="w-full h-48 object-cover object-center" />
                <div className="p-4">
                  <h5 className="text-lg font-bold">{card.title}</h5>
                  <p className="text-md mb-10">{card.description}</p>
                </div>
              </div>
            </Link>
          ));
          })()}
        </div>
        <div id="right" className="w-1/5 bg-white border border-[#ddd] rounded-xl flex flex-col items-center justify-start">
          <div className="mt-42">
          <img src={avatarUrl} alt="" className="rounded-full w-3xs" />
          </div>
          {student && (
            <p className="text-2xl font-bold mt-5">
              {student.gender == "M" ? "นาย" : "นางสาว"}
              {student.thai_first_name} {student.thai_last_name}
            </p>
          )}
          <p className="text-2xl font-bold">{user.username}</p>
          <div className="flex flex-col gap-2">
          <p>ชั้น: {studentClasses[0]?.className || 'ไม่พบข้อมูล'}</p>
          <p>แผนการเรียน: {studentClasses[0]?.plan ? studentClasses[0].plan.replace(/^แผน/, ''): 'ไม่พบข้อมูล'}</p>
          <p>อายุ: {age} ปี</p>
          </div>
          <p>สถานภาพนักเรียน: {student.status == "STUDYING" ? "เรียน" : "พ้นสภาพ"}</p>
          <Link to="/bug-report">
          </Link>
        </div>
      </div>
    </>
  );
}

export default StudentDash;
