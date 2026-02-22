import React, { useEffect, useState } from "react";
import NavBar from "./NavBar";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function A_ManageClassroom() {
  const [classrooms, setClassrooms] = useState([]);

  const [form, setForm] = useState({
    className: "",
    plan: "",
    responsibleTeacherID: "",
  });

  const [teachers, setTeachers] = useState([]);

  const [editingID, setEditingID] = useState(null);

  const [classStudents, setClassStudents] = useState([]);

  const [studentInput, setStudentInput] = useState("");
  const [toastMsg, setToastMsg] = useState(null);
  const [alertModal, setAlertModal] = useState({ show: false, message: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const plans = ["แผนวิทย์ - คณิต", "แผนศิลป์ - คำนวณ", "แผนศิลป์ - ภาษา", "แผนศิลป์ - สังคม", "แผนศิลป์ - ทั่วไป"];

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/get-teachers`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTeachers(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };
// classroom
  useEffect(() => {
    fetchClassrooms();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (editingID) fetchClassStudents(editingID);
  }, [editingID]);

  const fetchClassrooms = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/classrooms`, { headers: getAuthHeaders() });

      const data = await res.json();

      if (data.success) setClassrooms(data.data);
    } catch (e) {
      console.error(e);
    }
  };

 // class student

  const fetchClassStudents = async (classID) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/classrooms/${classID}/students`, { headers: getAuthHeaders() });

      const data = await res.json();

      if (data.success) setClassStudents(data.data);
    } catch (e) {
      console.error(e);
    }
  };

// create or update class

  const handleSubmit = async () => {
    if (!form.className || !form.plan) {
      setAlertModal({ show: true, message: "กรอกข้อมูลให้ครบ" });
      return;
    }

    try {
      if (editingID) {
        await fetch(`${API_BASE}/api/admin/classrooms/${editingID}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`${API_BASE}/api/admin/classroom/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(form),
        });
      }

      setForm({ className: "", plan: "", responsibleTeacherID: "" });
      setEditingID(null);

      fetchClassrooms();
    } catch (e) {
      console.error(e);
    }
  };

  // edit class (load data to form)

  const handleEdit = (c) => {
    setEditingID(c.classID);
    setForm({
      className: c.className,
      plan: c.plan,
      responsibleTeacherID: c.responsibleTeacherID ?? "",
    });
  };

  // delete

  const handleDelete = (id) => {
    setDeleteConfirm(id);
  };

  const doDelete = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm;
    setDeleteConfirm(null);
    try {
      await fetch(`${API_BASE}/api/admin/classrooms/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (editingID === id) {
        setEditingID(null);
        setClassStudents([]);
      }

      fetchClassrooms();
    } catch (e) {
      console.error(e);
    }
  };

  const cancelDelete = () => setDeleteConfirm(null);

  const parseStudentInput = (input) => {
    if (!input) return [];
    const result = new Set();
    const parts = input.split(",");

    for (let part of parts) {
      part = part.trim();
      if (!part) continue;

      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-").map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          const padLen = Math.max(String(min).length, String(max).length);
          for (let i = min; i <= max; i++) {
            result.add(String(i).padStart(padLen, "0"));
          }
        }
      } else {
        result.add(part);
      }
    }
    return Array.from(result);
  };

  // add student to class

  const addStudent = async () => {
    const usernames = parseStudentInput(studentInput);
    if (usernames.length === 0) {
      setAlertModal({ show: true, message: "กรอกชื่อผู้ใช้นักเรียน (username)" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/classrooms/${editingID}/add-student`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ usernames }),
      });
      const data = await res.json();

      if (data.success) {
        setStudentInput("");
        fetchClassStudents(editingID);
        if (data.notFound && data.notFound.length > 0) {
          setToastMsg(`ไม่พบชื่อผู้ใช้ในระบบ: ${data.notFound.join(", ")}`);
          setTimeout(() => setToastMsg(null), 5000);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // remove student

  const removeStudent = async (studentID) => {
    const sid = Number(studentID);
    const cid = Number(editingID);
    if (!Number.isInteger(sid) || !Number.isInteger(cid)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/classrooms/remove-student`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ studentID: sid, classID: cid }),
      });
      const data = await res.json();
      if (data.success) {
        fetchClassStudents(editingID);
      } else {
        setToastMsg(data.message || "ไม่สามารถลบนักเรียนได้");
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (e) {
      console.error(e);
      setToastMsg("เกิดข้อผิดพลาด");
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  return (
    <>
      <NavBar />
      {toastMsg && (
        <div className="toast toast-top toast-end z-50">
          <div className="alert alert-warning">
            <span>{toastMsg}</span>
          </div>
        </div>
      )}

      <div className="h-screen flex bg-slate-100">
        {/* panel ซ้าย */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-bold text-lg">ห้องเรียน</h2>
          </div>

          {/* form */}
          <div className="p-4 border-b space-y-2">
            <input
              placeholder="ชื่อห้อง เช่น ม.4/5"
              value={form.className}
              onChange={(e) =>
                setForm({
                  ...form,
                  className: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2"
            />

            <select
              value={form.plan}
              onChange={(e) =>
                setForm({
                  ...form,
                  plan: e.target.value,
                })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="">เลือกแผน</option>

              {plans.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <select value={form.responsibleTeacherID} onChange={(e) => setForm({ ...form, responsibleTeacherID: e.target.value })} className="w-full border rounded px-3 py-2">
              <option value="">ครูประจำชั้น</option>
              {teachers.map((t) => (
                <option key={t.teacherID} value={t.teacherID}>
                  {t.thai_first_name || t.thai_last_name ? `${t.thai_first_name || ""} ${t.thai_last_name || ""}`.trim() : `${t.first_name || ""} ${t.last_name || ""}`.trim() || `ครู ID ${t.teacherID}`}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button onClick={handleSubmit} className="flex-1 bg-orange-500 text-white py-2 rounded hover:bg-orange-600">
                {editingID ? "บันทึก" : "เพิ่มห้องเรียน"}
              </button>
              {editingID && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingID(null);
                    setForm({ className: "", plan: "", responsibleTeacherID: "" });
                    setClassStudents([]);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </div>

          {/* class list */}
          <div className="flex-1 overflow-y-auto">
            {classrooms.map((c) => (
              <div
                key={c.classID}
                onClick={() => handleEdit(c)}
                className={`
                p-4 cursor-pointer border-b
                ${editingID === c.classID ? "bg-orange-100 border-l-4 border-orange-500" : "hover:bg-slate-50"}
                `}
              >
                <div className="font-semibold">{c.className}</div>

                <div className="text-sm text-gray-500">{c.plan}</div>
                {c.responsibleTeacherName && <div className="text-xs text-gray-500 mt-0.5">ครูประจำชั้น: {c.responsibleTeacherName}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* panel ขวา */}
        <div className="flex-1 flex flex-col">
          {!editingID ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">เลือกห้องเรียน</div>
          ) : (
            <>
              {/* header */}
              <div className="bg-white border-b p-6">
                <div className="flex justify-between">
                  <div>
                    <div className="text-2xl font-bold">{form.className}</div>

                    <div className="text-gray-500">{form.plan}</div>

                    {form.responsibleTeacherID &&
                      (() => {
                        const t = teachers.find((x) => x.teacherID === parseInt(form.responsibleTeacherID, 10));
                        const name = t ? (t.thai_first_name || t.thai_last_name ? `${t.thai_first_name || ""} ${t.thai_last_name || ""}`.trim() : `${t.first_name || ""} ${t.last_name || ""}`.trim()) : null;
                        return name ? <div className="text-sm text-gray-600 mt-1">ครูประจำชั้น: {name}</div> : null;
                      })()}
                  </div>

                  <button onClick={() => handleDelete(editingID)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                    ลบห้องเรียน
                  </button>
                </div>
              </div>

              {/* add student */}
              <div className="p-6 bg-white border-b">
                <div className="flex gap-2">
                  <input value={studentInput} onChange={(e) => setStudentInput(e.target.value)} placeholder="เช่น 2501 หรือ 2501, 2505 หรือ 2501-2510" className="border px-3 py-2 rounded flex-1" />

                  <button onClick={addStudent} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                    เพิ่ม
                  </button>
                </div>

                <div className="text-sm text-gray-400 mt-2">ใส่ชื่อผู้ใช้ของนักเรียน เช่น 69001 หรือ 69001, 69005 หรือ 69001-69010</div>
              </div>

              {/* student list */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="font-semibold mb-3">นักเรียน ({classStudents.length})</div>

                <div className="bg-white border rounded">
                  {classStudents.map((s) => (
                    <div key={s.studentID} className="flex justify-between p-3 border-b hover:bg-slate-50">
                      <div>
                        {s.studentCode} {s.gender === "M" ? "นาย" : "นางสาว"}
                        {s.thai_first_name} {s.thai_last_name}
                      </div>

                      <button onClick={() => removeStudent(s.studentID)} className="text-red-500 hover:text-red-700">
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* alert */}
      <dialog className={`modal ${alertModal.show ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">แจ้งเตือน</h3>
          <p className="py-4">{alertModal.message}</p>
          <div className="modal-action">
            <button className="btn" onClick={() => setAlertModal({ show: false, message: "" })}>
              ตกลง
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setAlertModal({ show: false, message: "" })}>close</button>
        </form>
      </dialog>

      {/* confirm delete */}
      <dialog className={`modal ${deleteConfirm ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">ยืนยันการลบ</h3>
          <p className="py-4">คุณต้องการลบห้องเรียนนี้หรือไม่?</p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={cancelDelete}>
              ยกเลิก
            </button>
            <button className="btn btn-error" onClick={doDelete}>
              ลบ
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={cancelDelete}>ปิด</button>
        </form>
      </dialog>
    </>
  );
}

export default A_ManageClassroom;
