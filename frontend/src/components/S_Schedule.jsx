import { useState, useEffect } from "react";
import NavBar from "./NavBar";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000";

const DAYS = [
  { dow: 1, label: "จันทร์" },
  { dow: 2, label: "อังคาร" },
  { dow: 3, label: "พุธ" },
  { dow: 4, label: "พฤหัสบดี" },
  { dow: 5, label: "ศุกร์" },
];

const PERIODS = [
  { period: 1, time: "8:30 - 9:20" },
  { period: 2, time: "9:20 - 10:10" },
  { period: 3, time: "10:10 - 11:00" },
  { period: 4, time: "11:00 - 11:50" },
  { period: 5, time: "12:40 - 13:30", isLunch: true },
  { period: 6, time: "13:30 - 14:20" },
  { period: 7, time: "14:20 - 15:10" },
  { period: 8, time: "15:10 - 16:00" },
];

function S_Schedule() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/api/me/student/schedule`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSchedule(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getSlotAt = (dayOfWeek, period) =>
    (schedule?.slots || []).find(
      (s) => s.dayOfWeek === dayOfWeek && s.period === period
    );

  if (loading) {
    return (
      <>
        <NavBar />
        <div className="min-h-[calc(100vh-80px)] bg-gray-100 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-[#FF842C]" />
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar />
      <div className="min-h-[calc(100vh-80px)] bg-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            ตารางเรียนส่วนบุคคล
          </h1>

          {schedule?.className ? (
            <>
              <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <span>ห้อง: <strong>{schedule.className}</strong></span>
                {schedule.plan && (
                  <span>แผนการเรียน: <strong>{schedule.plan}</strong></span>
                )}
                {schedule.year && (
                  <span>ปีการศึกษา: <strong>{schedule.term}/{schedule.year}</strong></span>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-[#FF842C]/10">
                      <th className="border border-gray-200 relative text-sm font-semibold text-gray-700 w-24 min-h-[60px] p-0">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                          <line x1="0" y1="0" x2="100" y2="100" stroke="#9ca3af" strokeWidth="1.5" />
                        </svg>
                        <span className="absolute top-1 right-1 text-xs">คาบที่</span>
                        <span className="absolute bottom-1 left-1 text-xs">วัน</span>
                      </th>
                      {PERIODS.map((p) => (
                        <th
                          key={p.period}
                          className="border border-gray-200 px-2 py-2 text-center text-sm font-semibold text-gray-700"
                        >
                          <span className="block">คาบที่ {p.period}</span>
                          <span className="block text-xs font-normal text-gray-500">
                            {p.time}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((d) => (
                      <tr key={d.dow}>
                        <td className="border border-gray-200 px-3 py-2 font-medium text-gray-700 bg-gray-50/50">
                          {d.label}
                        </td>
                        {PERIODS.map((p) => {
                          const slot = getSlotAt(d.dow, p.period);
                          return (
                            <td
                              key={p.period}
                              className={`border border-gray-200 px-2 py-2 align-top min-w-[100px] ${p.isLunch ? "bg-gray-50" : ""}`}
                            >
                              {slot ? (
                                <div className="text-sm">
                                  <p className="font-medium text-gray-800">
                                    {slot.subjectName}
                                  </p>
                                  {slot.teacherName && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {slot.teacherName.trim() || ""}
                                    </p>
                                  )}
                                </div>
                              ) : p.isLunch ? (
                                <span className="text-xs text-gray-400 text-center">พักกลางวัน</span>
                              ) : (
                                <span className="text-gray-300"></span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
              <p>ยังไม่มีตารางเรียน</p>
              <p className="text-sm mt-2">
                กรุณาติดต่อฝ่ายทะเบียนเพื่อลงทะเบียนห้องเรียน
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default S_Schedule;
