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
  const studentID = user.refID;
  const [clientTime, setClientTime] = useState(() => new Date());
  const [serverTime, setServerTime] = useState(null);
  const [clientTimeAtFetch, setClientTimeAtFetch] = useState(null);
  const [student, setStudent] = useState(null);
  const [studentClasses, setStudentClasses] = useState([]);

  useEffect(() => {
    if (studentID) {
      fetch(`${API_BASE}/api/students/${studentID}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((res) => res.json())
        .then((res) => res.success && setStudent(res.data))
        .catch((err) => console.error(err));

      fetch(`${API_BASE}/api/students/${studentID}/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((res) => res.json())
        .then((res) => res.success && setStudentClasses(res.data || []))
        .catch((err) => console.error(err));
    }
  }, [studentID]);

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
      <div id="container" className="flex h-screen w-full gap-6 bg-gray-100">
        <div id="left" className="w-1/5 bg-white border border-[#ddd] rounded-xl p-5">
          <p>
            เวลาของคุณ: <strong>{formatTime(clientTime)}</strong>
          </p>
          <p>
            เวลาของเซิร์ฟเวอร์: <strong>{formatTime(serverTime)}</strong>
          </p>
        </div>
        <div id="middle" className="w-3/5 min-w-0 grid grid-cols-2 p-6 gap-6 content-start">
          <Link to="/student/schedule" className="block w-full h-full">
          <div id="card" className="w-full h-full overflow-hidden border border-[#ddd] shadow-xl/30 rounded-xl bg-white">
            <img src="https://placehold.co/600x400" alt="" className="w-full h-48 object-cover object-center" />
            <div className="p-4">
              <h5 className="text-lg font-bold">ตารางเรียนส่วนบุคคล</h5>
              <p className="text-md mb-10">ตรวจสอบตารางเรียนส่วนบุคคล</p>
            </div>
          </div>
          </Link>
          <Link to="/student/data" className="block w-full h-full">
          <div id="card" className="w-full h-full overflow-hidden border border-[#ddd] shadow-xl/30 rounded-xl bg-white">
            <img src="https://placehold.co/600x400" alt="" className="w-full h-48 object-cover object-center" />
            <div className="p-4">
              <h5 className="text-lg font-bold">ข้อมูลส่วนบุคคล</h5>
              <p className="text-md mb-10">ตรวจสอบข้อมูลส่วนบุคคล</p>
            </div>
          </div>
          </Link>
          <Link to="/student/news" className="block w-full h-full">
          <div id="card" className="w-full h-full overflow-hidden border border-[#ddd] shadow-xl/30 rounded-xl bg-white">
            <img src="https://placehold.co/600x400" alt="" className="w-full h-48 object-cover object-center" />
            <div className="p-4">
              <h5 className="text-lg font-bold">ข่าวสาร / ประชาสัมพันธ์</h5>
              <p className="text-md mb-10">ติดตามข่าวสาร / ประชาสัมพันธ์</p>
            </div>
          </div>
          </Link>
          <Link to="/student/help" className="block w-full h-full">
          <div id="card" className="ww-full h-full overflow-hidden border border-[#ddd] shadow-xl/30 rounded-xl bg-white">
            <img src="https://placehold.co/600x400" alt="" className="w-full h-48 object-cover object-center" />
            <div className="p-4">
              <h5 className="text-lg font-bold">ติดต่อฝ่ายทะเบียน</h5>
              <p className="text-md mb-10">ติดต่อฝ่ายทะเบียน</p>
            </div>
          </div>
          </Link>
        </div>
        <div id="right" className="w-1/5 bg-white border border-[#ddd] rounded-xl flex flex-col items-center justify-start">
          <div className="mt-42">
          <img src={avatarUrl} alt="" className="rounded-full w-3xs" />
          </div>
          {student && (
            <p className="text-2xl font-bold mt-5">
              {student.gender == "M" ? "นาย" : "นางสาว"}
              {student.first_name} {student.last_name}
            </p>
          )}
          {/* ยังไม่ได้กำหนดว่านักเรียนคนไหนอยู่ห้องไหน */}
          <p className="text-2xl font-bold">{user.username}</p>
          <div className="flex flex-row gap-15">
          <p>ชั้น:</p>
          <p>อายุ: {age} ปี</p>
          </div>
          {/* เดี๋ยวเอามาใส่ */}
          
          <p>แผนการเรียน: </p>
          <p>สถานภาพนักเรียน: {student.status == "STUDYING" ? "เรียน" : "พ้นสภาพ"}</p>
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

export default StudentDash;
