import React, { useState, useEffect } from "react";
import NavBar from "./NavBar";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const GROUP_NAMES = 
["กลุ่มสาระการเรียนรู้ภาษาไทย", 
 "กลุ่มสาระการเรียนรู้คณิตศาสตร์", 
 "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี", 
 "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม", 
 "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา", 
 "กลุ่มสาระการเรียนรู้ศิลปะ", 
 "กลุ่มสาระการเรียนรู้การงานอาชีพ", 
 "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ:"];

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  { period: 4, time: "11:00 - 11:50"},
  { period: 5, time: "12:40 - 13:30", isLunch: true },
  { period: 6, time: "13:30 - 14:20" },
  { period: 7, time: "14:20 - 15:10" },
  { period: 8, time: "15:10 - 16:00" },
];

function ScheduleAssignment({ classrooms, fetchSubjects, toastMsg, toastSuccess, getAuthHeaders }) {
  const currentYear = new Date().getFullYear() + 543;
  const [classID, setClassID] = useState("");
  const [academicYear, setAcademicYear] = useState(`1/${currentYear}`);
  const [subjectsForSchedule, setSubjectsForSchedule] = useState([]);
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragSubject, setDragSubject] = useState(null);

  const parseAY = (s) => {
    if (!s || typeof s !== "string") return null;
    const m = s.trim().match(/^(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const term = parseInt(m[1], 10);
    const year = parseInt(m[2], 10);
    if (term < 1 || term > 3 || year < 2500 || year > 2600) return null;
    return { term, year };
  };

  const fetchData = async () => {
    if (!classID) {
      setSubjectsForSchedule([]);
      setScheduleSlots([]);
      return;
    }
    const ay = parseAY(academicYear);
    if (!ay) return;
    setLoading(true);
    try {
      const [subRes, schedRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE || ""}/api/admin/classrooms/${classID}/subjects-for-schedule?year=${ay.year}&term=${ay.term}`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${import.meta.env.VITE_API_BASE || ""}/api/admin/classrooms/${classID}/schedule?year=${ay.year}&term=${ay.term}`, {
          headers: getAuthHeaders(),
        }),
      ]);
      const subData = await subRes.json();
      const schedData = await schedRes.json();
      if (subData.success) setSubjectsForSchedule(subData.data || []);
      else setSubjectsForSchedule([]);
      if (schedData.success) {
        const slots = (schedData.data || []).map((s) => ({
          dayOfWeek: s.dayOfWeek,
          period: s.period,
          subjectID: s.subjectID,
          teacherID: s.teacherID,
        }));
        setScheduleSlots(slots);
      } else setScheduleSlots([]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [classID, academicYear]);

  const hoursUsedBySubject = {};
  for (const s of scheduleSlots) {
    hoursUsedBySubject[s.subjectID] = (hoursUsedBySubject[s.subjectID] || 0) + 1;
  }

  const getSubjectAt = (dayOfWeek, period) =>
    scheduleSlots.find((s) => s.dayOfWeek === dayOfWeek && s.period === period);

  const addSlot = (dayOfWeek, period, sub) => {
    if (!sub) return;
    const used = hoursUsedBySubject[sub.subjectID] || 0;
    const credit = parseFloat(sub.credit) || 0;
    if (used >= credit) {
      toastMsg(`รายวิชา "${sub.subjectName}" ใช้ชั่วโมงครบแล้ว (${credit} ชม.)`);
      toastSuccess(false);
      setTimeout(() => toastMsg(null), 4000);
      return;
    }
    setScheduleSlots((prev) => {
      const filtered = prev.filter((s) => !(s.dayOfWeek === dayOfWeek && s.period === period));
      return [...filtered, { dayOfWeek, period, subjectID: sub.subjectID, teacherID: sub.teacherID }];
    });
  };

  const removeSlot = (dayOfWeek, period) => {
    setScheduleSlots((prev) => prev.filter((s) => !(s.dayOfWeek === dayOfWeek && s.period === period)));
  };

  const handleSave = async () => {
    if (!classID) {
      toastMsg("กรุณาเลือกชั้นเรียน");
      toastSuccess(false);
      setTimeout(() => toastMsg(null), 4000);
      return;
    }
    const ay = parseAY(academicYear);
    if (!ay) {
      toastMsg("รูปแบบปีการศึกษาไม่ถูกต้อง (เทอม/ปี พ.ศ.)");
      toastSuccess(false);
      setTimeout(() => toastMsg(null), 4000);
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE || ""}/api/admin/classrooms/${classID}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ year: ay.year, term: ay.term, slots: scheduleSlots }),
      });
      const data = await res.json();
      if (data.success) {
        toastMsg(data.message || "บันทึกตารางเรียนสำเร็จ");
        toastSuccess(true);
        setTimeout(() => { toastMsg(null); toastSuccess(false); }, 4000);
      } else {
        toastMsg(data.message || "เกิดข้อผิดพลาด");
        toastSuccess(false);
        setTimeout(() => toastMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
      toastMsg("เกิดข้อผิดพลาด");
      toastSuccess(false);
      setTimeout(() => toastMsg(null), 4000);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">ชั้นเรียน</label>
          <select
            value={classID}
            onChange={(e) => setClassID(e.target.value)}
            className="border p-2 rounded min-w-[160px]"
          >
            <option value="">-- เลือกชั้นเรียน --</option>
            {classrooms.map((c) => (
              <option key={c.classID} value={c.classID}>{c.className}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">ปีการศึกษา</label>
          <input
            type="text"
            placeholder="เช่น 1/2569"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
      </div>
      {loading && <p className="text-gray-500 text-sm mb-4">กำลังโหลด...</p>}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">ลากรายวิชาใส่ตาราง</h3>
          <div className="flex flex-wrap gap-2">
            {subjectsForSchedule.map((s) => (
              <div
                key={s.subjectID}
                draggable
                onDragStart={(e) => {
                  setDragSubject(s);
                  e.dataTransfer.setData("text/plain", String(s.subjectID));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onDragEnd={() => setDragSubject(null)}
                className={`px-3 py-2 rounded border bg-orange-50 border-orange-200 cursor-grab active:cursor-grabbing ${dragSubject?.subjectID === s.subjectID ? "opacity-50" : ""}`}
              >
                <span className="font-medium">{s.subjectName}</span>
                <span className="text-sm text-gray-500 ml-2">
                  ({hoursUsedBySubject[s.subjectID] || 0}/{s.credit} ชม.)
                </span>
              </div>
            ))}
            {subjectsForSchedule.length === 0 && !loading && classID && (
              <p className="text-gray-500 text-sm">ไม่มีรายวิชาที่เปิดสอนในปีนี้</p>
            )}
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <div className="w-full border rounded overflow-hidden">
            <table className="w-full border-collapse text-sm table-fixed">
              <colgroup>
                <col style={{ width: "80px" }} />
                {PERIODS.map(({ period }) => <col key={period} />)}
              </colgroup>
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-100 min-w-[80px]">วัน</th>
                  {PERIODS.map(({ period, time, isLunch }) => (
                    <th
                      key={period}
                      className={`border p-2 bg-gray-100 min-w-[80px] ${isLunch ? "bg-gray-200" : ""}`}
                    >
                      <span className="block font-medium">{period}</span>
                      <span className="block text-xs text-gray-600 mt-0.5">{time}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d) => (
                  <tr key={d.dow}>
                    <td className="border p-2 text-center font-medium bg-gray-50">{d.label}</td>
                    {PERIODS.map(({ period, time, isLunch }) => {
                      const isLunchBreak = !!isLunch;
                      if (isLunchBreak) {
                        return (
                          <td
                            key={`${d.dow}-${period}`}
                            className="border p-2 min-h-[44px] align-middle text-center bg-gray-100 text-gray-600 text-xs"
                          >
                            พักกลางวัน
                          </td>
                        );
                      }
                      const slot = getSubjectAt(d.dow, period);
                      const sub = slot ? subjectsForSchedule.find((x) => x.subjectID === slot.subjectID) : null;
                      return (
                        <td
                          key={`${d.dow}-${period}`}
                          className="border p-2 min-h-[44px] align-top"
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "copy";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (dragSubject) addSlot(d.dow, period, dragSubject);
                          }}
                        >
                          {slot && sub ? (
                            <div
                              className="flex items-center justify-between gap-1 px-2 py-1 rounded bg-orange-100 border border-orange-200 text-xs"
                            >
                              <span className="font-medium truncate" title={sub.subjectName}>{sub.subjectName}</span>
                              <button
                                type="button"
                                onClick={() => removeSlot(d.dow, period)}
                                className="cursor-pointer text-red-600 hover:text-red-800 shrink-0"
                                aria-label="ลบ"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div className="min-h-[36px] border border-dashed border-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                              ว่าง
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">ลากรายวิชาจากด้านบนใส่ช่องตาราง ชั่วโมงรวมต้องไม่เกินหน่วยกิต</p>
          <button onClick={handleSave} className="mt-4 bg-orange-500 text-white px-4 py-2 rounded cursor-pointer text-white border-none">
            บันทึกตารางเรียน
          </button>
        </div>
      </div>
    </div>
  );
}

function A_ManageSubject() {
  const currentYear = new Date().getFullYear() + 543;
  const [classSelectMode, setClassSelectMode] = useState("single");
  const [form, setForm] = useState({
    classID: "",
    classIDs: [],
    subjectName: "",
    groupName: "",
    teacherID: "",
    academicYear: `1/${currentYear}`,
    credit: "",
  });

  const toggleClass = (classID) => {
    const id = parseInt(classID, 10);
    setForm((prev) => ({
      ...prev,
      classIDs: prev.classIDs.includes(id) ? prev.classIDs.filter((x) => x !== id) : [...prev.classIDs, id],
    }));
  };

  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastSuccess, setToastSuccess] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState(null);
  const [detailSubject, setDetailSubject] = useState(null);
  const [classSearchQuery, setClassSearchQuery] = useState("");

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/subjects/all`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) setSubjects(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/classrooms`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setClassrooms(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/get-teachers`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTeachers(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchClassrooms();
    fetchTeachers();
  }, []);

  const parseAcademicYear = (s) => {
    if (!s || typeof s !== "string") return null;
    const m = s.trim().match(/^(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const term = parseInt(m[1], 10);
    const year = parseInt(m[2], 10);
    if (term < 1 || term > 3 || year < 2500 || year > 2600) return null;
    return { term, year };
  };

  const handleAdd = async () => {
    const classIdList = classSelectMode === "multiple" ? form.classIDs : form.classID ? [parseInt(form.classID, 10)] : [];
    if (!classIdList.length || classIdList.some((id) => isNaN(id))) {
      setToastMsg("กรุณาเลือกชั้นเรียน");
      setToastSuccess(false);
      setTimeout(() => setToastMsg(null), 5000);
      return;
    }
    const parsed = parseAcademicYear(form.academicYear);
    if (!parsed) {
      setToastMsg("รูปแบบปีการศึกษาไม่ถูกต้อง (ใช้รูปแบบ เทอม/ปี พ.ศ. เช่น 1/2569)");
      setToastSuccess(false);
      setTimeout(() => setToastMsg(null), 5000);
      return;
    }
    try {
      const payload = {
        ...form,
        classIDs: classIdList,
        term: parsed.term,
        year: parsed.year,
      };
      delete payload.academicYear;
      delete payload.classID;
      const res = await fetch(`${API_BASE}/api/admin/subjects/add-subject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setToastMsg(data.addedCount != null ? `เพิ่มสำเร็จ ${data.addedCount} ห้อง` : "เพิ่มสำเร็จ");
        setToastSuccess(true);
        setTimeout(() => {
          setToastMsg(null);
          setToastSuccess(false);
        }, 5000);
        fetchSubjects();
      } else {
        setToastMsg(data.message || "เกิดข้อผิดพลาด");
        setToastSuccess(false);
        setTimeout(() => setToastMsg(null), 5000);
      }
    } catch (e) {
      console.error(e);
      setToastMsg("เกิดข้อผิดพลาด");
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  const handleClose = async (classID, subjectID) => {
    const res = await fetch(`${API_BASE}/api/admin/subjects/close-subject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ classID, subjectID }),
    });

    const data = await res.json();

    if (data.success) {
      fetchSubjects();
    }
  };

  const handleDelete = async () => {
    if (!deleteSubject) return;
    const { classID, subjectID } = deleteSubject;
    try {
      const res = await fetch(`${API_BASE}/api/admin/subjects/classroom-subject`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ classID, subjectID }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMsg("ลบรายวิชาสำเร็จ");
        setToastSuccess(true);
        setTimeout(() => {
          setToastMsg(null);
          setToastSuccess(false);
        }, 5000);
        fetchSubjects();
      } else {
        setToastMsg(data.message || "เกิดข้อผิดพลาด");
        setToastSuccess(false);
        setTimeout(() => setToastMsg(null), 5000);
      }
    } catch (e) {
      console.error(e);
      setToastMsg("เกิดข้อผิดพลาด");
      setToastSuccess(false);
      setTimeout(() => setToastMsg(null), 5000);
    }
    setDeleteSubject(null);
  };

  const handleReopen = async (classID, subjectID) => {
    const res = await fetch(`${API_BASE}/api/admin/subjects/reopen-subject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ classID, subjectID }),
    });

    const data = await res.json();

    if (data.success) {
      fetchSubjects();
    } else {
      setToastMsg(data.message || "เกิดข้อผิดพลาด");
      setToastSuccess(false);
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  return (
    <>
      <NavBar />
      {toastMsg && (
        <div className="toast toast-top toast-end z-50">
          <div className={`alert ${toastSuccess ? "alert-success" : "alert-error"}`}>
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">จัดการรายวิชา</h1>

        {/* form */}
        <div className="bg-white p-4 rounded shadow mb-6">
          <h2 className="font-semibold mb-3">เพิ่มรายวิชาใหม่</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">ชั้นเรียน</label>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="classMode"
                    value="single"
                    checked={classSelectMode === "single"}
                    onChange={() => {
                      setClassSelectMode("single");
                      setForm((prev) => ({ ...prev, classIDs: [] }));
                    }}
                  />
                  <span>เลือก 1 ห้อง</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="classMode"
                    value="multiple"
                    checked={classSelectMode === "multiple"}
                    onChange={() => {
                      setClassSelectMode("multiple");
                      setForm((prev) => ({ ...prev, classID: "" }));
                      setClassSearchQuery("");
                    }}
                  />
                  <span>เลือกหลายห้อง</span>
                </label>
              </div>
              {classSelectMode === "single" ? (
                <select value={form.classID} onChange={(e) => setForm({ ...form, classID: e.target.value })} className="border p-2 w-full rounded">
                  <option value="">-- เลือกชั้นเรียน --</option>
                  {classrooms.map((c) => (
                    <option key={c.classID} value={c.classID}>
                      {c.className}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <input type="text" placeholder="ค้นหาห้องเรียน..." value={classSearchQuery} onChange={(e) => setClassSearchQuery(e.target.value)} className="border p-2 w-full rounded" />
                  <div className="border rounded p-3 max-h-40 overflow-y-auto bg-gray-50">
                    {(() => {
                      const q = classSearchQuery.trim().toLowerCase();
                      const filtered = q ? classrooms.filter((c) => (c.className || "").toLowerCase().includes(q)) : classrooms;
                      return (
                        <>
                          <div className="flex flex-wrap gap-3">
                            {filtered.map((c) => (
                              <label key={c.classID} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.classIDs.includes(c.classID)} onChange={() => toggleClass(c.classID)} className="rounded border-gray-300" />
                                <span>{c.className}</span>
                              </label>
                            ))}
                          </div>
                          {filtered.length === 0 && <span className="text-gray-500 text-sm">{q ? "ไม่พบห้องเรียนที่ตรงกับคำค้น" : "ไม่พบห้องเรียน"}</span>}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">วิชา</label>
              <input type="text" placeholder="ชื่อวิชา" value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} className="border p-2 w-full rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">กลุ่มสาระ</label>
              <select value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} className="border p-2 w-full rounded">
                <option value="">-- เลือกกลุ่มสาระ --</option>
                {GROUP_NAMES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ครูผู้สอน</label>
              <select value={form.teacherID} onChange={(e) => setForm({ ...form, teacherID: e.target.value })} className="border p-2 w-full rounded">
                <option value="">-- เลือกครู --</option>
                {teachers.map((t) => (
                  <option key={t.teacherID} value={t.teacherID}>
                    {t.thai_first_name || t.thai_last_name ? `${t.thai_first_name || ""} ${t.thai_last_name || ""}`.trim() : `${t.first_name || ""} ${t.last_name || ""}`.trim() || `ครู ID ${t.teacherID}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ปีการศึกษา</label>
              <input type="text" placeholder="เช่น 1/2569" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} className="border p-2 w-full rounded" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">หน่วยกิต</label>
              <input type="number" placeholder="เช่น 1.0" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} className="border p-2 w-full rounded" min="0" step="0.5" />
            </div>
          </div>

          <button onClick={handleAdd} className="mt-4 cursor-pointer bg-orange-500 text-white px-4 py-2 rounded">
            เปิดรายวิชา
          </button>
        </div>

        {/* รายวิชาทั้งหมด */}
        <div className="divider"></div>
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow">
          <h2 className="font-semibold p-4 pb-0">รายวิชาทั้งหมด</h2>
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-4 border-b border-gray-200">รายวิชา</th>
                <th className="text-left p-4 border-b border-gray-200">ครูผู้รับผิดชอบ</th>
                <th className="text-left p-4 border-b border-gray-200">ปีการศึกษา</th>
                <th className="text-left p-4 border-b border-gray-200">หน่วยกิต</th>
                <th className="text-left p-4 border-b border-gray-200">สถานะ</th>
                <th className="text-left p-4 border-b border-gray-200">ชั้นเรียน</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const grouped = subjects.reduce((acc, s) => {
                  const key = `${s.subjectID}-${s.year}-${s.term}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(s);
                  return acc;
                }, {});
                const rows = Object.entries(grouped);
                if (rows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        ไม่พบรายวิชา
                      </td>
                    </tr>
                  );
                }
                return rows.map(([key, items], i) => {
                  const first = items[0];
                  const anyOpen = items.some((x) => x.isOpen);
                  const classCount = items.length;
                  return (
                    <tr key={key} className={`border-b border-gray-100 last:border-b-0 hover:bg-orange-50 transition-colors cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`} onClick={() => setDetailSubject(items)}>
                      <td className="p-4 font-medium">{first.subjectName}</td>
                      <td className="p-4 text-gray-700">{classCount > 1 ? "หลายห้อง" : first.teacherName || "-"}</td>
                      <td className="p-4 text-gray-600">{first.term != null && first.year != null ? `${first.term}/${first.year}` : "-"}</td>
                      <td className="p-4 text-gray-600">{first.credit != null ? first.credit : "-"}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${anyOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{anyOpen ? "เปิด" : "ปิด"}</span>
                      </td>
                      <td className="p-4 text-gray-600">{classCount} ห้อง</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        <div className="divider"></div>
        <h2 className="text-xl font-bold mb-4">กำหนดตารางเรียน</h2>
        <ScheduleAssignment
          classrooms={classrooms}
          fetchSubjects={fetchSubjects}
          toastMsg={setToastMsg}
          toastSuccess={setToastSuccess}
          getAuthHeaders={getAuthHeaders}
        />
      </div>

      {/* modal ข้อมูลรายวิชา */}
      {detailSubject && detailSubject.length > 0 && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-xl mb-4">รายละเอียดรายวิชา</h3>
            {(() => {
              const first = detailSubject[0];
              return (
                <>
                  <div className="space-y-3 mb-6">
                    <div className="flex">
                      <span className="font-medium text-gray-600 w-36">รายวิชา</span>
                      <span>{first.subjectName}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium text-gray-600 w-36">กลุ่มสาระ</span>
                      <span>{first.group_name || "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium text-gray-600 w-36">ปีการศึกษา</span>
                      <span>{first.term != null && first.year != null ? `${first.term}/${first.year}` : "-"}</span>
                    </div>
                    <div className="flex">
                      <span className="font-medium text-gray-600 w-36">หน่วยกิต</span>
                      <span>{first.credit != null ? first.credit : "-"}</span>
                    </div>
                  </div>
                  <h4 className="font-semibold mb-2">ชั้นเรียนที่เปิดสอน</h4>
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>ชั้นเรียน</th>
                          <th>ครูผู้รับผิดชอบ</th>
                          <th>สถานะ</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailSubject.map((s) => (
                          <tr key={`${s.classID}-${s.subjectID}`}>
                            <td>{s.className || "-"}</td>
                            <td>{s.teacherName || "-"}</td>
                            <td>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{s.isOpen ? "เปิด" : "ปิด"}</span>
                            </td>
                            <td>
                              <div className="flex gap-1">
                                {s.isOpen ? (
                                  <button
                                    onClick={() => {
                                      handleClose(s.classID, s.subjectID);
                                      fetchSubjects();
                                      setDetailSubject((prev) => prev.map((x) => (x.classID === s.classID && x.subjectID === s.subjectID ? { ...x, isOpen: 0 } : x)));
                                    }}
                                    className="btn btn-xs bg-red-500 text-white border-none"
                                  >
                                    ปิด
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      handleReopen(s.classID, s.subjectID);
                                      fetchSubjects();
                                      setDetailSubject((prev) => prev.map((x) => (x.classID === s.classID && x.subjectID === s.subjectID ? { ...x, isOpen: 1 } : x)));
                                    }}
                                    className="btn btn-xs bg-green-500 text-white border-none"
                                  >
                                    เปิด
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setDetailSubject(null);
                                    setDeleteSubject({ classID: s.classID, subjectID: s.subjectID, subjectName: s.subjectName });
                                  }}
                                  className="btn btn-xs bg-gray-600 text-white border-none"
                                >
                                  ลบ
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="modal-action mt-6">
                    <button type="button" className="btn btn-ghost" onClick={() => setDetailSubject(null)}>
                      ปิด
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="modal-backdrop" onClick={() => setDetailSubject(null)} aria-hidden />
        </div>
      )}

      {/* modal ยืนยันการลบ */}
      {deleteSubject && (
        <div className="modal modal-open">
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">ยืนยันการลบ</h3>
            <p className="py-4">ต้องการลบรายวิชา "{deleteSubject.subjectName}" หรือไม่?</p>
            <div className="modal-action">
              <button type="button" className="btn bg-red-500 text-white border-none hover:bg-red-600" onClick={handleDelete}>
                ยืนยัน
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteSubject(null)}>
                ยกเลิก
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteSubject(null)} aria-hidden />
        </div>
      )}
    </>
  );
}

export default A_ManageSubject;
