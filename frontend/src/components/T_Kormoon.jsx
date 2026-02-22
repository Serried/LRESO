import { useState, useEffect } from "react";
import NavBar from "./NavBar";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function T_Kormoon() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [teacher, setTeacher] = useState(null);
  const [responsibleClassrooms, setResponsibleClassrooms] = useState([]);
  const [teachingSubjects, setTeachingSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user.id) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`${API}/api/me/teacher`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/api/me/teacher/classrooms`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/api/me/teacher/subjects`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([teacherRes, classroomsRes, subjectsRes]) => {
        if (teacherRes.success) setTeacher(teacherRes.data);
        if (classroomsRes.success) setResponsibleClassrooms(classroomsRes.data || []);
        if (subjectsRes.success) setTeachingSubjects(subjectsRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (str) => {
    if (!str) return "—";
    try {
      const d = new Date(str);
      return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("th-TH", { dateStyle: "long" });
    } catch {
      return "—";
    }
  };

  const displayName = (t) => {
    const thai = [t?.thai_first_name, t?.thai_last_name].filter(Boolean).join(" ");
    if (thai) return thai;
    return [t?.first_name, t?.last_name].filter(Boolean).join(" ") || "—";
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.type)) {
      setAvatarError("กรุณาเลือกไฟล์รูปภาพ (jpg, png, gif, webp)");
      return;
    }
    setAvatarError(null);
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`${API}/api/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setTeacher((prev) => (prev ? { ...prev, avatar: data.avatar } : null));
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.avatar = data.avatar;
        localStorage.setItem("user", JSON.stringify(u));
      } else {
        setAvatarError(data.message || "เกิดข้อผิดพลาดในการอัปโหลด");
      }
    } catch (err) {
      setAvatarError("ไม่สามารถอัปโหลดได้");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const prefix = teacher?.gender === "M" ? "นาย" : teacher?.gender === "F" ? "นางสาว" : "";
  const statusLabel = teacher?.status === "ACTIVE" ? "ปฏิบัติงาน" : teacher?.status || "—";

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

  if (!teacher) {
    return (
      <>
        <NavBar />
        <div className="min-h-[calc(100vh-80px)] bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500">ไม่พบข้อมูลส่วนบุคคล</p>
        </div>
      </>
    );
  }

  const avatarUrl = teacher.avatar
    ? `${API}/uploads/${teacher.avatar}`
    : "https://placehold.co/120";

  const fields = [
    { label: "ชื่อผู้ใช้", value: teacher.username },
    { label: "รหัสพนักงาน", value: String(teacher.teacherID || "—") },
    { label: "ชื่อ-นามสกุล (ไทย)", value: displayName(teacher) },
    { label: "ชื่อ-นามสกุล (อังกฤษ)", value: [teacher.first_name, teacher.last_name].filter(Boolean).join(" ") || "—" },
    { label: "เพศ", value: teacher.gender === "M" ? "ชาย" : teacher.gender === "F" ? "หญิง" : "—" },
    { label: "วันเกิด", value: formatDate(teacher.dob) },
    { label: "แผนก", value: teacher.department || "—" },
    { label: "เบอร์โทรศัพท์", value: teacher.tel || "—" },
    { label: "อีเมล", value: teacher.email || "—" },
    { label: "สถานภาพ", value: statusLabel },
  ];

  return (
    <>
      <NavBar />
      <div className="min-h-[calc(100vh-80px)] bg-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            ข้อมูลส่วนบุคคล
          </h1>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-[#FF842C]/10 p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <label className="relative group cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                    className="sr-only"
                  />
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#FF842C]/30 group-hover:opacity-80 transition-opacity"
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingAvatar ? (
                      <span className="loading loading-spinner loading-sm text-white" />
                    ) : (
                      <span className="text-xs text-white font-medium">เปลี่ยน</span>
                    )}
                  </span>
                </label>
                {avatarError && (
                  <p className="text-sm text-error text-center max-w-[120px]">{avatarError}</p>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold text-gray-800">
                  {prefix}{displayName(teacher)}
                </h2>
                <p className="text-gray-600 mt-1">ชื่อผู้ใช้: {teacher.username}</p>
                <span
                  className={`badge badge-sm mt-2 ${
                    teacher.status === "ACTIVE" ? "badge-success" : "badge-ghost"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {fields.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex flex-col sm:flex-row sm:items-center px-6 py-4 gap-2"
                >
                  <dt className="text-sm font-medium text-gray-500 shrink-0 sm:w-40">
                    {label}
                  </dt>
                  <dd className="text-gray-800">{value}</dd>
                </div>
              ))}
            </div>

            {/* ห้องที่รับผิดชอบ */}
            <div className="px-6 py-4 border-t border-gray-100">
              <dt className="text-sm font-medium text-gray-500 mb-2">ห้องเรียนที่รับผิดชอบ</dt>
              <dd className="text-gray-800">
                {responsibleClassrooms.length === 0 ? (
                  "—"
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {responsibleClassrooms.map((c) => (
                      <span
                        key={c.classID}
                        className="badge badge-outline badge-sm"
                      >
                        {c.className}
                        {c.plan && ` (${c.plan})`}
                      </span>
                    ))}
                  </div>
                )}
              </dd>
            </div>

            {/* รายวิชาที่สอน */}
            <div className="px-6 py-4 border-t border-gray-100">
              <dt className="text-sm font-medium text-gray-500 mb-2">รายวิชาที่สอน</dt>
              <dd className="text-gray-800">
                {teachingSubjects.length === 0 ? (
                  "—"
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>ห้อง</th>
                          <th>รายวิชา</th>
                          <th>หน่วยกิต</th>
                          <th>ปีการศึกษา</th>
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachingSubjects.map((s, i) => (
                          <tr key={`${s.classID}-${s.subjectID}-${s.year}-${s.term}-${i}`}>
                            <td>{s.className}</td>
                            <td>{s.subjectName}</td>
                            <td>{s.credit ?? "—"}</td>
                            <td>{s.term}/{s.year}</td>
                            <td>
                              <span className={`badge badge-xs ${s.isOpen ? "badge-success" : "badge-ghost"}`}>
                                {s.isOpen ? "เปิด" : "ปิด"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </dd>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default T_Kormoon;
